const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  priceAtTime: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  orderType: {
    type: String,
    enum: ['Online', 'WalkIn', 'Glovo', 'Chowdeck'],
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Declined', 'Completed'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Transfer', 'Online', 'PR', 'Mixed'],
    default: 'Cash'
  },
  mixedPayments: {
    cash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    transfer: { type: Number, default: 0 }
  },
  // If PR is used, need a comment and manager approval status
  prComment: { type: String },
  prApproved: { type: Boolean, default: false },

  // For Online Orders
  customerName: { type: String },
  customerPhone: { type: String },

  // For Walk-in/POS
  salesPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
