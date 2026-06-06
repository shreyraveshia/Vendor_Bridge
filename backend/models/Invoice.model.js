const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: Date,
  items: [{
    name: String, description: String,
    quantity: Number, unit: String,
    unitPrice: Number, totalPrice: Number,
    hsn: String
  }],
  subtotal: { type: Number, required: true },
  cgstRate: { type: Number, default: 9 },
  sgstRate: { type: Number, default: 9 },
  igstRate: { type: Number, default: 0 },
  cgstAmount: Number,
  sgstAmount: Number,
  igstAmount: Number,
  totalTax: Number,
  totalAmount: { type: Number, required: true },
  roundOff: { type: Number, default: 0 },
  amountInWords: String,
  currency: { type: String, default: 'INR' },
  status: { type: String,
    enum: ['draft','sent','paid','overdue','cancelled'], default: 'draft' },
  paymentTerms: String,
  bankDetails: { bankName: String, accountNumber: String, ifscCode: String, branchName: String },
  buyerGST: String,
  sellerGST: String,
  notes: String,
  pdfUrl: String,
  emailSentAt: Date,
  emailSentTo: String,
  paidAt: Date
}, { timestamps: true });

invoiceSchema.pre('save', async function(next){
  if(this.invoiceNumber) return next();
  const year = new Date().getFullYear();
  const count = await mongoose.model('Invoice').countDocuments();
  this.invoiceNumber = `INV-${year}-${String(count+1).padStart(5,'0')}`;
  next();
});
invoiceSchema.index({ invoiceNumber: 1, vendor: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
