const mongoose = require('mongoose');

const kitchenRequestSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  quantityRequested: { type: Number, required: true },
  unit: { type: String, enum: ['Kg', 'Gram'], required: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' },
  expectedPortions: { type: Number },
  comment: { type: String },
  actedUponBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actedUponAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('KitchenRequest', kitchenRequestSchema);
