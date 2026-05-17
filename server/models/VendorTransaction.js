const mongoose = require('mongoose');

const vendorTransactionSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  type: {
    type: String,
    enum: ['Invoice', 'Payment'], // Invoice increases balanceOwed, Payment decreases it
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reference: {
    type: String
  },
  notes: {
    type: String
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('VendorTransaction', vendorTransactionSchema);
