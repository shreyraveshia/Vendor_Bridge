const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  quantity: { type: Number, required: true },
  unit: String,
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  brand: String,
  hsn: String
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, unique: true },
  rfq: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ' },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  approval: { type: mongoose.Schema.Types.ObjectId, ref: 'Approval' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [poItemSchema],
  deliveryAddress: {
    street: String, city: String, state: String,
    pincode: String, country: { type: String, default: 'India' }
  },
  billingAddress: {
    street: String, city: String, state: String,
    pincode: String, country: { type: String, default: 'India' }
  },
  subtotal: { type: Number, required: true },
  cgstRate: { type: Number, default: 9 },
  sgstRate: { type: Number, default: 9 },
  igstRate: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentTerms: { type: String, default: 'Net 30' },
  deliveryTimeline: String,
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  status: { type: String,
    enum: ['draft','sent','acknowledged','in_progress','delivered','completed','cancelled'],
    default: 'draft' },
  notes: String,
  terms: String
}, { timestamps: true });

purchaseOrderSchema.pre('save', async function(next){
  if(this.poNumber) return next();
  const year = new Date().getFullYear();
  const count = await mongoose.model('PurchaseOrder').countDocuments();
  this.poNumber = `PO-${year}-${String(count+1).padStart(5,'0')}`;
  next();
});
purchaseOrderSchema.index({ poNumber: 1, vendor: 1, status: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
