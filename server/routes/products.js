const express = require('express');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const router = express.Router();

// Public: Get all active products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin/Manager: Create a product
router.post('/', protect, authorize('SuperAdmin', 'Manager'), upload.single('image'), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      imageUrl: req.file ? req.file.path : req.body.imageUrl
    };
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Error creating product:', JSON.stringify(err, null, 2) || err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Admin/Manager: Update a product
router.put('/:id', protect, authorize('SuperAdmin', 'Manager'), upload.single('image'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.imageUrl = req.file.path;
    
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin/Manager: Delete (or deactivate) a product
router.delete('/:id', protect, authorize('SuperAdmin', 'Manager'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
