const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const { protect, authorize } = require('../middleware/auth');

// Helper to calculate distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// @route   POST /api/attendance/check-in
// @desc    Check in staff with geofencing
router.post('/check-in', protect, async (req, res) => {
  const { lat, lng } = req.body;
  
  try {
    const settings = await Settings.findOne();
    if (settings && settings.targetLat !== 0 && settings.targetLng !== 0) {
      const distance = getDistance(lat, lng, settings.targetLat, settings.targetLng);
      if (distance > 20) {
        return res.status(403).json({ message: `Access Denied: You are too far from the store (${Math.round(distance)}m away).` });
      }
    }

    // Check if already checked in today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    let attendance = await Attendance.findOne({
      user: req.user.id,
      date: { $gte: startOfDay }
    });

    if (attendance) {
      return res.status(400).json({ message: 'Already checked in for today' });
    }

    // Determine status (Late if after 8:00 AM)
    const now = new Date();
    const threshold = new Date();
    threshold.setHours(8, 0, 0, 0);
    const status = now > threshold ? 'Late' : 'OnTime';

    attendance = new Attendance({
      user: req.user.id,
      date: now,
      checkIn: now,
      status
    });

    await attendance.save();
    res.status(201).json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   POST /api/attendance/check-out
// @desc    Check out staff (Close Shift)
router.post('/check-out', protect, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: req.user.id,
      date: { $gte: startOfDay },
      checkOut: { $exists: false }
    });

    if (!attendance) {
      return res.status(404).json({ message: 'No active attendance found for today' });
    }

    attendance.checkOut = new Date();
    await attendance.save();
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/attendance/report
// @desc    Get attendance logs for Admin/Manager
router.get('/report', protect, authorize('SuperAdmin', 'Manager'), async (req, res) => {
  try {
    const logs = await Attendance.find().populate('user', 'username role').sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
