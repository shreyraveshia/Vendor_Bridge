import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/api/axios';
import { ArrowLeft, Save, Plus, Trash2, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const itemSchema = z.object({
  name: z.string().min(2, 'Item name is required'),
  description: z.string().min(2, 'Item description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit: z.string().min(1, 'Unit is required'),
  estimatedUnitPrice: z.coerce.number().min(1, 'Estimated unit price is required')
});

const schema = z.object({
  title: z.string().min(4, 'Title must be at least 4 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  deadline: z.string().min(1, 'Deadline date is required'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'At least 1 item must be added'),
  assignedVendors: z.array(z.string()).min(1, 'Assign at least 1 vendor')
});

const CATEGORIES = ['IT & Technology', 'Construction', 'Office Supplies', 'Logistics', 'Electrical', 'Human Resources', 'Marketing', 'Consulting'];

export default function RFQForm() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(true);

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 'medium',
      items: [{ name: '', description: '', quantity: 1, unit: 'units', estimatedUnitPrice: 100 }],
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
        setVendors((res.data.vendors || res.data).filter(v => v.status === 'active'));
      } catch (err) {
        toast.error('Failed to load active vendors for assignment.');
      } finally {
        setLoadingVendors(false);
      }
    };
    fetchVendors();
  }, []);

  const onSubmit = async (data) => {
    try {
      await api.post('/rfqs', data);
      toast.success('RFQ draft created successfully.');
      navigate('/rfqs');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit RFQ.';
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/rfqs')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Request for Quotation</h1>
          <p className="text-sm text-gray-500">Draft requirements and assign verified vendor partners.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Core details */}
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">RFQ Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">RFQ Sourcing Title *</label>
              <input type="text" {...register('title')} className="input" placeholder="e.g. Office Laptop Procurement Q2 2026" />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Detailed description *</label>
              <textarea rows="3" {...register('description')} className="input" placeholder="Detail hardware constraints, delivery timeline guidelines, SLAs..." />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>
            <div>
              <label className="label">Category *</label>
              <select {...register('category')} className="input">
                <option value="">Select Category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
            </div>
            <div>
              <label className="label">Priority Rating</label>
              <select {...register('priority')} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label">Bidding Deadline Date *</label>
              <input type="date" {...register('deadline')} className="input" />
              {errors.deadline && <p className="text-xs text-red-500 mt-1">{errors.deadline.message}</p>}
            </div>
          </div>
        </div>

        {/* Dynamic Items Builder */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Line Items</h3>
            <button
              type="button"
              onClick={() => append({ name: '', description: '', quantity: 1, unit: 'units', estimatedUnitPrice: 100 })}
              className="btn btn-outline py-1.5 px-3 flex items-center gap-1.5 text-xs"
            >
              <Plus size={14} /> Add Line Item
            </button>
          </div>
          {errors.items && <p className="text-xs text-red-500">{errors.items.message}</p>}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border border-gray-100 bg-slate-50/30 rounded-xl space-y-3 relative group">
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pr-6">
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Item Name</label>
                    <input
                      type="text"
                      {...register(`items.${index}.name`)}
                      className="input py-1.5 mt-0.5 text-sm"
                      placeholder="Item name"
                    />
                    {errors.items?.[index]?.name && <p className="text-[10px] text-red-500">{errors.items[index].name.message}</p>}
                  </div>
                  <div className="md:col-span-8">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Specifications / Description</label>
                    <input
                      type="text"
                      {...register(`items.${index}.description`)}
                      className="input py-1.5 mt-0.5 text-sm"
                      placeholder="Brand, capabilities, sizes..."
                    />
                    {errors.items?.[index]?.description && <p className="text-[10px] text-red-500">{errors.items[index].description.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Quantity</label>
                    <input
                      type="number"
                      {...register(`items.${index}.quantity`)}
                      className="input py-1.5 mt-0.5 text-sm"
                    />
                    {errors.items?.[index]?.quantity && <p className="text-[10px] text-red-500">{errors.items[index].quantity.message}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Unit Type</label>
                    <input
                      type="text"
                      {...register(`items.${index}.unit`)}
                      className="input py-1.5 mt-0.5 text-sm"
                      placeholder="e.g. units, boxes, hours"
                    />
                    {errors.items?.[index]?.unit && <p className="text-[10px] text-red-500">{errors.items[index].unit.message}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Est. Unit Price (₹)</label>
                    <input
                      type="number"
                      {...register(`items.${index}.estimatedUnitPrice`)}
                      className="input py-1.5 mt-0.5 text-sm"
                    />
                    {errors.items?.[index]?.estimatedUnitPrice && <p className="text-[10px] text-red-500">{errors.items[index].estimatedUnitPrice.message}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor assignments */}
        <div className="card p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Assigned Suppliers</h3>
            <p className="text-xs text-gray-400 mt-0.5">Select which verified vendors will be invited to quote.</p>
          </div>
          {errors.assignedVendors && <p className="text-xs text-red-500">{errors.assignedVendors.message}</p>}

          {loadingVendors ? (
            <p className="text-xs text-gray-400">Loading partner directory…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-3 scrollbar-thin">
              {vendors.map(v => (
                <label key={v._id} className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    value={v._id}
                    {...register('assignedVendors')}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <span className="font-semibold text-gray-800">{v.companyName}</span>
                    <span className="text-[10px] text-gray-400 block">{v.category}</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="card p-6 space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Additional Guidelines</h3>
          <textarea rows="3" {...register('notes')} className="input" placeholder="Enter notes, payment guidelines, or instructions..." />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/rfqs')}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            Create RFQ Draft
          </button>
        </div>
      </form>
    </div>
  );
}
