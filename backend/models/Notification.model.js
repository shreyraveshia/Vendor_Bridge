const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String,
    enum: ['rfq','quotation','approval','purchase_order','invoice','system','alert'],
    default: 'system' },
  priority: { type: String, enum: ['low','normal','high'], default: 'normal' },
  isRead: { type: Boolean, default: false },
  readAt: Date,
  link: String,
  relatedModel: String,
  relatedId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
