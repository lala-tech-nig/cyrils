const express = require('express');
const router = express.Router();
const Transfer = require('../models/Transfer');
const { protect, authorize } = require('../middleware/auth');

// GET all transfers
router.get('/', protect, authorize('Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const transfers = await Transfer.find()
      .populate('product', 'name')
      .populate('handledBy', 'username')
      .sort({ createdAt: -1 });
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST a transfer (usually by Kitchen staff)
router.post('/', protect, async (req, res) => {
  try {
    const { product, quantity } = req.body;
    const newTransfer = new Transfer({
      product,
      quantity,
      handledBy: req.user.id
    });
    await newTransfer.save();
    res.status(201).json(newTransfer);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
