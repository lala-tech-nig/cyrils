const mongoose = require('mongoose');

const kitchenReturnSchema = new mongoose.Schema({
  inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  quantityReturned: { type: Number, required: true },
  unit: { type: String, enum: ['Kg', 'Gram'], required: true },
  returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: String },
  status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' },
  actedUponBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actedUponAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('KitchenReturn', kitchenReturnSchema);
