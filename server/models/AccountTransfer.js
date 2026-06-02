const mongoose = require('mongoose');

const ACCOUNTS = ['Cash', 'FCMB 1', 'FCMB 2', 'Nomba', 'GT BANK', 'Petty Cash'];

const accountTransferSchema = new mongoose.Schema({
  fromAccount: {
    type: String,
    enum: ACCOUNTS,
    required: true
  },
  toAccount: {
    type: String,
    enum: ACCOUNTS,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [1, 'Transfer amount must be greater than zero']
  },
  comment: { type: String },
  loggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AccountTransfer', accountTransferSchema);
