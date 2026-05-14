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

module.exports = router;
