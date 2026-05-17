const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');

// GET all activities (SuperAdmin only)
router.get('/', protect, authorize('SuperAdmin'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(logs);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST a manual activity log (e.g. PAGE_VIEW from frontend)
router.post('/log', protect, async (req, res) => {
  try {
    const { action, endpoint, details } = req.body;
    const logEntry = new ActivityLog({
      user: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: action || 'PAGE_VIEW',
      endpoint: endpoint || 'Frontend Route',
      details: details || {},
      status: 200,
      ipAddress: req.ip
    });
    await logEntry.save();
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error manual activity log:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
