import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Truck,
  CheckCircle,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_FLOW = {
  draft:        { next: 'sent', role: ['admin', 'procurement_officer'], label: 'Issue PO' },
  sent:         { next: 'acknowledged', role: ['vendor'], label: 'Acknowledge PO' },
  acknowledged: { next: 'in_progress', role: ['vendor'], label: 'Start Fulfillment' },
  in_progress:  { next: 'delivered', role: ['vendor'], label: 'Mark as Delivered' },
  delivered:    { next: 'completed', role: ['admin', 'procurement_officer'], label: 'Complete PO' }
};

export default function PODetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [po, setPO] = useState(null);
  const [linkedInvoice, setLinkedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPOData = async () => {
    try {
      const [poRes, invRes] = await Promise.all([
        api.get(`/purchase-orders/${id}`),
        api.get('/invoices')
      ]);

      const poData = poRes.data.purchaseOrder || poRes.data.po || poRes.data;
      setPO(poData);

      // Check if invoice exists for this PO
      const allInvoices = invRes.data.invoices || invRes.data;
      if (Array.isArray(allInvoices)) {
        const found = allInvoices.find(inv => (inv.purchaseOrder?._id || inv.purchaseOrder) === id);
        setLinkedInvoice(found || null);
      }
    } catch (err) {
      toast.error('Failed to load Purchase Order details.');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOData();
  }, [id, navigate]);

  const handleStatusTransition = async (nextStatus) => {
    try {
      await api.patch(`/purchase-orders/${id}/status`, { status: nextStatus });
      toast.success(`Purchase Order status updated to '${nextStatus}'.`);
      fetchPOData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update PO status.');
    }
  };

  const handleCancelPO = async () => {
    if (!window.confirm('Are you sure you want to cancel this Purchase Order?')) return;
    try {
      await api.patch(`/purchase-orders/${id}/status`, { status: 'cancelled' });
      toast.success('Purchase Order cancelled.');
      fetchPOData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel PO.');
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const res = await api.post('/invoices', { purchaseOrderId: id });
      toast.success('Invoice created in draft status.');
      navigate(`/invoices/${res.data.invoice?._id || res.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling contract items…</span>
      </div>
    );
  }

  if (!po) return null;

  const currentFlow = STATUS_FLOW[po.status];
  const canTransition = currentFlow && currentFlow.role.some(r => hasRole(r));
  const isInvoiceable = ['sent', 'acknowledged', 'in_progress', 'delivered', 'completed'].includes(po.status);
  const isAdminOrProc = hasRole('admin', 'procurement_officer');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{po.poNumber}</h1>
              <span className={`badge ${
                po.status === 'completed' ? 'badge-success' :
                po.status === 'cancelled' ? 'badge-danger' :
                po.status === 'sent' ? 'badge-info' : 'badge-warning'
              }`}>
                {po.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">RFQ: <span className="font-semibold">{po.rfq?.title}</span></p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {canTransition && (
            <button
              onClick={() => handleStatusTransition(currentFlow.next)}
              className="btn btn-primary flex items-center gap-1.5"
            >
              <Truck size={16} />
              {currentFlow.label}
            </button>
          )}

          {isAdminOrProc && po.status !== 'completed' && po.status !== 'cancelled' && (
            <button
              onClick={handleCancelPO}
              className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
            >
              <XCircle size={16} /> Cancel PO
            </button>
          )}

          {isInvoiceable && isAdminOrProc && !linkedInvoice && (
            <button
              onClick={handleCreateInvoice}
              className="btn btn-primary bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5"
            >
              <FileSpreadsheet size={16} /> Create Invoice
            </button>
          )}

          {linkedInvoice && (
            <Link
              to={`/invoices/${linkedInvoice._id}`}
              className="btn btn-outline border-green-200 text-green-600 hover:bg-green-50 flex items-center gap-1.5"
            >
              <FileText size={16} /> View Linked Invoice
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PO Line Items & Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2">Line Items</h3>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Name</th>
                    <th>HSN</th>
                    <th className="text-right">Qty</th>
                    <th>Unit</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items?.map((item, idx) => (
                    <tr key={item._id || idx}>
                      <td className="text-gray-400 font-medium">{idx + 1}</td>
                      <td>
                        <span className="font-semibold text-gray-900 block">{item.name}</span>
                        <span className="text-xs text-gray-500">{item.description}</span>
                      </td>
                      <td className="text-gray-600 font-medium">{item.hsn || '—'}</td>
                      <td className="text-right font-medium text-gray-700">{item.quantity}</td>
                      <td className="text-gray-500">{item.unit}</td>
                      <td className="text-right text-gray-700">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="text-right font-semibold text-gray-900">
                        ₹{item.totalPrice.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legal / Note details */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2">Terms & Conditions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <span className="font-bold text-gray-800 block mb-1">Standard Terms</span>
                <p className="leading-relaxed text-xs">{po.terms || 'Standard Indian GST terms apply. Payments are processed Net 30 days.'}</p>
              </div>
              {po.notes && (
                <div>
                  <span className="font-bold text-gray-800 block mb-1">Instructions / Notes</span>
                  <p className="leading-relaxed text-xs">{po.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Addresses & Financial breakdown */}
        <div className="space-y-6">
          {/* Financials details */}
          <div className="card p-5 space-y-3 bg-slate-900 text-white shadow-lg">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-2">Order Pricing Breakdown</h3>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{po.subtotal.toLocaleString('en-IN')}</span>
            </div>
            {po.cgstAmount > 0 && (
              <>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>CGST ({po.cgstRate}%):</span>
                  <span>₹{po.cgstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>SGST ({po.sgstRate}%):</span>
                  <span>₹{po.sgstAmount.toLocaleString('en-IN')}</span>
                </div>
              </>
            )}
            {po.igstAmount > 0 && (
              <div className="flex justify-between text-xs text-slate-300">
                <span>IGST ({po.igstRate}%):</span>
                <span>₹{po.igstAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Tax:</span>
              <span>₹{po.totalTax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-white/10 text-primary-400">
              <span>Grand Total:</span>
              <span className="font-extrabold">₹{po.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Logistics Address */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-2">Logistics Details</h3>
            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <div>
                <span className="font-bold text-gray-800 block">Billing Address</span>
                <p>{po.billingAddress?.street}, {po.billingAddress?.city}, {po.billingAddress?.state} - {po.billingAddress?.pincode}</p>
              </div>
              <div>
                <span className="font-bold text-gray-800 block">Delivery Address</span>
                <p>{po.deliveryAddress?.street}, {po.deliveryAddress?.city}, {po.deliveryAddress?.state} - {po.deliveryAddress?.pincode}</p>
              </div>
              <div>
                <span className="font-bold text-gray-800 block">Expected Delivery Date</span>
                <p className="font-semibold text-gray-900 mt-0.5">{new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
