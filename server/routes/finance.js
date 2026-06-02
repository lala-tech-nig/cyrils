const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const AccountTransfer = require('../models/AccountTransfer');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const CustomerTransaction = require('../models/CustomerTransaction');
const VendorTransaction = require('../models/VendorTransaction');
const { protect, authorize } = require('../middleware/auth');

const FINANCE_ROLES = ['Finance', 'Manager', 'SuperAdmin'];
const ACCOUNTS = ['Cash', 'FCMB 1', 'FCMB 2', 'Nomba', 'GT BANK', 'Petty Cash'];

// ─────────────────────────────────────────────────────────────
// HELPER: Compute live balances for all payment accounts
// ─────────────────────────────────────────────────────────────
async function computeAccountBalances() {
  const balances = {};
  ACCOUNTS.forEach(a => { balances[a] = 0; });

  // 1. Sales Inflows — money received into each bank/cash account
  const orders = await Order.find({ status: 'Completed' });
  orders.forEach(o => {
    const pm = o.paymentMethod;
    const amt = o.totalAmount || 0;
    const mx = o.mixedPayments || {};

    if (pm === 'Cash')           { balances['Cash']    = (balances['Cash']    || 0) + amt; }
    else if (pm === 'FCMB 1')   { balances['FCMB 1']  = (balances['FCMB 1']  || 0) + amt; }
    else if (pm === 'FCMB 2')   { balances['FCMB 2']  = (balances['FCMB 2']  || 0) + amt; }
    else if (pm === 'Nomba')    { balances['Nomba']   = (balances['Nomba']   || 0) + amt; }
    else if (pm === 'GT BANK')  { balances['GT BANK'] = (balances['GT BANK'] || 0) + amt; }
    else if (pm === 'Transfer' || pm === 'Card') {
      balances['FCMB 1'] = (balances['FCMB 1'] || 0) + amt;
    } else if (pm === 'Mixed') {
      balances['Cash']    += (mx.cash    || 0);
      balances['FCMB 1']  += (mx.fcmb1   || 0);
      balances['FCMB 2']  += (mx.fcmb2   || 0);
      balances['Nomba']   += (mx.nomba   || 0);
      balances['GT BANK'] += (mx.gtbank  || 0);
    }
    // PR orders don't touch cash until settled
  });

  // 2. Customer Wallet Deposits (cash inflow into Cash)
  const custDeposits = await CustomerTransaction.find({ type: 'Deposit' });
  custDeposits.forEach(ct => {
    balances['Cash'] = (balances['Cash'] || 0) + (ct.amount || 0);
  });

  // 3. Expense Outflows — deducted from the recorded paymentAccount
  const expenses = await Expense.find();
  expenses.forEach(e => {
    const acct = e.paymentAccount || 'Cash';
    balances[acct] = (balances[acct] || 0) - (e.amount || 0);
  });

  // 4. Vendor Payment Outflows
  const vendorTxns = await VendorTransaction.find({ type: 'Payment' });
  vendorTxns.forEach(vt => {
    // Vendor payments assumed from Cash unless captured; use Cash as default
    balances['Cash'] = (balances['Cash'] || 0) - (vt.amount || 0);
  });

  // 5. Internal Transfers — move money between accounts
  const transfers = await AccountTransfer.find();
  transfers.forEach(t => {
    balances[t.fromAccount] = (balances[t.fromAccount] || 0) - (t.amount || 0);
    balances[t.toAccount]   = (balances[t.toAccount]   || 0) + (t.amount || 0);
  });

  return balances;
}

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────

