const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const SupplyHistory = require('../models/SupplyHistory');
const { protect, authorize } = require('../middleware/auth');

// Helper to standardise units (everything to grams for calculation if needed, but we'll trust the user ensures matching units for now or we convert)
const convertToGrams = (qty, unit) => unit === 'Kg' ? qty * 1000 : qty;
const convertFromGrams = (grams, targetUnit) => targetUnit === 'Kg' ? grams / 1000 : grams;

// GET all inventory items
router.get('/', protect, async (req, res) => {
  try {
    const items = await Inventory.find().sort({ itemName: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET unique categories
router.get('/categories', protect, async (req, res) => {
  try {
    const categories = await Inventory.distinct('category');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST new supply (restock existing or create new)
router.post('/supply', protect, authorize('Store', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { itemName, category, unit, quantity, cost, supplierName, comment } = req.body;
    
    // Find or create the item
    let item = await Inventory.findOne({ itemName: { $regex: new RegExp(`^${itemName}$`, 'i') } });
    
    if (!item) {
      item = new Inventory({
        itemName,
        category,
        unit,
        quantityInStock: 0,
        averageCostPerUnit: 0
      });
    }

    // Convert supplied quantity to item's base unit if different
    let qtyToAdd = quantity;
    if (item.unit !== unit) {
      const suppliedGrams = convertToGrams(quantity, unit);
      qtyToAdd = convertFromGrams(suppliedGrams, item.unit);
    }

    // Calculate new average cost
    const totalExistingValue = item.quantityInStock * item.averageCostPerUnit;
    const newTotalQuantity = item.quantityInStock + qtyToAdd;
    // Cost per base unit of the item
    const costPerBaseUnit = cost / qtyToAdd; 
    
    // Average cost = (old value + new cost) / new total quantity
    item.averageCostPerUnit = newTotalQuantity > 0 ? ((totalExistingValue + cost) / newTotalQuantity) : 0;
    item.quantityInStock = newTotalQuantity;
    
    await item.save();

    // Log supply history
    const history = new SupplyHistory({
      inventoryItem: item._id,
      supplierName,
      quantity,
      unit,
      cost,
      comment
    });
    await history.save();

    res.status(201).json({ item, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET supply history
router.get('/history', protect, authorize('Store', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { startDate, endDate, supplier, item } = req.query;
    let query = {};
    
    if (startDate || endDate) {
      query.suppliedAt = {};
      if (startDate) query.suppliedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.suppliedAt.$lte = end;
      }
    }
    if (supplier) query.supplierName = { $regex: supplier, $options: 'i' };
    if (item) query.inventoryItem = item;

    const history = await SupplyHistory.find(query)
      .populate('inventoryItem', 'itemName')
      .sort({ suppliedAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
