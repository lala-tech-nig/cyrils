const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const SupplyHistory = require('../models/SupplyHistory');
const { protect, authorize } = require('../middleware/auth');

// Helper to standardise units (everything to grams for calculation if needed, but we'll trust the user ensures matching units for now or we convert)
const convertToGrams = (qty, unit) => unit === 'Kg' ? qty * 1000 : qty;
const convertFromGrams = (grams, targetUnit) => targetUnit === 'Kg' ? grams / 1000 : grams;
const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
    
    if (!itemName) return res.status(400).json({ message: 'Item name is required' });
    const trimmedName = itemName.trim();
    
    // Find or create the item
    let item = await Inventory.findOne({ itemName: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') } });
    
    if (!item) {
      item = new Inventory({
        itemName: trimmedName,
        category,
        unit,
        quantityInStock: 0,
        averageCostPerUnit: 0
      });
    }

    // Convert supplied quantity to item's base unit if different
    const safeQuantity = quantity || 0;
    const safeCost = cost || 0;
    let qtyToAdd = safeQuantity;
    if (item.unit !== unit) {
      const suppliedGrams = convertToGrams(safeQuantity, unit);
      qtyToAdd = convertFromGrams(suppliedGrams, item.unit);
    }

    // Calculate new average cost
    const currentQty = item.quantityInStock || 0;
    const currentAvgCost = item.averageCostPerUnit || 0;
    const totalExistingValue = currentQty * currentAvgCost;
    const newTotalQuantity = currentQty + qtyToAdd;
    
    // Average cost = (old value + new cost) / new total quantity
    item.averageCostPerUnit = newTotalQuantity > 0 ? ((totalExistingValue + safeCost) / newTotalQuantity) : 0;
    item.quantityInStock = newTotalQuantity;
    
    await item.save();

    // Log supply history
    const history = new SupplyHistory({
      inventoryItem: item._id,
      supplierName,
      quantity: safeQuantity,
      unit,
      cost: safeCost,
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
