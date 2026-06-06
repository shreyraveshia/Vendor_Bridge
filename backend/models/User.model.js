const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: [true,'First name required'], trim: true },
  lastName:  { type: String, required: [true,'Last name required'],  trim: true },
  email:     { type: String, required: [true,'Email required'], unique: true,
               lowercase: true, trim: true,
               match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  password:  { type: String, required: [true,'Password required'], minlength: 8, select: false },
  role:      { type: String, enum: ['admin','procurement_officer','manager','vendor'],
               required: true },
  phone:     { type: String, trim: true },
  company:   { type: String, trim: true },
  avatar:    { type: String, default: null },
  isActive:  { type: Boolean, default: true },
  refreshToken: { type: String, select: false },
  lastLogin: { type: Date }
}, { timestamps: true });

userSchema.virtual('fullName').get(function(){ return this.firstName+' '+this.lastName; });
userSchema.pre('save', async function(next){
  if(!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = async function(candidate){
  return bcrypt.compare(candidate, this.password);
};
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
