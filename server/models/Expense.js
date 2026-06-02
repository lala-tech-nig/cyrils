const mongoose = require('mongoose');

const PAYMENT_ACCOUNTS = ['Cash', 'FCMB 1', 'FCMB 2', 'Nomba', 'GT BANK', 'Petty Cash'];

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  paymentAccount: {
    type: String,
    enum: PAYMENT_ACCOUNTS,
    default: 'Cash',
    required: true
  },
  receiptNumber: { type: String },
  date: { type: Date, default: Date.now },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
