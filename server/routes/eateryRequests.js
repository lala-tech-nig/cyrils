const express = require('express');
const router = express.Router();
const EateryRequest = require('../models/EateryRequest');
const Inventory = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

// Helper for unit conversion (similar to kitchen requests)
const convertToGrams = (qty, unit) => unit === 'Kg' ? qty * 1000 : qty;
const convertFromGrams = (grams, targetUnit) => targetUnit === 'Kg' ? grams / 1000 : grams;

// GET all requests (Store / Manager view)
router.get('/', protect, authorize('Store', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const requests = await EateryRequest.find()
      .populate('inventoryItem', 'itemName unit category')
      .populate('requestedBy', 'username')
      .populate('actedUponBy', 'username')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET my requests (Eatery view)
router.get('/my-requests', protect, authorize('Eatery'), async (req, res) => {
  try {
    const requests = await EateryRequest.find({ requestedBy: req.user.id })
      .populate('inventoryItem', 'itemName unit')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST a new request (Eatery)
router.post('/', protect, authorize('Eatery'), async (req, res) => {
  try {
    const { inventoryItem, quantityRequested, unit, comment } = req.body;
    
    if (!inventoryItem || !quantityRequested || !unit) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const newRequest = new EateryRequest({
      requestedBy: req.user.id,
      inventoryItem,
      quantityRequested,
      unit,
      comment
    });
    
    await newRequest.save();
    
    // Broadcast via socket if active
    if (req.io) {
      req.io.emit('new_eatery_request', newRequest);
    }

    res.status(201).json(newRequest);
  } catch (err) {
    console.error('Error creating eatery request:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT accept or decline a request (Store / Manager)
router.put('/:id/status', protect, authorize('Store', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'decline'
    const request = await EateryRequest.findById(req.params.id).populate('inventoryItem');
    
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ message: 'Request is already processed' });

    if (action === 'accept') {
      const item = request.inventoryItem;
      
      // Calculate deduction amount based on units
      let qtyToDeduct = request.quantityRequested;
      if (item.unit !== request.unit && (request.unit === 'Kg' || request.unit === 'Gram') && (item.unit === 'Kg' || item.unit === 'Gram')) {
        const requestedGrams = convertToGrams(request.quantityRequested, request.unit);
        qtyToDeduct = convertFromGrams(requestedGrams, item.unit);
      }

      if (item.quantityInStock < qtyToDeduct) {
        return res.status(400).json({ message: `Insufficient stock in inventory. Only ${item.quantityInStock} ${item.unit} available.` });
      }

      // Deduct stock
      item.quantityInStock -= qtyToDeduct;
      await item.save();

      request.status = 'Accepted';
    } else if (action === 'decline') {
      request.status = 'Declined';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    request.actedUponBy = req.user.id;
    request.actedUponAt = new Date();
    await request.save();

    res.json(request);
  } catch (err) {
    console.error('Error processing eatery request status:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
