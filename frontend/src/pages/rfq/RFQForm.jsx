import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/api/axios';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

const itemSchema = z.object({
  name: z.string().min(2, 'Item name is required'),
  description: z.string().min(2, 'Specifications is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit: z.enum(['pcs', 'kg', 'litre', 'box', 'set']).default('pcs'),
  estimatedUnitPrice: z.coerce.number().min(1, 'Estimated price is required')
});

const schema = z.object({
  title: z.string().min(4, 'Title must be at least 4 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  deadline: z.string().min(1, 'Deadline date is required'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'At least 1 item is required'),
  assignedVendors: z.array(z.string()).min(1, 'Assign at least 1 vendor')
});

const CATEGORIES = ['IT & Technology', 'Construction', 'Office Supplies', 'Logistics', 'Electrical', 'Human Resources', 'Marketing', 'Consulting'];

export default function RFQForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [vendorSearch, setVendorSearch] = useState('');

  const { register, control, handleSubmit, trigger, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 'medium',
      items: [{ name: '', description: '', quantity: 1, unit: 'pcs', estimatedUnitPrice: 100 }],
      assignedVendors: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await api.get('/vendors');
        setVendors((res.data.vendors || res.data || []).filter(v => v.status === 'active'));
      } catch (err) {
        toast.error('Failed to load active vendors.');
      } finally {
        setLoadingVendors(false);
      }
    };
    fetchVendors();
  }, []);

  const nextStep = async () => {
    let fieldsToValidate = [];
    if (step === 1) {
      fieldsToValidate = ['title', 'description', 'category', 'priority', 'deadline'];
    } else if (step === 2) {
      fieldsToValidate = ['items'];
    } else if (step === 3) {
      fieldsToValidate = ['assignedVendors'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
    } else {
      toast.error('Please resolve validation errors before continuing.');
    }
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const submitForm = async (data, shouldPublish) => {
    const loadingToast = toast.loading(shouldPublish ? 'Publishing RFQ...' : 'Saving RFQ draft...');
    try {
      // 1. Create RFQ (defaults to draft status)
      const res = await api.post('/rfqs', { ...data, status: 'draft' });
      const createdRfq = res.data.rfq || res.data;

      // 2. If shouldPublish, call publish endpoint
      if (shouldPublish) {
        await api.patch(`/rfqs/${createdRfq._id}/publish`);
        toast.success('RFQ published successfully!', { id: loadingToast });
      } else {
        toast.success('RFQ draft saved successfully.', { id: loadingToast });
      }
      navigate('/rfq');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit RFQ.';
      toast.error(msg, { id: loadingToast });
    }
  };

  const watchedData = watch();

  const filteredVendors = vendors.filter(v =>
    v.companyName?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.category?.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/rfq')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Create Request for Quotation</h1>
          <p className="text-sm text-gray-500">Wizard process to draft details, items, and select suppliers.</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card p-4">
        <div className="flex justify-between text-2xs font-bold text-gray-400 uppercase mb-2">
          <span>Step 1: Details</span>
          <span>Step 2: Items</span>
          <span>Step 3: Vendors</span>
          <span>Step 4: Review</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-850 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-primary-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: Basic Details */}
      {step === 1 && (
        <div className="card p-6 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Basic Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">RFQ Sourcing Title *</label>
              <input type="text" {...register('title')} className="input text-xs" placeholder="e.g. Server Hardware Expansion Q3" />
              {errors.title && <p className="text-2xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Detailed description *</label>
              <textarea rows="4" {...register('description')} className="input text-xs" placeholder="Include quality requirements, delivery timeline constraints, specifications details..." />
              {errors.description && <p className="text-2xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>
            <div>
              <label className="label">Industry Category *</label>
              <select {...register('category')} className="input text-xs">
                <option value="">Select Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-2xs text-red-500 mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label className="label">Priority Rating</label>
              <select {...register('priority')} className="input text-xs">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Bidding Deadline Date *</label>
              <input type="date" {...register('deadline')} className="input text-xs" />
              {errors.deadline && <p className="text-2xs text-red-500 mt-1">{errors.deadline.message}</p>}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Line Items */}
      {step === 2 && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Line Items Sourcing</h3>
            <button
              type="button"
              onClick={() => append({ name: '', description: '', quantity: 1, unit: 'pcs', estimatedUnitPrice: 100 })}
              className="btn btn-secondary py-1.5 px-3 text-2xs flex items-center gap-1"
            >
              <Plus size={12} /> Add Item
            </button>
          </div>
          {errors.items && <p className="text-2xs text-red-500">{errors.items.message}</p>}

          <div className="space-y-4 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border border-gray-100 dark:border-gray-800 bg-slate-50/20 dark:bg-slate-900/20 rounded-xl space-y-3 relative">
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pr-6">
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Item Name *</label>
                    <input type="text" {...register(`items.${index}.name`)} className="input py-1.5 mt-0.5 text-xs" placeholder="e.g. Business Laptop" />
                    {errors.items?.[index]?.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.items[index].name.message}</p>}
                  </div>
                  <div className="sm:col-span-8">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Specifications *</label>
                    <input type="text" {...register(`items.${index}.description`)} className="input py-1.5 mt-0.5 text-xs" placeholder="Processor, memory, screen dimensions specifications..." />
                    {errors.items?.[index]?.description && <p className="text-[10px] text-red-500 mt-0.5">{errors.items[index].description.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Quantity *</label>
                    <input type="number" {...register(`items.${index}.quantity`)} className="input py-1.5 mt-0.5 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Unit Type</label>
                    <select {...register(`items.${index}.unit`)} className="input py-1.5 mt-0.5 text-xs">
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="kg">kg (Kilogram)</option>
                      <option value="litre">litre (Litre)</option>
                      <option value="box">box (Box)</option>
                      <option value="set">set (Set)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Est. Unit Price (₹) *</label>
                    <input type="number" {...register(`items.${index}.estimatedUnitPrice`)} className="input py-1.5 mt-0.5 text-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Vendors & notes */}
      {step === 3 && (
        <div className="card p-6 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Supplier Assignments</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Select from active registered vendors to invite bids.</p>
          </div>
          {errors.assignedVendors && <p className="text-2xs text-red-500">{errors.assignedVendors.message}</p>}

          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Search active suppliers by name or industry..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="input text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-gray-150 dark:border-gray-800 rounded-xl p-3 scrollbar-thin">
            {loadingVendors ? (
              <p className="text-xs text-gray-400 italic">Verifying partner registry...</p>
            ) : filteredVendors.length > 0 ? (
              filteredVendors.map(v => (
                <label key={v._id} className="flex items-center gap-2.5 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    value={v._id}
                    {...register('assignedVendors')}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <span className="font-bold text-gray-800 dark:text-slate-300">{v.companyName}</span>
                    <span className="text-[10px] text-gray-400 block">{v.category} &bull; Rating {v.rating?.toFixed(1)}</span>
                  </div>
                </label>
              ))
            ) : (
              <p className="text-xs text-gray-400 italic py-4 text-center">No active vendors match your search.</p>
            )}
          </div>

          <div className="pt-2">
            <label className="label">Internal Instructions / Notes</label>
            <textarea rows="3" {...register('notes')} className="input text-xs" placeholder="e.g. delivery date must not exceed April 30..." />
          </div>
        </div>
      )}

      {/* STEP 4: Review and submit */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="card p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-gray-800 pb-2">Review RFQ Requirements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block font-semibold">RFQ Title</span>
                <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">{watchedData.title}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Deadline date</span>
                <span className="font-bold text-gray-900 dark:text-white mt-0.5 block flex items-center gap-1">
                  <Calendar size={14} /> {new Date(watchedData.deadline).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-400 block font-semibold">Specifications description</span>
                <p className="text-gray-700 dark:text-slate-300 leading-relaxed mt-1 whitespace-pre-wrap">{watchedData.description}</p>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Category & Priority</span>
                <span className="font-semibold text-gray-800 dark:text-slate-300 mt-0.5 block capitalize">
                  {watchedData.category} &bull; {watchedData.priority}
                </span>
              </div>
              {watchedData.notes && (
                <div className="sm:col-span-2">
                  <span className="text-gray-400 block font-semibold">Instructions notes</span>
                  <p className="text-gray-600 dark:text-slate-400 mt-0.5 italic">{watchedData.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items Summary */}
          <div className="card p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-gray-800 pb-2">Line Items Draft</h3>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Specifications</th>
                    <th className="text-right">Qty</th>
                    <th>Unit</th>
                    <th className="text-right">Estimated Unit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {watchedData.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-bold text-gray-900 dark:text-white">{item.name}</td>
                      <td className="text-gray-600 dark:text-slate-400">{item.description}</td>
                      <td className="text-right font-semibold text-gray-900 dark:text-white">{item.quantity}</td>
                      <td className="text-gray-500">{item.unit}</td>
                      <td className="text-right font-bold text-gray-900 dark:text-white">₹{Number(item.estimatedUnitPrice).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assigned Vendors Summary */}
          <div className="card p-6 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Invited Suppliers Summary</h3>
            <div className="flex flex-wrap gap-2">
              {watchedData.assignedVendors?.map(vId => {
                const matched = vendors.find(v => v._id === vId);
                return (
                  <span key={vId} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                    {matched?.companyName || 'Supplier'}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex justify-between pt-2">
        {step > 1 ? (
          <button type="button" onClick={prevStep} className="btn btn-secondary text-xs">
            Previous Step
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn btn-primary text-xs flex items-center gap-1"
            >
              Continue <ArrowRight size={14} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSubmit(data => submitForm(data, false))}
                className="btn btn-secondary text-xs flex items-center gap-1"
              >
                <Save size={14} /> Save as Draft
              </button>
              <button
                type="button"
                onClick={handleSubmit(data => submitForm(data, true))}
                className="btn btn-primary text-xs flex items-center gap-1"
              >
                <Send size={14} /> Publish RFQ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
