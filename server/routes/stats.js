const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');

// Get overall stats (SuperAdmin, Manager)
router.get('/', protect, authorize('SuperAdmin', 'Manager'), async (req, res) => {
  try {
    // Note: If you don't have orders yet, we return 0
    const orders = await Order.find() || [];
    
    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const ordersCount = orders.length;
    const onlineOrders = orders.filter(o => o.orderType === 'Online').length;
    const walkInOrders = orders.filter(o => o.orderType === 'WalkIn').length;
    
    const cashReceived = orders.filter(o => o.paymentMethod === 'Cash').reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const transferReceived = orders.filter(o => ['Transfer', 'Card'].includes(o.paymentMethod)).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    res.json({
      totalSales,
      ordersCount,
      onlineOrders,
      walkInOrders,
      cashReceived,
      transferReceived
    });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
