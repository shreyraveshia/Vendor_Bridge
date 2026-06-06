const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  module: { type: String, required: true,
    enum: ['auth','vendor','rfq','quotation','approval','purchase_order','invoice','system'] },
  description: { type: String, required: true },
  entityType: String,
  entityId: mongoose.Schema.Types.ObjectId,
  entityNumber: String,
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  status: { type: String, enum: ['success','failure','warning'], default: 'success' }
}, { timestamps: true });

activityLogSchema.index({ user: 1, module: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
