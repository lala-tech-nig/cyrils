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

    const [todayOrders, monthOrders, topItems, staffCount, users] = await Promise.all([
      Order.find({ createdAt: { $gte: startOfDay } }),
      Order.find({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            qty: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtTime'] } }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ['$productInfo.name', 'Unknown'] },
            qty: 1,
            revenue: 1
          }
        },
        { $sort: { qty: -1 } },
        { $limit: 20 }
      ]),
      User.countDocuments({ isActive: true }),
      User.find({ isActive: true }).select('username role createdAt')
    ]);

    // Sales per staff today
    const salesPerStaff = {};
    todayOrders.forEach(order => {
      const staff = order.salesPersonName || 'Unknown';
      salesPerStaff[staff] = (salesPerStaff[staff] || 0) + (order.totalAmount || 0);
    });


    const stats = {
      totalSales: todayOrders.filter(o => o.paymentMethod !== 'PR' || o.prApproved).reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      monthSales: monthOrders.filter(o => o.paymentMethod !== 'PR' || o.prApproved).reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      ordersCount: todayOrders.length,
      monthOrdersCount: monthOrders.length,
      cashReceived: todayOrders.reduce((sum, o) => {
        if (o.paymentMethod === 'Cash') return sum + (o.totalAmount || 0);
        if (o.paymentMethod === 'Mixed' && o.mixedPayments) return sum + (o.mixedPayments.cash || 0);
        return sum;
      }, 0),
      transferReceived: todayOrders.reduce((sum, o) => {
        if (['Transfer', 'Card', 'FCMB 1', 'FCMB 2', 'Nomba', 'GT BANK'].includes(o.paymentMethod)) {
          return sum + (o.totalAmount || 0);
        }
        if (o.paymentMethod === 'Mixed' && o.mixedPayments) {
          return sum + 
            (o.mixedPayments.transfer || 0) + 
            (o.mixedPayments.card || 0) + 
            (o.mixedPayments.fcmb1 || 0) + 
            (o.mixedPayments.fcmb2 || 0) + 
            (o.mixedPayments.nomba || 0) + 
            (o.mixedPayments.gtbank || 0);
        }
        return sum;
      }, 0),
      fcmb1Total: todayOrders.reduce((sum, o) => {
        if (o.paymentMethod === 'FCMB 1') return sum + (o.totalAmount || 0);
        if (o.paymentMethod === 'Mixed' && o.mixedPayments) return sum + (o.mixedPayments.fcmb1 || 0);
        return sum;
      }, 0),
      fcmb2Total: todayOrders.reduce((sum, o) => {
        if (o.paymentMethod === 'FCMB 2') return sum + (o.totalAmount || 0);
        if (o.paymentMethod === 'Mixed' && o.mixedPayments) return sum + (o.mixedPayments.fcmb2 || 0);
        return sum;
      }, 0),
      nombaTotal: todayOrders.reduce((sum, o) => {
        if (o.paymentMethod === 'Nomba') return sum + (o.totalAmount || 0);
        if (o.paymentMethod === 'Mixed' && o.mixedPayments) return sum + (o.mixedPayments.nomba || 0);
        return sum;
      }, 0),
      gtbankTotal: todayOrders.reduce((sum, o) => {
        if (o.paymentMethod === 'GT BANK') return sum + (o.totalAmount || 0);
        if (o.paymentMethod === 'Mixed' && o.mixedPayments) return sum + (o.mixedPayments.gtbank || 0);
        return sum;
      }, 0),
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
