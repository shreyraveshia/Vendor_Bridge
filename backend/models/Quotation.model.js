const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  rfqItemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: String,
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true },
  brand: String,
  specifications: String
});

const quotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, unique: true },
  rfq: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [quotationItemSchema],
  subtotal: { type: Number, required: true },
  taxRate: { type: Number, default: 18 },
  taxAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  deliveryTimeline: { type: Number, required: true },
  deliveryTimelineUnit: { type: String, enum: ['days','weeks','months'], default: 'days' },
  validityPeriod: { type: Number, default: 30 },
  paymentTerms: { type: String, default: 'Net 30' },
  deliveryTerms: String,
  warranty: String,
  notes: String,
  status: { type: String,
    enum: ['draft','submitted','under_review','shortlisted','rejected','awarded'],
    default: 'draft' },
  isLowestPrice: { type: Boolean, default: false },
  attachments: [{ name: String, url: String }],
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: String
}, { timestamps: true });

quotationSchema.pre('save', async function(next){
  if(this.quotationNumber) return next();
  const count = await mongoose.model('Quotation').countDocuments();
  this.quotationNumber = `QOT-${String(count+1).padStart(5,'0')}`;
  next();
});
quotationSchema.index({ rfq: 1, vendor: 1, status: 1 });

module.exports = mongoose.model('Quotation', quotationSchema);
