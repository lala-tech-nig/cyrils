const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { protect, authorize } = require('../middleware/auth');

// GET settings (Public)
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }

    // Refresh OTP if expired or missing
    const now = new Date();
    if (!settings.interventionOTP || !settings.otpExpiry || settings.otpExpiry < now) {
      const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
      settings.interventionOTP = newOTP;
      settings.otpExpiry = new Date(now.getTime() + 10 * 60000); // 10 minutes
      await settings.save();
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT update settings (Admin/Manager)
router.put('/', protect, authorize('SuperAdmin', 'Manager'), async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
