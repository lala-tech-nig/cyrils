const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  unit: { type: String, required: true }, // e.g., 'Bag', 'Derica', 'Cup'
  quantityInStock: { type: Number, default: 0 },
  costPerUnit: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Inventory', inventorySchema);
