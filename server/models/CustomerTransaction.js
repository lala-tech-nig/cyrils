const mongoose = require('mongoose');

const customerTransactionSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  type: {
    type: String,
    enum: ['Deposit', 'Deduction'],
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

module.exports = mongoose.model('CustomerTransaction', customerTransactionSchema);
