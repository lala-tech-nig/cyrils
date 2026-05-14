const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');

// Get overall stats (Manager, SuperAdmin)
router.get('/', protect, authorize('Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [todayOrders, monthOrders, allOrders, staffCount, users] = await Promise.all([
      Order.find({ createdAt: { $gte: startOfDay } }).populate('items.product'),
      Order.find({ createdAt: { $gte: startOfMonth } }).populate('items.product'),
      Order.find({}).populate('items.product'),
      User.countDocuments({ isActive: true }),
      User.find({ isActive: true }).select('username role createdAt')
    ]);

    // Sales per staff today
    const salesPerStaff = {};
    todayOrders.forEach(order => {
      const staff = order.salesPersonName || 'Unknown';
      salesPerStaff[staff] = (salesPerStaff[staff] || 0) + (order.totalAmount || 0);
    });

    // Top selling items (all time)
    const itemSales = {};
    allOrders.forEach(order => {
      order.items.forEach(item => {
        const name = item.product?.name || 'Unknown';
        if (!itemSales[name]) itemSales[name] = { qty: 0, revenue: 0 };
        itemSales[name].qty += item.quantity;
        itemSales[name].revenue += item.quantity * (item.priceAtTime || 0);
      });
    });
    const topItems = Object.entries(itemSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty);

    const stats = {
      totalSales: todayOrders.filter(o => o.paymentMethod !== 'PR' || o.prApproved).reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      monthSales: monthOrders.filter(o => o.paymentMethod !== 'PR' || o.prApproved).reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      ordersCount: todayOrders.length,
      monthOrdersCount: monthOrders.length,
      cashReceived: todayOrders.filter(o => o.paymentMethod === 'Cash').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      transferReceived: todayOrders.filter(o => o.paymentMethod === 'Transfer' || o.paymentMethod === 'Card').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      prTotal: todayOrders.filter(o => o.paymentMethod === 'PR').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      staffCount,
      users,
      salesPerStaff,
      todayOrders,
      topItems
    };

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
