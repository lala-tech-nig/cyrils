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

// GET inventory analytics
router.get('/analytics', protect, authorize('Store', 'Manager', 'SuperAdmin', 'Finance'), async (req, res) => {
  try {
    const items = await Inventory.find();
    
    let totalValue = 0;
    let totalRetailValue = 0;
    const lowStockItems = [];

    items.forEach(item => {
      const value = item.quantityInStock * (item.averageCostPerUnit || 0);
      const retailValue = item.quantityInStock * (item.retailPricePerUnit || item.averageCostPerUnit || 0);
      
      totalValue += value;
      totalRetailValue += retailValue;

      // Define a generic low stock threshold if not defined (e.g. less than 10 units/kg/etc)
      const threshold = item.lowStockThreshold || 10;
      if (item.quantityInStock <= threshold) {
        lowStockItems.push(item);
      }
    });

    res.json({
      totalItems: items.length,
      totalValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalValue,
      lowStockItems: lowStockItems.sort((a,b) => a.quantityInStock - b.quantityInStock)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET advanced inventory ledger
router.get('/ledger', protect, authorize('Finance', 'Manager', 'SuperAdmin'), async (req, res) => {
  try {
    const { startDate, endDate, itemId } = req.query;
    const KitchenRequest = require('../models/KitchenRequest');
    const KitchenReturn = require('../models/KitchenReturn');
    
    // Parse dates (defaulting to last 30 days if not provided)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date();
    if (!startDate) start.setDate(end.getDate() - 30);
    // Expand to end of day to include all transactions on end date
    end.setHours(23, 59, 59, 999);

    const matchQuery = {};
    if (itemId) matchQuery._id = itemId;

    const items = await Inventory.find(matchQuery);
    
    const activities = [];
    let openingValue = 0;
    let closingValue = 0;
    let totalInflows = 0;
    let totalOutflows = 0;

    for (const item of items) {
      const currentQty = item.quantityInStock || 0;
      const currentCost = item.averageCostPerUnit || 0;

      // Fetch all transactions for this item
      const supplies = await SupplyHistory.find({ inventoryItem: item._id });
      const requests = await KitchenRequest.find({ inventoryItem: item._id, status: 'Accepted' }).populate('actedUponBy', 'username');
      const returns = await KitchenReturn.find({ inventoryItem: item._id, status: 'Accepted' }).populate('actedUponBy', 'username');

      const convertToGrams = (qty, u) => u === 'Kg' ? qty * 1000 : qty;
      const convertFromGrams = (grams, targetU) => targetU === 'Kg' ? grams / 1000 : grams;

      const normalizedTxs = [];

      supplies.forEach(s => {
        const baseQty = convertFromGrams(convertToGrams(s.quantity, s.unit), item.unit);
        normalizedTxs.push({
          id: s._id,
          type: 'Supply',
          date: s.suppliedAt,
          qtyChange: baseQty,
          valueChange: s.cost || (baseQty * currentCost),
          actor: s.supplierName,
          notes: s.comment || 'Restock'
        });
      });

      requests.forEach(r => {
        const baseQty = convertFromGrams(convertToGrams(r.quantityRequested, r.unit), item.unit);
        normalizedTxs.push({
          id: r._id,
          type: 'Kitchen Request',
          date: r.actedUponAt || r.updatedAt,
          qtyChange: -baseQty,
          valueChange: -(baseQty * currentCost),
          actor: r.actedUponBy?.username || 'System',
          notes: r.comment || 'Transfer to Kitchen'
        });
      });

      returns.forEach(r => {
        const baseQty = convertFromGrams(convertToGrams(r.quantityReturned, r.unit), item.unit);
        normalizedTxs.push({
          id: r._id,
          type: 'Kitchen Return',
          date: r.actedUponAt || r.updatedAt,
          qtyChange: baseQty,
          valueChange: baseQty * currentCost,
          actor: r.actedUponBy?.username || 'System',
          notes: r.comment || 'Return from Kitchen'
        });
      });

      let openingQty = currentQty;
      normalizedTxs.forEach(tx => {
        if (new Date(tx.date) >= start) {
          openingQty -= tx.qtyChange;
        }
      });
      openingValue += (openingQty * currentCost);

      let closingQty = currentQty;
      normalizedTxs.forEach(tx => {
        if (new Date(tx.date) > end) {
          closingQty -= tx.qtyChange;
        }
      });
      closingValue += (closingQty * currentCost);

      normalizedTxs.forEach(tx => {
        if (new Date(tx.date) >= start && new Date(tx.date) <= end) {
          activities.push({
            itemName: item.itemName,
            category: item.category,
            ...tx
          });
          if (tx.qtyChange > 0) totalInflows += tx.valueChange;
          if (tx.qtyChange < 0) totalOutflows += Math.abs(tx.valueChange);
        }
      });
    }

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      openingValue,
      closingValue,
      totalInflows,
      totalOutflows,
      activities
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
