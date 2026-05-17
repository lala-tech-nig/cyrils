const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Can be null for system actions or unauthorized
  username: { type: String, default: 'System' },
  role: { type: String, default: 'System' },
  action: { type: String, required: true }, // POST, PUT, DELETE
  endpoint: { type: String, required: true },
  details: { type: Object }, // req.body or partial data
  status: { type: Number }, // HTTP Status Code
  errorMessage: { type: String },
  ipAddress: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
