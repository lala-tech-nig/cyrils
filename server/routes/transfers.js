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
// GET pending transfers for Sales/POS
router.get('/pending', protect, async (req, res) => {
  try {
    const transfers = await Transfer.find({ status: 'Pending' })
      .populate('product', 'name')
      .populate('handledBy', 'username');
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT accept a transfer
router.put('/:id/accept', protect, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

    transfer.status = 'Accepted';
    transfer.receivedBy = req.user.id;
    await transfer.save();
    res.json(transfer);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
