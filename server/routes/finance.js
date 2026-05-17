const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

// --- EXPENSES ---

// GET all expenses
router.get('/expenses', protect, authorize('Finance', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const expenses = await Expense.find().populate('loggedBy', 'username').sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST a new expense
router.post('/expenses', protect, authorize('Finance', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { title, amount, category, receiptNumber, date, notes } = req.body;
    const expense = new Expense({
      title,
      amount,
      category,
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

// --- MARGINS (Admin Only) ---

// PUT update margin for an inventory item
router.put('/margins/:id', protect, authorize('SuperAdmin'), async (req, res) => {
  try {
    const { marginPercentage } = req.body;
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    item.marginPercentage = marginPercentage;
    // The pre-save hook on Inventory will automatically recalculate retailPricePerUnit
    await item.save();

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- FINANCIAL REPORTING ---

// GET comprehensive financial report
router.get('/report', protect, authorize('Finance', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { timeRange } = req.query; // 'today', 'week', 'month', 'all'
    
    let queryDate = {};
    const today = new Date();
    today.setHours(0,0,0,0);

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

    // 1. Sales Revenue (From completed Orders)
    const orderQuery = queryDate.$gte ? { createdAt: queryDate, status: 'Completed' } : { status: 'Completed' };
    const orders = await Order.find(orderQuery);
    const grossRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Note: COGS logic based on exact POS item sales is complex without a strict recipe mapping.
    // For this layer, we provide Gross Revenue, and then Operating Expenses (from Expense model).
    // In a fully developed ERP, COGS would be calculated by tracking every raw gram used in these orders.
    // We will provide Total Expenses logged to calculate Net Profit.

    // 2. Expenses (Operating Costs + Purchases logged as expenses)
    const expenseQuery = queryDate.$gte ? { date: queryDate } : {};
    const expenses = await Expense.find(expenseQuery);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    // 3. Net Profit
    const netProfit = grossRevenue - totalExpenses;

    res.json({
      grossRevenue,
      totalExpenses,
      netProfit,
      expensesByCategory,
      ordersCount: orders.length,
      expensesCount: expenses.length
    });

  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET detailed sales report for table & CSV
router.get('/sales-report', protect, authorize('Finance', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let queryDate = {};
    if (startDate && endDate) {
      queryDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      const today = new Date();
      today.setHours(0,0,0,0);
      queryDate = { $gte: today };
    }

    const orders = await Order.find({ createdAt: queryDate, status: 'Completed' })
      .populate('items.product', 'name category')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET advanced analytics for charting
router.get('/analytics-charts', protect, authorize('Finance', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    pastDate.setHours(0,0,0,0);

    // Fetch Orders
    const orders = await Order.find({ createdAt: { $gte: pastDate }, status: 'Completed' });
    // Fetch Expenses
    const expenses = await Expense.find({ date: { $gte: pastDate } });

    // Aggregate by Day
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

    res.json({
      trendData,
      paymentMethodChart
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
