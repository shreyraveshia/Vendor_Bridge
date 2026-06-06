import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/api/axios';
import { ArrowLeft, Save, Building, FileText, MapPin, Landmark, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  contactPerson: z.string().min(2, 'Contact person name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  alternatePhone: z.string().optional().or(z.literal('')),
  category: z.string().min(1, 'Category is required'),
  status: z.enum(['active', 'inactive', 'blacklisted', 'pending']).default('active'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid Indian GSTIN (e.g., 27ABCDE1234F1Z5)'),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid Indian PAN format (e.g., ABCDE1234F)'),
  address: z.object({
    street: z.string().min(3, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^[0-9]{6}$/, 'Must be a 6-digit Indian PIN code'),
    country: z.string().default('India')
  }),
  bankDetails: z.object({
    bankName: z.string().min(2, 'Bank name is required'),
    accountNumber: z.string().min(8, 'Account number must be at least 8 digits'),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid Indian IFSC code (e.g., HDFC0001234)'),
    branchName: z.string().min(2, 'Branch name is required')
  }),
  notes: z.string().optional()
});

const CATEGORIES = ['IT & Technology', 'Construction', 'Office Supplies', 'Logistics', 'Electrical', 'Human Resources', 'Marketing', 'Consulting'];

export default function VendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [activeTab, setActiveTab] = useState('basic');

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'active',
      address: { country: 'India' }
    }
  });

  useEffect(() => {
    if (isEdit) {
      const fetchVendor = async () => {
        try {
          const res = await api.get(`/vendors/${id}`);
          reset(res.data.vendor || res.data);
        } catch (err) {
          toast.error('Failed to load vendor profile.');
          navigate('/vendors');
        } finally {
          setLoading(false);
        }
      };
      fetchVendor();
    }
  }, [id, isEdit, reset, navigate]);

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await api.put(`/vendors/${id}`, data);
        toast.success('Vendor profile updated successfully.');
      } else {
        await api.post('/vendors', data);
        toast.success('Vendor registered successfully.');
      }
      navigate('/vendors');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save vendor details.';
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Retrieving vendor details…</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/vendors')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {isEdit ? 'Edit Vendor Profile' : 'Register New Vendor'}
          </h1>
          <p className="text-sm text-gray-500">
            {isEdit ? 'Modify corporate profile details, tax compliance numbers, and bank details.' : 'Enter partner details to onboard a new supplier.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-xl px-4 pt-1.5 shadow-sm overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'basic' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Building size={14} /> Basic Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tax' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FileText size={14} /> GST & Compliance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'address' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <MapPin size={14} /> Address Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bank' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Landmark size={14} /> Bank Credentials
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('additional')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'additional' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BookOpen size={14} /> Additional Info
          </button>
        </div>

        {/* Tab 1: Basic Information */}
        <div className={`card p-6 space-y-4 rounded-t-none ${activeTab === 'basic' ? 'block' : 'hidden'}`}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Basic Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name *</label>
              <input type="text" {...register('companyName')} className="input text-xs" />
              {errors.companyName && <p className="text-2xs text-red-500 mt-1">{errors.companyName.message}</p>}
            </div>
            <div>
              <label className="label">Contact Person *</label>
              <input type="text" {...register('contactPerson')} className="input text-xs" />
              {errors.contactPerson && <p className="text-2xs text-red-500 mt-1">{errors.contactPerson.message}</p>}
            </div>
            <div>
              <label className="label">Email Address *</label>
              <input type="email" {...register('email')} className="input text-xs" />
              {errors.email && <p className="text-2xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input type="text" {...register('phone')} className="input text-xs" />
              {errors.phone && <p className="text-2xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Category *</label>
              <select {...register('category')} className="input text-xs">
                <option value="">Select Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-2xs text-red-500 mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input text-xs">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab 2: GST & Tax */}
        <div className={`card p-6 space-y-4 rounded-t-none ${activeTab === 'tax' ? 'block' : 'hidden'}`}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Tax Registration Compliance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">GSTIN (Indian GST Number) *</label>
              <input type="text" placeholder="27ABCDE1234F1Z5" {...register('gstNumber')} className="input text-xs uppercase" />
              <p className="text-[10px] text-gray-400 mt-1">Format: 2 digits State Code + 10-char PAN + 1 Entity Code + 1 'Z' + 1 Check Sum</p>
              {errors.gstNumber && <p className="text-2xs text-red-500 mt-1">{errors.gstNumber.message}</p>}
            </div>
            <div>
              <label className="label">PAN Number *</label>
              <input type="text" placeholder="ABCDE1234F" {...register('panNumber')} className="input text-xs uppercase" />
              <p className="text-[10px] text-gray-400 mt-1">Format: 5 letters + 4 digits + 1 letter</p>
              {errors.panNumber && <p className="text-2xs text-red-500 mt-1">{errors.panNumber.message}</p>}
            </div>
          </div>
        </div>

        {/* Tab 3: Address */}
        <div className={`card p-6 space-y-4 rounded-t-none ${activeTab === 'address' ? 'block' : 'hidden'}`}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Office Address Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="label">Street / Area details *</label>
              <input type="text" {...register('address.street')} className="input text-xs" />
              {errors.address?.street && <p className="text-2xs text-red-500 mt-1">{errors.address.street.message}</p>}
            </div>
            <div>
              <label className="label">City *</label>
              <input type="text" {...register('address.city')} className="input text-xs" />
              {errors.address?.city && <p className="text-2xs text-red-500 mt-1">{errors.address.city.message}</p>}
            </div>
            <div>
              <label className="label">State *</label>
              <input type="text" {...register('address.state')} className="input text-xs" />
              {errors.address?.state && <p className="text-2xs text-red-500 mt-1">{errors.address.state.message}</p>}
            </div>
            <div>
              <label className="label">Pincode (6-digits) *</label>
              <input type="text" {...register('address.pincode')} className="input text-xs" />
              {errors.address?.pincode && <p className="text-2xs text-red-500 mt-1">{errors.address.pincode.message}</p>}
            </div>
          </div>
        </div>

        {/* Tab 4: Bank Details */}
        <div className={`card p-6 space-y-4 rounded-t-none ${activeTab === 'bank' ? 'block' : 'hidden'}`}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Remittance Bank Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Bank Name *</label>
              <input type="text" {...register('bankDetails.bankName')} className="input text-xs" />
              {errors.bankDetails?.bankName && <p className="text-2xs text-red-500 mt-1">{errors.bankDetails.bankName.message}</p>}
            </div>
            <div>
              <label className="label">Account Number *</label>
              <input type="text" {...register('bankDetails.accountNumber')} className="input text-xs" />
              {errors.bankDetails?.accountNumber && <p className="text-2xs text-red-500 mt-1">{errors.bankDetails.accountNumber.message}</p>}
            </div>
            <div>
              <label className="label">IFSC Code *</label>
              <input type="text" placeholder="HDFC0001234" {...register('bankDetails.ifscCode')} className="input text-xs uppercase" />
              {errors.bankDetails?.ifscCode && <p className="text-2xs text-red-500 mt-1">{errors.bankDetails.ifscCode.message}</p>}
            </div>
            <div>
              <label className="label">Branch Name *</label>
              <input type="text" {...register('bankDetails.branchName')} className="input text-xs" />
              {errors.bankDetails?.branchName && <p className="text-2xs text-red-500 mt-1">{errors.bankDetails.branchName.message}</p>}
            </div>
          </div>
        </div>

        {/* Tab 5: Additional */}
        <div className={`card p-6 space-y-4 rounded-t-none ${activeTab === 'additional' ? 'block' : 'hidden'}`}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Secondary Parameters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Alternate Phone Number</label>
              <input type="text" {...register('alternatePhone')} className="input text-xs" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Internal Sourcing Notes</label>
              <textarea rows="3" {...register('notes')} className="input text-xs" placeholder="e.g. partnership conditions, capacity comments..." />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/vendors')}
            className="btn btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Save size={14} />
            {isEdit ? 'Save Changes' : 'Onboard Partner'}
          </button>
        </div>
      </form>
    </div>
  );
}
