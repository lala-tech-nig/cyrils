const mongoose = require('mongoose');

const dailySnapshotSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  totalRevenue: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  totalInventoryValue: { type: Number, default: 0 },
  activeStaffCount: { type: Number, default: 0 },
  details: { type: Object } // Optional: break down of payment methods, categories, etc.
}, { timestamps: true });

module.exports = mongoose.model('DailySnapshot', dailySnapshotSchema);
