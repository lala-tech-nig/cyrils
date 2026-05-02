const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');
const { protect, authorize } = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cyrils_promotions',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});

const upload = multer({ storage: storage });

// GET all promotions (Public)
router.get('/', async (req, res) => {
  try {
    const promos = await Promotion.find({ isActive: true }).sort({ order: 1 });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET all promotions for management
router.get('/all', protect, authorize('SuperAdmin', 'Manager'), async (req, res) => {
  try {
    const promos = await Promotion.find().sort({ order: 1 });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST create promotion
router.post('/', protect, authorize('SuperAdmin', 'Manager'), upload.single('image'), async (req, res) => {
  try {
    const { title, description, order } = req.body;
    const newPromo = new Promotion({
      title,
      description,
      order: order || 0,
      imageUrl: req.file ? req.file.path : ''
    });
    await newPromo.save();
    res.status(201).json(newPromo);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE promotion
router.delete('/:id', protect, authorize('SuperAdmin', 'Manager'), async (req, res) => {
  try {
    await Promotion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promotion deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
