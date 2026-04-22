const express = require('express');
const Order = require('../models/Order');
const { authMiddleware, authorizeRole } = require('../middleware/authMiddleware');
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
    
    // Broadcast via socket
    if (req.io) {
      req.io.emit('new_online_order', savedOrder);
    }
    
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating order' });
  }
});

// Protected: Get all orders (for POS/Manager)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('items.product');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected: Update order status
router.put('/:id/status', authMiddleware, async (req, res) => {
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
