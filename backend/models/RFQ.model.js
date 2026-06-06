const mongoose = require('mongoose');

const rfqItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, default: 'pcs' },
  estimatedUnitPrice: Number
});

const rfqSchema = new mongoose.Schema({
  rfqNumber: { type: String, unique: true },
  title: { type: String, required: [true,'Title required'], trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  items: [rfqItemSchema],
  deadline: { type: Date, required: [true,'Deadline required'] },
  status: { type: String,
    enum: ['draft','published','under_review','awarded','closed','cancelled'],
    default: 'draft' },
  priority: { type: String, enum: ['low','medium','high','urgent'], default: 'medium' },
  assignedVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
  attachments: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
  quotationsReceived: { type: Number, default: 0 },
  awardedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  awardedQuotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: String
}, { timestamps: true });

rfqSchema.pre('save', async function(next){
  if(this.rfqNumber) return next();
  const year = new Date().getFullYear();
  const count = await mongoose.model('RFQ').countDocuments();
  this.rfqNumber = `RFQ-${year}-${String(count+1).padStart(4,'0')}`;
  next();
});
rfqSchema.index({ rfqNumber: 1, status: 1, createdBy: 1, deadline: 1 });
rfqSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('RFQ', rfqSchema);
