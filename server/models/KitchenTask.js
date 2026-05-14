const mongoose = require('mongoose');

const kitchenTaskSchema = new mongoose.Schema({
  rawMaterial: { type: String, required: true },
  quantity: { type: String },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  expectedPortions: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed'], 
    default: 'Pending' 
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('KitchenTask', kitchenTaskSchema);