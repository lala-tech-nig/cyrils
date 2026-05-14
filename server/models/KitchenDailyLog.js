const mongoose = require('mongoose');

const kitchenDailyLogSchema = new mongoose.Schema({
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  materials: [{
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('KitchenDailyLog', kitchenDailyLogSchema);
