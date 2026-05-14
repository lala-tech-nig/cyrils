const express = require('express');
const router = express.Router();
const Promotion = require('../models/Promotion');
const { protect, authorize } = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder: 'cyrils_promotions',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'avi']
    };
  }
});

const promoUpload = multer({ storage: storage });

// GET all active promotions (Public - for VFD screen)
router.get('/', async (req, res) => {
  try {
    const promos = await Promotion.find({ isActive: true }).sort({ order: 1 });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET all promotions for management (Manager only)
router.get('/all', protect, authorize('SuperAdmin', 'Manager'), async (req, res) => {
  try {
    const promos = await Promotion.find().sort({ order: 1 });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST create promotion (supports image or video)
router.post('/', protect, authorize('SuperAdmin', 'Manager'), promoUpload.single('media'), async (req, res) => {
  try {
    const { title, description, order } = req.body;
    const isVideo = req.file && req.file.mimetype && req.file.mimetype.startsWith('video/');
    const newPromo = new Promotion({
      title,
      description,
      order: order || 0,
      imageUrl: req.file ? req.file.path : '',
      mediaType: isVideo ? 'video' : 'image'
    });
    await newPromo.save();
    res.status(201).json(newPromo);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT toggle promotion active status
router.put('/:id/toggle', protect, authorize('SuperAdmin', 'Manager'), async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: 'Promotion not found' });
    promo.isActive = !promo.isActive;
    await promo.save();
    res.json(promo);
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
