const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  storeName: { type: String, default: "Cyril's Foods" },
  address: { type: String, default: "123 Food Avenue, Lagos" },
  phone: { type: String, default: "+2340000000000" },
  heroTitle: { type: String, default: "Taste the Magic of Home" },
  heroSubtitle: { type: String, default: "Order fresh, delicious meals directly from our kitchen to your table." },
  whatsappNumber: { type: String, default: "2340000000000" },
  targetLat: { type: Number, default: 0 },
  targetLng: { type: Number, default: 0 },
  isMarketOpen: { type: Boolean, default: true },
  interventionOTP: { type: String },
  otpExpiry: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
