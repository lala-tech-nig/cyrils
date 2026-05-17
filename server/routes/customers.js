const express = require('express');
const Customer = require('../models/Customer');
const CustomerTransaction = require('../models/CustomerTransaction');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET all active customers
router.get('/', protect, async (req, res) => {
  try {
    const customers = await Customer.find({ isActive: true }).sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET customer by ID with transactions
router.get('/:id', protect, authorize('SuperAdmin', 'Manager', 'Finance'), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    const transactions = await CustomerTransaction.find({ customer: req.params.id }).sort({ createdAt: -1 }).populate('handledBy', 'username');
    
    res.json({ customer, transactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create customer (Finance/Manager/SuperAdmin)
router.post('/', protect, authorize('SuperAdmin', 'Manager', 'Finance'), async (req, res) => {
  try {
    const { name, phone, initialDeposit } = req.body;
    
    const existing = await Customer.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: 'Customer with this phone number already exists' });
    }

    const customer = new Customer({ name, phone, walletBalance: Number(initialDeposit) || 0 });
    await customer.save();

    if (Number(initialDeposit) > 0) {
      const tx = new CustomerTransaction({
        customer: customer._id,
        type: 'Deposit',
        amount: Number(initialDeposit),
        notes: 'Initial Deposit',
        handledBy: req.user.id
      });
      await tx.save();
    }

    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST deposit into customer wallet (Finance/Manager/SuperAdmin)
router.post('/:id/deposit', protect, authorize('SuperAdmin', 'Manager', 'Finance'), async (req, res) => {
  try {
    const { amount, notes, reference } = req.body;
    const depositAmt = Number(amount);
    
    if (depositAmt <= 0) return res.status(400).json({ message: 'Deposit amount must be greater than zero' });

    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.walletBalance += depositAmt;
    await customer.save();

    const tx = new CustomerTransaction({
      customer: customer._id,
      type: 'Deposit',
      amount: depositAmt,
      notes: notes || 'Account Deposit',
      reference,
      handledBy: req.user.id
    });
    await tx.save();

    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
