import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/api/axios';
import { ArrowLeft, Save, FileText, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const itemSchema = z.object({
  rfqItemName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.coerce.number().min(1, 'Unit price must be greater than 0'),
  totalPrice: z.number().optional()
});

const schema = z.object({
  deliveryTimeline: z.coerce.number().min(1, 'Timeline is required'),
  deliveryTimelineUnit: z.enum(['days', 'weeks']).default('days'),
  validityPeriod: z.coerce.number().min(7, 'Validity must be at least 7 days'),
  paymentTerms: z.string().min(2, 'Payment terms is required'),
  warranty: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema)
});

export default function QuotationForm() {
  const { rfqId } = useParams();
  const navigate = useNavigate();
  const [rfq, setRFQ] = useState(null);
  const [loading, setLoading] = useState(true);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      deliveryTimelineUnit: 'days',
      validityPeriod: 30,
      paymentTerms: 'Net 30',
      items: []
    }
  });

  const { fields } = useFieldArray({
    control,
    name: 'items'
  });

  useEffect(() => {
    const loadRFQ = async () => {
      try {
        const res = await api.get(`/rfqs/${rfqId}`);
        const rfqData = res.data.rfq || res.data;
        setRFQ(rfqData);

        // Prepopulate quotation items based on RFQ items
        const prepopulatedItems = rfqData.items.map(item => ({
          rfqItemName: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: 0,
          totalPrice: 0
        }));

        setValue('items', prepopulatedItems);
      } catch (err) {
        toast.error('Failed to load RFQ context.');
        navigate('/rfqs');
      } finally {
        setLoading(false);
      }
    };
    loadRFQ();
  }, [rfqId, navigate, setValue]);

  // Watch items array to recalculate totals reactively
  const watchedItems = watch('items') || [];
  const calculatedItems = watchedItems.map(item => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return { ...item, totalPrice: qty * price };
  });

  const subtotal = calculatedItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const taxRate = 18; // Standard GST for calculations
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const totalAmount = subtotal + taxAmount;

  const onSubmit = async (data) => {
    // Inject calculated items and totals into submit packet
    const submitPacket = {
      ...data,
      rfq: rfqId,
      items: calculatedItems,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount
    };

    try {
      await api.post('/quotations', submitPacket);
      toast.success('Quotation submitted successfully!');
      navigate(`/rfqs/${rfqId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit quotation.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling bidding framework…</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/rfqs/${rfqId}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Submit Quotation</h1>
          <p className="text-sm text-gray-500">Provide pricing, timeline, and terms details for "{rfq?.title}".</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Pricing & Items Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2">Quotations Pricing Details</h3>
            <div className="space-y-4">
              {fields.map((field, index) => {
                const itemTotal = (calculatedItems[index]?.totalPrice || 0);
                return (
                  <div key={field.id} className="p-4 border border-gray-100 bg-slate-50/20 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{field.rfqItemName}</h4>
                        <span className="text-[10px] text-gray-400 font-medium">Required Qty: {field.quantity} {field.unit}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400 block">Line Total</span>
                        <span className="text-sm font-bold text-gray-900">₹{itemTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Unit Quote Price (₹) *</label>
                      <input
                        type="number"
                        {...register(`items.${index}.unitPrice`)}
                        className="input py-1.5 mt-0.5 text-sm"
                        placeholder="0"
                      />
                      {errors.items?.[index]?.unitPrice && (
                        <p className="text-[10px] text-red-500 mt-0.5">{errors.items[index].unitPrice.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quotation parameters & billing totals */}
        <div className="space-y-6">
          {/* Totals Summary */}
          <div className="card p-5 space-y-3 bg-slate-900 text-white">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-2">Financial Summary</h3>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>GST ({taxRate}%):</span>
              <span className="font-semibold">₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-white/10">
              <span>Total Amount:</span>
              <span className="text-primary-400 font-extrabold">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Sourcing variables */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-2">Bidding Terms</h3>

            <div>
              <label className="label">Delivery Timeline *</label>
              <div className="flex gap-2">
                <input type="number" {...register('deliveryTimeline')} className="input" placeholder="e.g. 10" />
                <select {...register('deliveryTimelineUnit')} className="input w-28">
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
              {errors.deliveryTimeline && <p className="text-xs text-red-500 mt-1">{errors.deliveryTimeline.message}</p>}
            </div>

            <div>
              <label className="label">Bid Validity Period (Days) *</label>
              <input type="number" {...register('validityPeriod')} className="input" />
              {errors.validityPeriod && <p className="text-xs text-red-500 mt-1">{errors.validityPeriod.message}</p>}
            </div>

            <div>
              <label className="label">Payment Terms *</label>
              <input type="text" {...register('paymentTerms')} className="input" placeholder="e.g. Net 30, Net 45" />
              {errors.paymentTerms && <p className="text-xs text-red-500 mt-1">{errors.paymentTerms.message}</p>}
            </div>

            <div>
              <label className="label">Warranty details</label>
              <input type="text" {...register('warranty')} className="input" placeholder="e.g. 1 year carry-in" />
            </div>

            <div>
              <label className="label">Notes / Clarifications</label>
              <textarea rows="3" {...register('notes')} className="input" placeholder="Specify exclusions or requirements details..." />
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(`/rfqs/${rfqId}`)}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1 flex items-center justify-center gap-1.5"
            >
              <Save size={16} /> Submit Bid
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
