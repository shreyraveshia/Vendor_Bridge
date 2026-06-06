import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  ArrowLeft,
  Calendar,
  Download,
  Mail,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Building,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InvoiceDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  const isAdminOrProc = hasRole('admin', 'procurement_officer');

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.invoice || res.data);
    } catch (err) {
      toast.error('Failed to load invoice details.');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id, navigate]);

  const handleDownloadPDF = async () => {
    const loadingToast = toast.loading('Generating tax invoice PDF…');
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${invoice.invoiceNumber}.pdf`;
      link.click();
      toast.success('Invoice PDF downloaded.', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to export PDF.', { id: loadingToast });
    }
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    const loadingToast = toast.loading('Sending invoice email to vendor…');
    try {
      await api.post(`/invoices/${id}/send-email`);
      toast.success('Invoice email sent successfully.', { id: loadingToast });
      fetchInvoice();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invoice email.', { id: loadingToast });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSimulatePayment = async () => {
    try {
      await api.patch(`/invoices/${id}/status`, { status: 'paid' });
      toast.success('Payment simulated successfully! Invoice status set to paid.');
      fetchInvoice();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update invoice status.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling tax ledger…</span>
      </div>
    );
  }

  if (!invoice) return null;

  const vendor = invoice.vendor || {};
  const isPaid = invoice.status === 'paid';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{invoice.invoiceNumber}</h1>
              <span className={`badge ${
                invoice.status === 'paid' ? 'badge-success' :
                invoice.status === 'overdue' ? 'badge-danger' :
                invoice.status === 'sent' ? 'badge-info' : 'badge-warning'
              }`}>
                {invoice.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">PO Ref: <span className="font-semibold">{invoice.purchaseOrder?.poNumber}</span></p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleDownloadPDF}
            className="btn btn-outline flex items-center gap-1.5"
          >
            <Download size={16} /> PDF
          </button>
          {isAdminOrProc && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="btn btn-outline flex items-center gap-1.5"
              >
                <Mail size={16} /> Send Email
              </button>
              <button
                onClick={handleSimulatePayment}
                className="btn btn-primary flex items-center gap-1.5"
              >
                <CreditCard size={16} /> Pay Invoice
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Render Tax Invoice card */}
        <div className="lg:col-span-2 card p-8 space-y-8 bg-white border border-gray-100 shadow-md">
          {/* GST Header */}
          <div className="flex justify-between border-b border-gray-100 pb-6">
            <div>
              <span className="text-2xl font-black tracking-tight text-gray-900">VendorBridge</span>
              <p className="text-[10px] text-gray-400 font-medium">Procurement ERP Portal</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-extrabold text-gray-900 uppercase">Tax Invoice</h2>
              <span className="text-xs text-gray-400 font-semibold">{invoice.invoiceNumber}</span>
            </div>
          </div>

          {/* Supplier/Buyer details columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-gray-600 border-b border-gray-100 pb-6">
            <div className="space-y-2">
              <span className="font-bold text-gray-800 uppercase tracking-wider block">Seller Details (Vendor)</span>
              <p className="font-bold text-sm text-gray-900">{vendor.companyName}</p>
              <p>{vendor.address?.street}</p>
              <p>{vendor.address?.city}, {vendor.address?.state} - {vendor.address?.pincode}</p>
              <p>GSTIN: <span className="font-bold text-gray-900">{invoice.sellerGST || vendor.gstNumber || 'N/A'}</span></p>
              <p>PAN: <span className="font-bold text-gray-900">{vendor.panNumber || 'N/A'}</span></p>
            </div>
            <div className="space-y-2">
              <span className="font-bold text-gray-800 uppercase tracking-wider block">Buyer Details</span>
              <p className="font-bold text-sm text-gray-900">VendorBridge Pvt Ltd</p>
              <p>123, Business Park, Andheri East</p>
              <p>Mumbai, Maharashtra - 400069</p>
              <p>GSTIN: <span className="font-bold text-gray-900">{invoice.buyerGST || '27AABCV1234F1ZK'}</span></p>
            </div>
          </div>

          {/* Dates metadata block */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
            <div>
              <span className="text-gray-400 block font-medium">Invoice Date</span>
              <span className="font-bold text-gray-900 mt-0.5 block">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Due Date</span>
              <span className="font-bold text-gray-900 mt-0.5 block">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">PO Reference</span>
              <span className="font-bold text-gray-900 mt-0.5 block">{invoice.purchaseOrder?.poNumber}</span>
            </div>
            <div>
              <span className="text-gray-400 block font-medium">Payment Terms</span>
              <span className="font-bold text-gray-900 mt-0.5 block">{invoice.paymentTerms}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead>
                <tr className="border-b border-gray-100 font-bold text-gray-800">
                  <th className="py-2">Item Name</th>
                  <th>HSN</th>
                  <th className="text-right">Qty</th>
                  <th>Unit</th>
                  <th className="text-right">Unit Rate</th>
                  <th className="text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, idx) => (
                  <tr key={item._id || idx} className="border-b border-gray-50 hover:bg-slate-50/50">
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-gray-900 block">{item.name}</span>
                      <span className="text-[10px] text-gray-400">{item.description}</span>
                    </td>
                    <td className="font-medium text-gray-700">{item.hsn || '—'}</td>
                    <td className="text-right font-medium text-gray-900">{item.quantity}</td>
                    <td className="text-gray-500">{item.unit}</td>
                    <td className="text-right text-gray-700">₹{item.unitPrice.toLocaleString('en-IN')}</td>
                    <td className="text-right font-semibold text-gray-900">₹{item.totalPrice.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Words amount */}
          <div className="pt-4 border-t border-gray-50 text-xs text-gray-500 italic">
            <span className="font-bold text-gray-700 block not-italic">Amount in Words</span>
            {invoice.amountInWords || 'Amount in words placeholder'}
          </div>
        </div>

        {/* Bank Details & Totals Sidebar */}
        <div className="space-y-6">
          {/* Financial calculations */}
          <div className="card p-5 space-y-3 bg-slate-900 text-white shadow-lg">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 pb-2">Invoice Totals</h3>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{invoice.subtotal.toLocaleString('en-IN')}</span>
            </div>
            {invoice.cgstAmount > 0 && (
              <>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>CGST ({invoice.cgstRate}%):</span>
                  <span>₹{invoice.cgstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>SGST ({invoice.sgstRate}%):</span>
                  <span>₹{invoice.sgstAmount.toLocaleString('en-IN')}</span>
                </div>
              </>
            )}
            {invoice.igstAmount > 0 && (
              <div className="flex justify-between text-xs text-slate-300">
                <span>IGST ({invoice.igstRate}%):</span>
                <span>₹{invoice.igstAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-300">
              <span>Total Tax:</span>
              <span>₹{invoice.totalTax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-white/10 text-primary-400">
              <span>Grand Total:</span>
              <span className="font-extrabold">₹{invoice.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Settlement bank card */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-2">
              <Building size={16} />
              Remittance details
            </h3>
            {invoice.bankDetails ? (
              <div className="space-y-2 text-xs text-gray-600">
                <div>
                  <span className="text-[10px] text-gray-400 block">Bank Name</span>
                  <span className="font-bold text-gray-800">{invoice.bankDetails.bankName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Account Number</span>
                  <span className="font-bold text-gray-800">{invoice.bankDetails.accountNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">IFSC Code</span>
                  <span className="font-bold text-gray-800 uppercase">{invoice.bankDetails.ifscCode}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Branch Location</span>
                  <span className="font-semibold text-gray-800">{invoice.bankDetails.branchName}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No bank credentials declared on invoice.</p>
            )}
          </div>

          {/* Email sent check indicator */}
          {invoice.emailSentAt && (
            <div className="card p-4 bg-green-50/50 border border-green-100 flex items-center gap-2.5 text-xs text-green-700">
              <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Emailed to Vendor</span>
                <p className="text-[10px] text-green-600/80 mt-0.5">
                  Sent to: {invoice.emailSentTo} at {new Date(invoice.emailSentAt).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
