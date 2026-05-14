const express = require('express');
const router = express.Router();
const KitchenRequest = require('../models/KitchenRequest');
const Inventory = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');

// Helper for unit conversion
const convertToGrams = (qty, unit) => unit === 'Kg' ? qty * 1000 : qty;
const convertFromGrams = (grams, targetUnit) => targetUnit === 'Kg' ? grams / 1000 : grams;

// GET all requests (Store view)
router.get('/', protect, authorize('Store', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const requests = await KitchenRequest.find()
      .populate('inventoryItem', 'itemName unit category')
      .populate('requestedBy', 'username')
      .populate('actedUponBy', 'username')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET my requests (Kitchen view)
router.get('/my-requests', protect, authorize('Kitchen'), async (req, res) => {
  try {
    const requests = await KitchenRequest.find({ requestedBy: req.user.id })
      .populate('inventoryItem', 'itemName unit')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST a new request (Kitchen)
router.post('/', protect, authorize('Kitchen'), async (req, res) => {
  try {
    const { inventoryItem, quantityRequested, unit, expectedPortions, comment } = req.body;
    const newRequest = new KitchenRequest({
      requestedBy: req.user.id,
      inventoryItem,
      quantityRequested,
      unit,
      expectedPortions,
      comment
    });
    await newRequest.save();
    
    // Broadcast via socket if configured
    if (req.io) {
      req.io.emit('new_kitchen_request', newRequest);
    }

    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT accept or decline a request (Store)
router.put('/:id/status', protect, authorize('Store', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'decline'
    const request = await KitchenRequest.findById(req.params.id).populate('inventoryItem');
    
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'Pending') return res.status(400).json({ message: 'Request is already processed' });

    if (action === 'accept') {
      const item = request.inventoryItem;
      
      // Convert requested quantity to item's base unit
      const requestedGrams = convertToGrams(request.quantityRequested, request.unit);
      const qtyToDeduct = convertFromGrams(requestedGrams, item.unit);

      if (item.quantityInStock < qtyToDeduct) {
        return res.status(400).json({ message: 'Insufficient stock in inventory' });
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
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
