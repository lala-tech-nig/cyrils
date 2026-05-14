const express = require('express');
const router = express.Router();
const KitchenTask = require('../models/KitchenTask');
const Transfer = require('../models/Transfer');
const { protect, authorize } = require('../middleware/auth');

// GET kitchen tasks
router.get('/', protect, async (req, res) => {
  try {
    const query = req.query.all === 'true' ? {} : { status: { $ne: 'Completed' } };
    const tasks = await KitchenTask.find(query)
      .populate('product', 'name')
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST create a kitchen task
router.post('/', protect, authorize('Kitchen', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const task = new KitchenTask({
      ...req.body,
      assignedTo: req.user.id
    });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT update task status
router.put('/:id', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await KitchenTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.status = status;
    await task.save();

    // If completed, just mark it. We removed auto-transfer because kitchen now manually logs finished food with specific units/comments.
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- KITCHEN RETURNS ---
const KitchenReturn = require('../models/KitchenReturn');
const Inventory = require('../models/Inventory');

// POST a return request to store
router.post('/returns', protect, authorize('Kitchen', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { inventoryItem, quantityReturned, unit, comment } = req.body;
    const returnReq = new KitchenReturn({
      inventoryItem,
      quantityReturned,
      unit,
      comment,
      returnedBy: req.user.id
    });
    await returnReq.save();
    res.status(201).json(returnReq);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET returns
router.get('/returns', protect, async (req, res) => {
  try {
    const returns = await KitchenReturn.find()
      .populate('inventoryItem', 'itemName')
      .populate('returnedBy', 'username')
      .populate('actedUponBy', 'username')
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT store accepts/declines a return
router.put('/returns/:id/status', protect, authorize('Store', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'decline'
    const returnReq = await KitchenReturn.findById(req.params.id).populate('inventoryItem');
    
    if (!returnReq) return res.status(404).json({ message: 'Return not found' });
    if (returnReq.status !== 'Pending') return res.status(400).json({ message: 'Return is already processed' });

    if (action === 'accept') {
      const item = returnReq.inventoryItem;
      // Convert logic if units differ. For simplicity, we assume strict match or straightforward conversion.
      const convertToGrams = (qty, u) => u === 'Kg' ? qty * 1000 : qty;
      const convertFromGrams = (grams, targetU) => targetU === 'Kg' ? grams / 1000 : grams;

      const returnedGrams = convertToGrams(returnReq.quantityReturned, returnReq.unit);
      const qtyToAdd = convertFromGrams(returnedGrams, item.unit);

      item.quantityInStock += qtyToAdd;
      await item.save();

      returnReq.status = 'Accepted';
    } else if (action === 'decline') {
      returnReq.status = 'Declined';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    returnReq.actedUponBy = req.user.id;
    returnReq.actedUponAt = new Date();
    await returnReq.save();

    res.json(returnReq);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- DAILY LOGS ---
const KitchenDailyLog = require('../models/KitchenDailyLog');

router.post('/daily-log', protect, authorize('Kitchen', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { materials } = req.body;
    const log = new KitchenDailyLog({
      loggedBy: req.user.id,
      materials
    });
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
