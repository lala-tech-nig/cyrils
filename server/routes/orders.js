const express = require('express');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Public: Create online order
router.post('/online', async (req, res) => {
  try {
    const newOrder = new Order({
      ...req.body,
      orderType: 'Online',
      status: 'Pending'
    });
    const savedOrder = await newOrder.save();
    if (req.io) {
      req.io.emit('new_online_order', savedOrder);
    }
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Protected: Create POS/Walk-in order
router.post('/', protect, async (req, res) => {
  try {
    const newOrder = new Order({
      ...req.body,
      salesPerson: req.user.id
    });
    const savedOrder = await newOrder.save();
    if (req.io) {
      req.io.emit('order_received', savedOrder);
    }
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Protected: Get orders with optional filtering
router.get('/', protect, async (req, res) => {
  const { startDate, endDate, type, staff, paymentMethod } = req.query;
  let query = {};

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }
  if (type) query.orderType = type;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (staff) query.salesPersonName = staff;

  try {
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('items.product')
      .populate('salesPerson', 'username');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Manager: Get all PR orders
router.get('/pr', protect, authorize('Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const prOrders = await Order.find({ paymentMethod: 'PR' })
      .sort({ createdAt: -1 })
      .populate('items.product')
      .populate('salesPerson', 'username');
    res.json(prOrders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Manager: Approve or Decline a PR order
router.put('/:id/pr', protect, authorize('Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'decline'
    const updateData = {
      prApproved: action === 'approve',
      status: action === 'approve' ? 'Completed' : 'Declined'
    };
    const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected: Update order status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (req.io) {
      req.io.emit('order_updated', order);
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
