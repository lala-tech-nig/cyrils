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

    // If completed, automatically create a Transfer record to Sales
    if (status === 'Completed') {
      const transfer = new Transfer({
        product: task.product,
        quantity: task.expectedPortions,
        handledBy: req.user.id
      });
      await transfer.save();
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
