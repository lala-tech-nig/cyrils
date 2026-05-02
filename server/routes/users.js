const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// GET all users (SuperAdmin only)
router.get('/', protect, authorize('SuperAdmin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST create a new user (SuperAdmin only)
router.post('/', protect, authorize('SuperAdmin'), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ message: 'User already exists' });
    
    user = new User({ username, password, role });
    await user.save();
    
    res.status(201).json({ _id: user._id, username: user.username, role: user.role, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT toggle user status (SuperAdmin only)
router.put('/:id', protect, authorize('SuperAdmin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.role === 'SuperAdmin') {
      return res.status(400).json({ message: 'Cannot disable SuperAdmin' });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({ _id: user._id, username: user.username, role: user.role, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
