const express = require('express');
const router = express.Router();
const DailySnapshot = require('../models/DailySnapshot');
const { protect, authorize } = require('../middleware/auth');

// GET all daily snapshots
router.get('/daily', protect, authorize('SuperAdmin', 'Manager', 'Finance'), async (req, res) => {
  try {
    const { limit = 30 } = req.query; // Default to last 30 days
    const snapshots = await DailySnapshot.find()
      .sort({ date: -1 })
      .limit(Number(limit));

    res.json(snapshots);
  } catch (err) {
    console.error('Error fetching snapshots:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
