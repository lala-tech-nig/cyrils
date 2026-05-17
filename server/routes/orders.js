const express = require('express');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const CustomerTransaction = require('../models/CustomerTransaction');
const { protect, authorize } = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

const generateDiscountOTP = (offset = 0) => {
  const interval = Math.floor(Date.now() / (5 * 60 * 1000)) + offset;
  const secret = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production';
  const hash = crypto.createHash('md5').update(`${interval}-${secret}`).digest('hex');
  const otp = Math.abs(parseInt(hash.substring(0, 8), 16)) % 10000;
  return otp.toString().padStart(4, '0');
};

// GET Discount OTP (Manager/Finance only)
router.get('/discount-otp', protect, authorize('SuperAdmin', 'Manager', 'Finance'), (req, res) => {
  res.json({ otp: generateDiscountOTP() });
});

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

// Public: Create self-order from POS public tablet
router.post('/self-order', async (req, res) => {
  try {
    const newOrder = new Order({
      ...req.body,
      orderType: 'WalkIn',
      status: 'Pending'
    });
    const savedOrder = await newOrder.save();
    if (req.io) {
      req.io.emit('new_self_order', savedOrder);
    }
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating self order' });
  }
});

// Protected: Create POS/Walk-in order
router.post('/', protect, async (req, res) => {
  try {
    const { discountAmount, discountOtp, paymentMethod, customerId, totalAmount } = req.body;
    if (discountAmount > 0) {
      if (!discountOtp || (discountOtp !== generateDiscountOTP() && discountOtp !== generateDiscountOTP(-1))) {
        return res.status(400).json({ message: 'Invalid or expired discount OTP.' });
      }
    }

    if (paymentMethod === 'Customer Account') {
      if (!customerId) return res.status(400).json({ message: 'Customer ID required for this payment method.' });
      const customer = await Customer.findById(customerId);
      if (!customer) return res.status(404).json({ message: 'Customer not found.' });
      if (customer.walletBalance < totalAmount) {
        return res.status(400).json({ message: 'Insufficient customer wallet balance.' });
      }
      customer.walletBalance -= totalAmount;
      await customer.save();

      const tx = new CustomerTransaction({
        customer: customer._id,
        type: 'Deduction',
        amount: totalAmount,
        notes: 'POS Order Settlement',
        handledBy: req.user.id
      });
      await tx.save();
    }

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

// Protected: Complete an existing pending self-order
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const { discountAmount, discountOtp, paymentMethod, customerId, totalAmount } = req.body;
    if (discountAmount > 0) {
      if (!discountOtp || (discountOtp !== generateDiscountOTP() && discountOtp !== generateDiscountOTP(-1))) {
        return res.status(400).json({ message: 'Invalid or expired discount OTP.' });
      }
    }

    if (paymentMethod === 'Customer Account') {
      if (!customerId) return res.status(400).json({ message: 'Customer ID required for this payment method.' });
      const customer = await Customer.findById(customerId);
      if (!customer) return res.status(404).json({ message: 'Customer not found.' });
      if (customer.walletBalance < totalAmount) {
        return res.status(400).json({ message: 'Insufficient customer wallet balance.' });
      }
      customer.walletBalance -= totalAmount;
      await customer.save();

      const tx = new CustomerTransaction({
        customer: customer._id,
        type: 'Deduction',
        amount: totalAmount,
        notes: 'POS Order Settlement',
        handledBy: req.user.id
      });
      await tx.save();
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        status: 'Completed',
        salesPerson: req.user.id
      },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    if (req.io) {
      req.io.emit('order_completed', order);
    }
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error completing order' });
  }
});

// Protected: Delete Order (Finance/SuperAdmin)
router.delete('/:id', protect, authorize('Finance', 'SuperAdmin', 'Manager'), async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Note: Reverting wallet/inventory logic can be added here if needed
    
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
