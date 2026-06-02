const express = require('express');
const router = express.Router();
const Transfer = require('../models/Transfer');
const { protect, authorize } = require('../middleware/auth');

// GET all transfers
router.get('/', protect, authorize('Manager', 'SuperAdmin', 'Kitchen', 'Eatery'), async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Eatery') {
      query.to = 'Eatery';
    }
    const transfers = await Transfer.find(query)
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
    const { product, quantity, unit, kitchenComment, to } = req.body;
    const newTransfer = new Transfer({
      product,
      quantity,
      unit,
      kitchenComment,
      to: to || 'Sales',
      handledBy: req.user.id
    });
    await newTransfer.save();
    res.status(201).json(newTransfer);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET pending transfers for Sales/POS or Eatery
router.get('/pending', protect, async (req, res) => {
  try {
    const dest = req.user.role === 'Eatery' ? 'Eatery' : 'Sales';
    const transfers = await Transfer.find({ status: 'Pending', managerStatus: 'Approved', to: dest })
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

// PUT Manager approves/rejects transfer
router.put('/:id/manager-approve', protect, authorize('Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { action, managerComment } = req.body; // 'Approve' or 'Reject'
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });

    if (action === 'Approve') {
      transfer.managerStatus = 'Approved';
    } else if (action === 'Reject') {
      transfer.managerStatus = 'Rejected';
      transfer.status = 'Rejected'; // reject entirely
    }
    
    if (managerComment) transfer.managerComment = managerComment;
    
    await transfer.save();
    res.json(transfer);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
