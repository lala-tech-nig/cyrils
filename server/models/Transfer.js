const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  from: {
    type: String,
    default: 'Kitchen'
  },
  to: {
    type: String,
    default: 'Sales'
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Transfer', transferSchema);
