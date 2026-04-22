const express = require('express');
const Product = require('../models/Product');
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

// Assuming protected routes will be added later for Admin to create/edit products

module.exports = router;