// GET all expenses
router.get('/expenses', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('loggedBy', 'username')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST new expense
router.post('/expenses', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { title, amount, category, paymentAccount, receiptNumber, date, notes } = req.body;
    const expense = new Expense({
      title,
      amount,
      category,
      paymentAccount: paymentAccount || 'Cash',
      receiptNumber,
      date: date || new Date(),
      loggedBy: req.user.id,
      notes
    });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT edit/repost an expense (misposting correction)
router.put('/expenses/:id', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { title, amount, category, paymentAccount, receiptNumber, date, notes } = req.body;
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    expense.title          = title          || expense.title;
    expense.amount         = amount         != null ? amount : expense.amount;
    expense.category       = category       || expense.category;
    expense.paymentAccount = paymentAccount || expense.paymentAccount;
    expense.receiptNumber  = receiptNumber  !== undefined ? receiptNumber : expense.receiptNumber;
    expense.date           = date           || expense.date;
    expense.notes          = notes          !== undefined ? notes : expense.notes;

    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE (reverse) an expense
router.delete('/expenses/:id', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    await expense.deleteOne();
    res.json({ message: 'Expense reversed and deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// ─────────────────────────────────────────────────────────────
// CHART OF ACCOUNTS — Live Balances
// ─────────────────────────────────────────────────────────────

router.get('/accounts', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const balances = await computeAccountBalances();

    // Receivables: total customer wallet balances
    const Customer = require('../models/Customer');
    const customers = await Customer.find({ isActive: true });
    const receivables = customers.reduce((s, c) => s + (c.walletBalance || 0), 0);

    // Payables: sum of outstanding vendor balances
    const Vendor = require('../models/Vendor');
    const vendors = await Vendor.find({ isActive: true });
    const payables = vendors.reduce((s, v) => s + (v.balanceOwed || 0), 0);


    res.json({
      accounts: ACCOUNTS.map(name => ({
        name,
        balance: Math.round((balances[name] || 0) * 100) / 100
      })),
      receivables: Math.round(receivables * 100) / 100,
      payables:    Math.round(payables    * 100) / 100
    });
  } catch (err) {
    console.error('ACCOUNTS ERROR:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ─────────────────────────────────────────────────────────────
// INTER-ACCOUNT TRANSFERS
// ─────────────────────────────────────────────────────────────

// GET all transfers
router.get('/transfers', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const transfers = await AccountTransfer.find()
      .populate('loggedBy', 'username')
      .sort({ date: -1 });
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST new transfer
router.post('/transfers', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { fromAccount, toAccount, amount, comment, date } = req.body;

    if (!fromAccount || !toAccount || !amount) {
      return res.status(400).json({ message: 'fromAccount, toAccount, and amount are required' });
    }
    if (fromAccount === toAccount) {
      return res.status(400).json({ message: 'Cannot transfer to the same account' });
    }
    if (!ACCOUNTS.includes(fromAccount) || !ACCOUNTS.includes(toAccount)) {
      return res.status(400).json({ message: 'Invalid account name' });
    }

    const transfer = new AccountTransfer({
      fromAccount,
      toAccount,
      amount: Number(amount),
      comment,
      loggedBy: req.user.id,
      date: date || new Date()
    });
    await transfer.save();
    res.status(201).json(transfer);
  } catch (err) {
    console.error('TRANSFER ERROR:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ─────────────────────────────────────────────────────────────
// UNIFIED GENERAL LEDGER — All Transactions
// ─────────────────────────────────────────────────────────────

router.get('/transactions', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { startDate, endDate, type, account, category, cashier } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    const allTxns = [];

    // 1. Sales Orders (Inflow)
    const orderQuery = { status: 'Completed' };
    if (Object.keys(dateFilter).length) orderQuery.createdAt = dateFilter;
    const orders = await Order.find(orderQuery)
      .populate('salesPerson', 'username')
      .sort({ createdAt: -1 });

    orders.forEach(o => {
      const pm = o.paymentMethod;
      const push = (acct, amt) => {
        allTxns.push({
          id:       o._id,
          date:     o.createdAt,
          type:     'Sale',
          flowType: 'Inflow',
          description: `Sale #${o.orderNumber || o._id.toString().slice(-6)}`,
          category: 'Sales Revenue',
          account:  acct,
          amount:   amt,
          cashier:  o.salesPerson?.username || 'N/A',
          ref:      o.orderNumber || o._id.toString().slice(-6)
        });
      };

      const mx = o.mixedPayments || {};
      if (pm === 'Cash')           push('Cash',    o.totalAmount);
      else if (pm === 'FCMB 1')   push('FCMB 1',  o.totalAmount);
      else if (pm === 'FCMB 2')   push('FCMB 2',  o.totalAmount);
      else if (pm === 'Nomba')    push('Nomba',   o.totalAmount);
      else if (pm === 'GT BANK')  push('GT BANK', o.totalAmount);
      else if (pm === 'Transfer' || pm === 'Card') push('FCMB 1', o.totalAmount);
      else if (pm === 'Mixed') {
        if (mx.cash)   push('Cash',    mx.cash);
        if (mx.fcmb1)  push('FCMB 1',  mx.fcmb1);
        if (mx.fcmb2)  push('FCMB 2',  mx.fcmb2);
        if (mx.nomba)  push('Nomba',   mx.nomba);
        if (mx.gtbank) push('GT BANK', mx.gtbank);
      } else if (pm !== 'PR') {
        push('Cash', o.totalAmount);
      }
    });

    // 2. Customer Deposits (Inflow into Cash)
    const custQuery = { type: 'Deposit' };
    if (Object.keys(dateFilter).length) custQuery.createdAt = dateFilter;
    const custDeposits = await CustomerTransaction.find(custQuery)
      .populate('customer', 'name')
      .populate('handledBy', 'username')
      .sort({ createdAt: -1 });

    custDeposits.forEach(ct => {
      allTxns.push({
        id:          ct._id,
        date:        ct.createdAt,
        type:        'Deposit',
        flowType:    'Inflow',
        description: `Wallet Deposit — ${ct.customer?.name || 'Customer'}`,
        category:    'Customer Deposit',
        account:     'Cash',
        amount:      ct.amount,
        cashier:     ct.handledBy?.username || 'N/A',
        ref:         ct.reference || ''
      });
    });

    // 3. Expenses (Outflow from paymentAccount)
    const expQuery = {};
    if (Object.keys(dateFilter).length) expQuery.date = dateFilter;
    const expenses = await Expense.find(expQuery)
      .populate('loggedBy', 'username')
      .sort({ date: -1 });

    expenses.forEach(e => {
      allTxns.push({
        id:          e._id,
        date:        e.date,
        type:        'Expense',
        flowType:    'Outflow',
        description: e.title,
        category:    e.category,
        account:     e.paymentAccount || 'Cash',
        amount:      e.amount,
        cashier:     e.loggedBy?.username || 'N/A',
        ref:         e.receiptNumber || ''
      });
    });

    // 4. Vendor Payments (Outflow from Cash)
    const vendorQuery = { type: 'Payment' };
    if (Object.keys(dateFilter).length) vendorQuery.createdAt = dateFilter;
    const vendorPayments = await VendorTransaction.find(vendorQuery)
      .populate('vendor', 'name')
      .populate('handledBy', 'username')
      .sort({ createdAt: -1 });

    vendorPayments.forEach(vt => {
      allTxns.push({
        id:          vt._id,
        date:        vt.createdAt,
        type:        'Vendor Payment',
        flowType:    'Outflow',
        description: `Payment — ${vt.vendor?.name || 'Vendor'}`,
        category:    'Vendor Settlement',
        account:     'Cash',
        amount:      vt.amount,
        cashier:     vt.handledBy?.username || 'N/A',
        ref:         vt.reference || ''
      });
    });

    // 5. Internal Transfers (show as both debit and credit)
    const transferQuery = {};
    if (Object.keys(dateFilter).length) transferQuery.date = dateFilter;
    const internalTransfers = await AccountTransfer.find(transferQuery)
      .populate('loggedBy', 'username')
      .sort({ date: -1 });

    internalTransfers.forEach(t => {
      allTxns.push({
        id:          t._id + '_out',
        date:        t.date,
        type:        'Transfer',
        flowType:    'Outflow',
        description: `Transfer → ${t.toAccount}`,
        category:    'Internal Transfer',
        account:     t.fromAccount,
        amount:      t.amount,
        cashier:     t.loggedBy?.username || 'N/A',
        ref:         t.comment || ''
      });
      allTxns.push({
        id:          t._id + '_in',
        date:        t.date,
        type:        'Transfer',
        flowType:    'Inflow',
        description: `Transfer ← ${t.fromAccount}`,
        category:    'Internal Transfer',
        account:     t.toAccount,
        amount:      t.amount,
        cashier:     t.loggedBy?.username || 'N/A',
        ref:         t.comment || ''
      });
    });

    // Apply filters
    let result = allTxns;
    if (type)     result = result.filter(t => t.type     === type);
    if (account)  result = result.filter(t => t.account  === account);
    if (category) result = result.filter(t => t.category === category);
    if (cashier)  result = result.filter(t =>
      t.cashier.toLowerCase().includes(cashier.toLowerCase())
    );

    // Sort by date descending
    result.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(result);
  } catch (err) {
    console.error('TRANSACTIONS ERROR:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ─────────────────────────────────────────────────────────────
// MARGINS (SuperAdmin Only)
// ─────────────────────────────────────────────────────────────

router.put('/margins/:id', protect, authorize('SuperAdmin'), async (req, res) => {
  try {
    const { marginPercentage } = req.body;
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    item.marginPercentage = marginPercentage;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// ─────────────────────────────────────────────────────────────
// FINANCIAL REPORTING
// ─────────────────────────────────────────────────────────────

router.get('/report', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { timeRange } = req.query;
    let queryDate = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (timeRange === 'today') {
      queryDate = { $gte: today };
    } else if (timeRange === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      queryDate = { $gte: startOfWeek };
    } else if (timeRange === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      queryDate = { $gte: startOfMonth };
    }

    const orderQuery = queryDate.$gte ? { createdAt: queryDate, status: 'Completed' } : { status: 'Completed' };
    const orders = await Order.find(orderQuery);
    const grossRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);

    const expenseQuery = queryDate.$gte ? { date: queryDate } : {};
    const expenses = await Expense.find(expenseQuery);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    const expensesByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const expensesByAccount = expenses.reduce((acc, e) => {
      const acct = e.paymentAccount || 'Cash';
      acc[acct] = (acc[acct] || 0) + e.amount;
      return acc;
    }, {});

    const netProfit = grossRevenue - totalExpenses;

    const totalSales     = orders.filter(o => o.paymentMethod !== 'PR' || o.prApproved).reduce((s, o) => s + (o.totalAmount || 0), 0);
    const cashReceived   = orders.reduce((s, o) => {
      if (o.paymentMethod === 'Cash') return s + (o.totalAmount || 0);
      if (o.paymentMethod === 'Mixed' && o.mixedPayments) return s + (o.mixedPayments.cash || 0);
      return s;
    }, 0);
    const fcmb1Total = orders.reduce((s, o) => {
      if (o.paymentMethod === 'FCMB 1') return s + (o.totalAmount || 0);
      if (o.paymentMethod === 'Mixed' && o.mixedPayments) return s + (o.mixedPayments.fcmb1 || 0);
      return s;
    }, 0);
    const fcmb2Total = orders.reduce((s, o) => {
      if (o.paymentMethod === 'FCMB 2') return s + (o.totalAmount || 0);
      if (o.paymentMethod === 'Mixed' && o.mixedPayments) return s + (o.mixedPayments.fcmb2 || 0);
      return s;
    }, 0);
    const nombaTotal = orders.reduce((s, o) => {
      if (o.paymentMethod === 'Nomba') return s + (o.totalAmount || 0);
      if (o.paymentMethod === 'Mixed' && o.mixedPayments) return s + (o.mixedPayments.nomba || 0);
      return s;
    }, 0);
    const gtbankTotal = orders.reduce((s, o) => {
      if (o.paymentMethod === 'GT BANK') return s + (o.totalAmount || 0);
      if (o.paymentMethod === 'Mixed' && o.mixedPayments) return s + (o.mixedPayments.gtbank || 0);
      return s;
    }, 0);
    const transferReceived = fcmb1Total + fcmb2Total + nombaTotal + gtbankTotal;
    const prTotal = orders.filter(o => o.paymentMethod === 'PR').reduce((s, o) => s + (o.totalAmount || 0), 0);
    const staffCount = await User.countDocuments({ isActive: true });

    res.json({
      grossRevenue, totalExpenses, netProfit,
      expensesByCategory, expensesByAccount,
      ordersCount: orders.length, expensesCount: expenses.length,
      totalSales, cashReceived, transferReceived,
      fcmb1Total, fcmb2Total, nombaTotal, gtbankTotal, prTotal, staffCount
    });
  } catch (err) {
    console.error('FINANCE REPORT ERROR:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET detailed sales report for table & CSV
router.get('/sales-report', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let queryDate = {};
    if (startDate && endDate) {
      queryDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      queryDate = { $gte: today };
    }
    const orders = await Order.find({ createdAt: queryDate, status: 'Completed' })
      .populate('items.product', 'name category')
      .populate('salesPerson', 'username')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET advanced analytics for charting
router.get('/analytics-charts', protect, authorize(...FINANCE_ROLES), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    pastDate.setHours(0, 0, 0, 0);

    const orders   = await Order.find({ createdAt: { $gte: pastDate }, status: 'Completed' });
    const expenses = await Expense.find({ date: { $gte: pastDate } });

    const trendMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendMap[dateStr] = { date: dateStr, revenue: 0, expenses: 0 };
    }

    let paymentMethodStats = {};
    orders.forEach(order => {
      const dateStr = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (trendMap[dateStr]) trendMap[dateStr].revenue += order.totalAmount;
      const pm = order.paymentMethod || 'Unknown';
      paymentMethodStats[pm] = (paymentMethodStats[pm] || 0) + order.totalAmount;
    });
    expenses.forEach(exp => {
      const dateStr = new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (trendMap[dateStr]) trendMap[dateStr].expenses += exp.amount;
    });

    const trendData = Object.values(trendMap).reverse();
    const paymentMethodChart = Object.keys(paymentMethodStats).map(name => ({
      name,
      value: paymentMethodStats[name]
    }));

    res.json({ trendData, paymentMethodChart });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
