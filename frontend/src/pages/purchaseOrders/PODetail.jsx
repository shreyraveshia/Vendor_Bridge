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
  Truck,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Building,
  User,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

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
      const allInvoices = invRes.data.invoices || invRes.data || [];
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
    const loadingToast = toast.loading(`Updating status to ${nextStatus}...`);
    try {
      await api.patch(`/purchase-orders/${id}/status`, { status: nextStatus });
      toast.success(`Purchase Order status updated to '${nextStatus}'.`, { id: loadingToast });
      fetchPOData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update PO status.', { id: loadingToast });
    }
  };

  const handleCancelPO = async () => {
    if (!window.confirm('Are you sure you want to cancel this Purchase Order?')) return;
    const loadingToast = toast.loading('Cancelling PO...');
    try {
      await api.patch(`/purchase-orders/${id}/status`, { status: 'cancelled' });
      toast.success('Purchase Order cancelled successfully.', { id: loadingToast });
      fetchPOData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel PO.', { id: loadingToast });
    }
  };

  const handleCreateInvoice = async () => {
    const loadingToast = toast.loading('Generating tax invoice...');
    try {
      const res = await api.post('/invoices', { purchaseOrderId: id });
      toast.success('Invoice generated successfully!', { id: loadingToast });
      navigate(`/invoices/${res.data.invoice?._id || res.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice.', { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling purchase order details…</span>
      </div>
    );
  }

  if (!po) return null;

  const isInvoiceable = ['sent', 'acknowledged', 'in_progress', 'delivered', 'completed'].includes(po.status);
  const isAdminOrProc = hasRole('admin', 'procurement_officer');
  const canUpdateStatus = hasRole('admin', 'procurement_officer', 'vendor');

  return (
    <div className="space-y-6">
      {/* Top action bar and title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{po.poNumber}</h1>
              <StatusBadge status={po.status} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              RFQ Reference: <span className="font-semibold text-gray-700 dark:text-slate-350">{po.rfq?.title || 'Direct PO'}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto text-xs">
          {/* Status update dropdown */}
          {canUpdateStatus && po.status !== 'completed' && po.status !== 'cancelled' && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg">
              <span className="text-[10px] font-bold text-gray-400 uppercase px-1.5">Set Status</span>
              <select
                value={po.status}
                onChange={(e) => handleStatusTransition(e.target.value)}
                className="input py-1 px-2 text-2xs w-36 bg-white dark:bg-slate-900 border-none font-bold"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          {/* Cancel button */}
          {isAdminOrProc && po.status !== 'completed' && po.status !== 'cancelled' && (
            <button
              onClick={handleCancelPO}
              className="btn btn-outline border-red-200 text-red-650 hover:bg-red-50 py-2 px-3.5"
            >
              <XCircle size={14} /> Cancel PO
            </button>
          )}

          {/* Invoice generation */}
          {isInvoiceable && isAdminOrProc && !linkedInvoice && (
            <button
              onClick={handleCreateInvoice}
              className="btn btn-primary bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 py-2 px-3.5"
            >
              <FileSpreadsheet size={14} /> Generate Invoice
            </button>
          )}

          {linkedInvoice && (
            <Link
              to={`/invoices/${linkedInvoice._id}`}
              className="btn btn-outline border-green-200 text-green-600 hover:bg-green-50 flex items-center gap-1.5 py-2 px-3.5"
            >
              <FileText size={14} /> View Invoice
            </Link>
          )}
        </div>
      </div>

      {/* Two-Column Details Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PO Header Info Card */}
        <div className="card p-5 space-y-3 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-gray-800 pb-2">Purchase Order Info</h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">PO Reference:</span>
              <span className="font-bold text-gray-900 dark:text-white">{po.poNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Issued Date:</span>
              <span className="font-bold text-gray-900 dark:text-white">{new Date(po.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Created By:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : 'System Admin'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Compliance Status:</span>
              <span className="font-extrabold text-green-600 uppercase">GST Compliant</span>
            </div>
          </div>
        </div>

        {/* Left Column: Vendor Details Card */}
        <div className="card p-5 space-y-3 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-gray-800 pb-2 flex items-center gap-1">
            <Building size={14} /> Supplier Profile
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Company:</span>
              <span className="font-bold text-gray-950 dark:text-white truncate max-w-[160px]">{po.vendor?.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Contact:</span>
              <span className="font-bold text-gray-800 dark:text-slate-350">{po.vendor?.contactPerson || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">GSTIN / Tax ID:</span>
              <span className="font-bold text-gray-900 dark:text-white uppercase">{po.vendor?.gstNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Email:</span>
              <span className="font-bold text-gray-800 dark:text-slate-300 truncate max-w-[170px]">{po.vendor?.email}</span>
            </div>
          </div>
        </div>

        {/* Right Column: PO Logistics details */}
        <div className="card p-5 space-y-3 flex flex-col justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-gray-800 pb-2 flex items-center gap-1">
            <Truck size={14} /> Sourcing Timeline & Terms
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Expected Delivery:</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN') : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Payment Terms:</span>
              <span className="font-bold text-gray-850 dark:text-slate-350">{po.paymentTerms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Lead Timeline:</span>
              <span className="font-bold text-gray-800 dark:text-slate-200">{po.deliveryTimeline || 'Standard'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-semibold">Contract Currency:</span>
              <span className="font-bold text-gray-900 dark:text-white">INR (₹)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Grid & GST calculations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items Table */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-2">Line Items Register</h3>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th className="w-10">#</th>
                    <th>Item Description</th>
                    <th>HSN</th>
                    <th className="text-right">Qty</th>
                    <th>Unit</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items?.map((item, idx) => (
                    <tr key={item._id || idx}>
                      <td className="text-gray-400 font-medium">{idx + 1}</td>
                      <td>
                        <span className="font-bold text-gray-900 dark:text-white block">{item.name}</span>
                        {item.description && <span className="text-[10px] text-gray-500 block mt-0.5">{item.description}</span>}
                      </td>
                      <td className="text-gray-650 dark:text-slate-350 font-semibold">{item.hsn || '—'}</td>
                      <td className="text-right font-bold text-gray-800 dark:text-slate-300">{item.quantity}</td>
                      <td className="text-gray-500">{item.unit}</td>
                      <td className="text-right text-gray-650">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="text-right font-extrabold text-gray-900 dark:text-white">
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
            <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-2">Terms & Legal Conditions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-gray-600 dark:text-slate-400">
              <div>
                <span className="font-bold text-gray-800 dark:text-slate-200 block mb-1">Standard Terms & Exclusions</span>
                <p className="leading-relaxed">{po.terms || 'Standard Indian GST terms apply. Payments are processed Net 30 days.'}</p>
              </div>
              {po.notes && (
                <div>
                  <span className="font-bold text-gray-800 dark:text-slate-250 block mb-1">Instructions / Notes</span>
                  <p className="leading-relaxed italic">{po.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Calculation breakdown and Logistics address */}
        <div className="space-y-6 text-xs">
          {/* GST Calculation Table */}
          <div className="card p-5 space-y-3 bg-slate-900 text-white shadow-lg border-t-4 border-t-green-500">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-2">GST Calculation Matrix</h3>
            
            <div className="flex justify-between text-slate-300">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{po.subtotal.toLocaleString('en-IN')}</span>
            </div>

            {po.cgstAmount > 0 && (
              <>
                <div className="flex justify-between text-slate-300">
                  <span>CGST (@{po.cgstRate}%):</span>
                  <span>₹{po.cgstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>SGST (@{po.sgstRate}%):</span>
                  <span>₹{po.sgstAmount.toLocaleString('en-IN')}</span>
                </div>
              </>
            )}

            {po.igstAmount > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>IGST (@{po.igstRate}%):</span>
                <span>₹{po.igstAmount.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-300 border-b border-white/10 pb-2">
              <span>Total Sourcing Tax:</span>
              <span>₹{po.totalTax.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between text-sm font-black pt-2 text-primary-400">
              <span>Grand Total:</span>
              <span className="font-extrabold text-base">₹{po.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Shipping Addresses details */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-gray-800 pb-2 flex items-center gap-1">
              <MapPin size={14} /> Shipping Addresses
            </h3>
            <div className="space-y-3 text-xs text-gray-650 dark:text-slate-400 leading-relaxed">
              <div className="bg-slate-50/60 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100/40 dark:border-slate-800">
                <span className="font-bold text-gray-850 dark:text-slate-200 block mb-0.5">Billing Office</span>
                <p>{po.billingAddress?.street}, {po.billingAddress?.city}, {po.billingAddress?.state} - {po.billingAddress?.pincode}</p>
              </div>
              <div className="bg-slate-50/60 dark:bg-slate-950/20 p-2.5 rounded-lg border border-slate-100/40 dark:border-slate-800">
                <span className="font-bold text-gray-850 dark:text-slate-200 block mb-0.5">Delivery Site</span>
                <p>{po.deliveryAddress?.street}, {po.deliveryAddress?.city}, {po.deliveryAddress?.state} - {po.deliveryAddress?.pincode}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
