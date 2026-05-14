const mongoose = require('mongoose');

const supplyHistorySchema = new mongoose.Schema({
  inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  supplierName: { type: String, required: true },
  quantity: { type: Number, required: true }, // The quantity supplied
  unit: { type: String, enum: ['Kg', 'Gram'], required: true }, // Should match inventory item's unit ideally
  cost: { type: Number, required: true }, // Total cost of this supply
  comment: { type: String },
  suppliedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('SupplyHistory', supplyHistorySchema);
