const express = require('express');
const Vendor = require('../models/Vendor');
const VendorTransaction = require('../models/VendorTransaction');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// GET all active vendors
router.get('/', protect, authorize('Finance', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const vendors = await Vendor.find({ isActive: true }).sort({ name: 1 });
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET vendor by ID with transactions
router.get('/:id', protect, authorize('Finance', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    
    const transactions = await VendorTransaction.find({ vendor: req.params.id }).sort({ createdAt: -1 }).populate('handledBy', 'username');
    
    res.json({ vendor, transactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create vendor
router.post('/', protect, authorize('Finance', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { name, company, phone, initialBalance } = req.body;
    
    const vendor = new Vendor({ name, company, phone, balanceOwed: Number(initialBalance) || 0 });
    await vendor.save();

    if (Number(initialBalance) > 0) {
      const tx = new VendorTransaction({
        vendor: vendor._id,
        type: 'Invoice',
        amount: Number(initialBalance),
        notes: 'Initial Balance/Invoice',
        handledBy: req.user.id
      });
      await tx.save();
    }

    res.status(201).json(vendor);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST log transaction (Invoice or Payment)
router.post('/:id/transaction', protect, authorize('Finance', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { type, amount, notes, reference } = req.body;
    const txAmt = Number(amount);
    
    if (txAmt <= 0) return res.status(400).json({ message: 'Amount must be greater than zero' });
    if (!['Invoice', 'Payment'].includes(type)) return res.status(400).json({ message: 'Invalid transaction type' });

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    if (type === 'Invoice') {
      vendor.balanceOwed += txAmt;
    } else if (type === 'Payment') {
      vendor.balanceOwed -= txAmt;
    }
    await vendor.save();

    const tx = new VendorTransaction({
      vendor: vendor._id,
      type,
      amount: txAmt,
      notes,
      reference,
      handledBy: req.user.id
    });
    await tx.save();

    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
