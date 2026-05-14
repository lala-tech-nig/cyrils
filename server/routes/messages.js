const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// GET recent messages for a department
router.get('/:department', protect, async (req, res) => {
  try {
    const { department } = req.params;
    
    const messages = await Message.find({
      $or: [
        { targetDepartment: department },
        { targetDepartment: 'All' },
        { senderRole: department }
      ]
    })
      .populate('sender', 'username')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (err) {
    console.error('GET messages error:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// POST a new message
router.post('/', protect, async (req, res) => {
  try {
    const { targetDepartment, content, senderRole } = req.body;
    
    const message = new Message({
      sender: req.user.id,
      senderRole,
      targetDepartment,
      content
    });

    await message.save();
    
    const populatedMessage = await Message.findById(message._id).populate('sender', 'username');

    if (req.io) {
      // Emit to target department and to sender's department so they see their own sent messages live
      req.io.to(targetDepartment).emit('new_message', populatedMessage);
      if (senderRole !== targetDepartment) {
        req.io.to(senderRole).emit('new_message', populatedMessage);
      }
    }

    res.status(201).json(populatedMessage);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT mark messages as read for a department
router.put('/read', protect, async (req, res) => {
  try {
    const { department } = req.body;
    
    await Message.updateMany(
      { targetDepartment: department, isRead: false },
      { 
        $set: { isRead: true },
        $addToSet: { readBy: req.user.id }
      }
    );

    if (req.io) {
      req.io.to(department).emit('messages_read', { department });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
