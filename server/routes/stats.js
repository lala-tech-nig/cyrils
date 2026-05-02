const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const User = require('../models/User');

// Get overall stats (SuperAdmin, Manager)
router.get('/', protect, authorize('Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [todayOrders, monthOrders, staffCount, users] = await Promise.all([
      Order.find({ createdAt: { $gte: startOfDay } }),
      Order.find({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ isActive: true }),
      User.find({ isActive: true }).select('username role createdAt')
    ]);

    const stats = {
      totalSales: todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      monthSales: monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      ordersCount: todayOrders.length,
      monthOrdersCount: monthOrders.length,
      cashReceived: todayOrders.filter(o => o.paymentMethod === 'Cash').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      transferReceived: todayOrders.filter(o => o.paymentMethod !== 'Cash').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      staffCount,
      users,
      salesPerStaff: {},
      todayOrders: todayOrders
    };

    todayOrders.forEach(order => {
      const staff = order.salesPersonName || 'Unknown';
      stats.salesPerStaff[staff] = (stats.salesPerStaff[staff] || 0) + (order.totalAmount || 0);
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
