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

// Protected: Create POS/Walk-in order
router.post('/', protect, async (req, res) => {
  try {
    const newOrder = new Order({
      ...req.body,
      salesPerson: req.user.id // Use ID from token
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

// Protected: Get orders (with optional filtering)
router.get('/', protect, async (req, res) => {
  const { startDate, endDate, type } = req.query;
  let query = {};
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  if (type) {
    query.orderType = type;
  }

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
