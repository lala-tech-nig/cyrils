const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    if (user.shiftLockedUntil && new Date() < new Date(user.shiftLockedUntil)) {
      const unlockTime = new Date(user.shiftLockedUntil).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });
      return res.status(403).json({ message: `Shift ended. Account is locked until ${unlockTime}` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production',
      { expiresIn: '12h' }
    );

    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
