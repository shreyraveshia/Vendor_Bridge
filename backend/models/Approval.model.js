const mongoose = require('mongoose');

const approvalStepSchema = new mongoose.Schema({
  stepNumber: Number,
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  remarks: String,
  actionedAt: Date
});

const approvalSchema = new mongoose.Schema({
  approvalNumber: { type: String, unique: true },
  rfq: { type: mongoose.Schema.Types.ObjectId, ref: 'RFQ', required: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvalSteps: [approvalStepSchema],
  currentStep: { type: Number, default: 1 },
  status: { type: String,
    enum: ['pending','approved','rejected','escalated'], default: 'pending' },
  priority: { type: String, enum: ['normal','urgent'], default: 'normal' },
  totalAmount: { type: Number, required: true },
  remarks: String,
  approvedAt: Date,
  rejectedAt: Date,
  dueDate: Date,
  isOverdue: { type: Boolean, default: false }
}, { timestamps: true });

approvalSchema.pre('save', async function(next){
  if(this.approvalNumber) return next();
  const count = await mongoose.model('Approval').countDocuments();
  this.approvalNumber = `APV-${String(count+1).padStart(5,'0')}`;
  next();
});
approvalSchema.index({ status: 1, requestedBy: 1, rfq: 1 });

module.exports = mongoose.model('Approval', approvalSchema);
