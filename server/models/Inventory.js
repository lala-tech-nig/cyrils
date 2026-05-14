const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  unit: { type: String, enum: ['Kg', 'Gram'], required: true },
  quantityInStock: { type: Number, default: 0 },
  averageCostPerUnit: { type: Number, default: 0 },
  totalValue: { type: Number, default: 0 },
  marginPercentage: { type: Number, default: 0 },
  retailPricePerUnit: { type: Number, default: 0 }
}, { timestamps: true });

// Pre-save to calculate total value and retail price
inventorySchema.pre('save', function() {
  this.totalValue = this.quantityInStock * this.averageCostPerUnit;
  if (this.marginPercentage > 0) {
    this.retailPricePerUnit = this.averageCostPerUnit + (this.averageCostPerUnit * (this.marginPercentage / 100));
  } else {
    this.retailPricePerUnit = this.averageCostPerUnit;
  }
});

module.exports = mongoose.model('Inventory', inventorySchema);
