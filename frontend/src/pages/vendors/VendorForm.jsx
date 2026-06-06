import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/api/axios';
import { ArrowLeft, Save, Building2, Landmark, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  category: z.string().min(1, 'Category is required'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid Indian GSTIN format (e.g., 27ABCDE1234F1Z5)').optional().or(z.literal('')),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid Indian PAN format (e.g., ABCDE1234F)').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  rating: z.coerce.number().min(1).max(5).optional().default(4.0),
  notes: z.string().optional(),
  address: z.object({
    street: z.string().min(3, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(/^[0-9]{6}$/, 'Pincode must be exactly 6 digits'),
    country: z.string().min(2, 'Country is required').default('India')
  }),
  bankDetails: z.object({
    bankName: z.string().min(2, 'Bank name is required'),
    accountNumber: z.string().min(8, 'Account number must be at least 8 digits'),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid Indian IFSC format (e.g., SBIN0012345)'),
    branchName: z.string().min(2, 'Branch name is required')
  })
});

const CATEGORIES = ['IT & Technology', 'Construction', 'Office Supplies', 'Logistics', 'Electrical', 'Human Resources', 'Marketing', 'Consulting'];

export default function VendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [activeTab, setActiveTab] = useState('general');

  const { register: regInput, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'active',
      rating: 4.0,
      address: { country: 'India' }
    }
  });

  useEffect(() => {
    if (isEdit) {
      const loadVendor = async () => {
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
      loadVendor();
    }
  }, [id, isEdit, reset, navigate]);

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await api.put(`/vendors/${id}`, data);
        toast.success('Vendor profile updated successfully.');
      } else {
        await api.post('/vendors', data);
        toast.success('Vendor onboarded successfully.');
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
        <span className="text-sm text-gray-400 font-medium">Fetching profile details…</span>
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isEdit ? 'Edit Vendor Profile' : 'Onboard New Vendor'}
          </h1>
          <p className="text-sm text-gray-500">
            {isEdit ? 'Modify corporate profile, addressing details and banking records.' : 'Enter details to add a new business partner.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'general' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-950'
            }`}
          >
            <Building2 size={16} />
            General Profile & Address
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'bank' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-950'
            }`}
          >
            <Landmark size={16} />
            Banking & Regulatory Compliance
          </button>
        </div>

        {/* Tab content - General */}
        <div className={`card p-6 space-y-6 rounded-t-none ${activeTab === 'general' ? 'block' : 'hidden'}`}>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name *</label>
              <input type="text" {...regInput('companyName')} className="input" />
              {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName.message}</p>}
            </div>
            <div>
              <label className="label">Contact Person Name *</label>
              <input type="text" {...regInput('contactPerson')} className="input" />
              {errors.contactPerson && <p className="text-xs text-red-500 mt-1">{errors.contactPerson.message}</p>}
            </div>
            <div>
              <label className="label">Email Address *</label>
              <input type="email" {...regInput('email')} className="input" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input type="text" {...regInput('phone')} className="input" />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Industry Category *</label>
              <select {...regInput('category')} className="input">
                <option value="">Select category</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label className="label">Partnership Status</label>
              <select {...regInput('status')} className="input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider pt-4 border-t border-gray-50">Office Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="label">Street details *</label>
              <input type="text" {...regInput('address.street')} className="input" />
              {errors.address?.street && <p className="text-xs text-red-500 mt-1">{errors.address.street.message}</p>}
            </div>
            <div>
              <label className="label">City *</label>
              <input type="text" {...regInput('address.city')} className="input" />
              {errors.address?.city && <p className="text-xs text-red-500 mt-1">{errors.address.city.message}</p>}
            </div>
            <div>
              <label className="label">State *</label>
              <input type="text" {...regInput('address.state')} className="input" />
              {errors.address?.state && <p className="text-xs text-red-500 mt-1">{errors.address.state.message}</p>}
            </div>
            <div>
              <label className="label">Pincode (6-digit PIN) *</label>
              <input type="text" {...regInput('address.pincode')} className="input" />
              {errors.address?.pincode && <p className="text-xs text-red-500 mt-1">{errors.address.pincode.message}</p>}
            </div>
          </div>
        </div>

        {/* Tab content - Financial & Compliance */}
        <div className={`card p-6 space-y-6 rounded-t-none ${activeTab === 'bank' ? 'block' : 'hidden'}`}>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Regulatory Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">GSTIN (15 characters)</label>
              <input type="text" placeholder="27ABCDE1234F1Z5" {...regInput('gstNumber')} className="input uppercase" />
              {errors.gstNumber && <p className="text-xs text-red-500 mt-1">{errors.gstNumber.message}</p>}
            </div>
            <div>
              <label className="label">PAN Number (10 characters)</label>
              <input type="text" placeholder="ABCDE1234F" {...regInput('panNumber')} className="input uppercase" />
              {errors.panNumber && <p className="text-xs text-red-500 mt-1">{errors.panNumber.message}</p>}
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider pt-4 border-t border-gray-50">Settlement Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Settlement Bank Name *</label>
              <input type="text" {...regInput('bankDetails.bankName')} className="input" />
              {errors.bankDetails?.bankName && <p className="text-xs text-red-500 mt-1">{errors.bankDetails.bankName.message}</p>}
            </div>
            <div>
              <label className="label">Account Number *</label>
              <input type="text" {...regInput('bankDetails.accountNumber')} className="input" />
              {errors.bankDetails?.accountNumber && <p className="text-xs text-red-500 mt-1">{errors.bankDetails.accountNumber.message}</p>}
            </div>
            <div>
              <label className="label">IFSC Code (11 characters) *</label>
              <input type="text" placeholder="HDFC0001234" {...regInput('bankDetails.ifscCode')} className="input uppercase" />
              {errors.bankDetails?.ifscCode && <p className="text-xs text-red-500 mt-1">{errors.bankDetails.ifscCode.message}</p>}
            </div>
            <div>
              <label className="label">Branch Name *</label>
              <input type="text" {...regInput('bankDetails.branchName')} className="input" />
              {errors.bankDetails?.branchName && <p className="text-xs text-red-500 mt-1">{errors.bankDetails.branchName.message}</p>}
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider pt-4 border-t border-gray-50">Additional Notes</h3>
          <div>
            <label className="label">Partnership Notes</label>
            <textarea rows="3" {...regInput('notes')} className="input" placeholder="e.g. key performance comments, SLA ratings..." />
          </div>
        </div>

        {/* Form Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/vendors')}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {isEdit ? 'Save Changes' : 'Onboard Vendor'}
          </button>
        </div>
      </form>
    </div>
  );
}
