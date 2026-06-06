const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  vendorId: { type: String, unique: true },
  companyName: { type: String, required: [true,'Company name required'], trim: true },
  contactPerson: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  alternatePhone: String,
  category: { type: String, required: true,
    enum: ['IT & Technology','Office Supplies','Furniture','Logistics',
           'Construction','Catering','Security','Cleaning','Electrical','Mechanical','Other'] },
  gstNumber: { type: String, trim: true, uppercase: true,
    validate: { validator: v => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
                message: 'Invalid GST number' } },
  panNumber: { type: String, trim: true, uppercase: true },
  address: {
    street: String, city: String, state: String,
    pincode: String, country: { type: String, default: 'India' }
  },
  bankDetails: { bankName: String, accountNumber: String, ifscCode: String, branchName: String },
  status: { type: String, enum: ['active','inactive','blacklisted','pending'], default: 'active' },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalSpend:  { type: Number, default: 0 },
  documents: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

vendorSchema.pre('save', async function(next){
  if(this.vendorId) return next();
  const count = await mongoose.model('Vendor').countDocuments();
  this.vendorId = 'VND-' + String(count + 1).padStart(4,'0');
  next();
});
vendorSchema.index({ companyName: 'text', email: 1, category: 1, status: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
