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
  DollarSign,
  Printer,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '@/components/shared/StatusBadge';

export default function InvoiceDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Email Modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');

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
    const loadingToast = toast.loading('Generating tax invoice PDF...');
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${invoice.invoiceNumber}.pdf`;
      link.click();
      toast.success('Invoice PDF downloaded successfully.', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to export PDF.', { id: loadingToast });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenEmailModal = () => {
    setEmailInput(invoice.vendor?.email || '');
    setShowEmailModal(true);
  };

  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      toast.error('Email address is required.');
      return;
    }
    setSendingEmail(true);
    const loadingToast = toast.loading('Emailing tax invoice PDF...');
    try {
      await api.post(`/invoices/${id}/send-email`, { email: emailInput });
      toast.success(`Invoice emailed successfully to ${emailInput}.`, { id: loadingToast });
      setShowEmailModal(false);
      fetchInvoice();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to email invoice.', { id: loadingToast });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!window.confirm('Are you sure you want to mark this invoice as paid?')) return;
    const loadingToast = toast.loading('Updating invoice status...');
    try {
      await api.patch(`/invoices/${id}/status`, { status: 'paid' });
      toast.success('Invoice marked as paid.', { id: loadingToast });
      fetchInvoice();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update invoice status.', { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling tax ledger…</span>
      </div>
    );
  }

  if (!invoice) return null;

  const vendor = invoice.vendor || {};

  // Formatter helper
  const formatCurrency = (val) => {
    return '₹' + new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* TOP ACTION BAR (Hidden during printing via @media print CSS) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 dark:border-gray-800 pb-5 no-print">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              PO Ref: <span className="font-semibold text-gray-700 dark:text-slate-350">{invoice.purchaseOrder?.poNumber}</span>
            </p>
          </div>
        </div>

        {/* Print / Action buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleDownloadPDF}
            className="btn btn-outline flex items-center gap-1.5 py-2 px-3.5"
          >
            <Download size={14} /> Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-outline flex items-center gap-1.5 py-2 px-3.5"
          >
            <Printer size={14} /> Print
          </button>

          {isAdminOrProc && (
            <>
              <button
                onClick={handleOpenEmailModal}
                className="btn btn-outline flex items-center gap-1.5 py-2 px-3.5"
              >
                <Mail size={14} /> Send via Email
              </button>
              
              {invoice.status === 'sent' && (
                <button
                  onClick={handleMarkAsPaid}
                  className="btn btn-primary bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 py-2 px-3.5 shadow"
                >
                  <CheckCircle size={14} /> Mark as Paid
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Style overrides for printing */}
      <style>{`
        @media print {
          /* Hide standard layout panels */
          aside, header, nav, .no-print, button, .toaster {
            display: none !important;
          }
          /* Reset root layout margins/padding */
          body, #root, main, .content-container {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          /* Printable area full size */
          .invoice-print-area {
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 10mm !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* INVOICE DOCUMENT AREA */}
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 md:p-12 space-y-8 text-black invoice-print-area dark:text-gray-900 bg-white">
        
        {/* TAX INVOICE HEADER */}
        <div className="flex justify-between border-b border-gray-100 pb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-green-600">TAX INVOICE</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">GST-Compliant Tax Invoice</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Invoice Number</span>
            <h2 className="text-lg font-black text-gray-800">{invoice.invoiceNumber}</h2>
          </div>
        </div>

        {/* SELLER & BUYER GRIDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs border-b border-gray-100 pb-6">
          {/* SELLER BOX (left) */}
          <div className="space-y-2">
            <span className="font-extrabold text-gray-400 uppercase tracking-widest text-[9px] block">Seller Details</span>
            <p className="font-black text-sm text-gray-950">VendorBridge Pvt Ltd</p>
            <p className="text-gray-655 font-medium leading-relaxed">
              123, Business Park, Andheri East,<br />
              Mumbai, Maharashtra - 400069
            </p>
            <div className="pt-1.5 space-y-1">
              <p className="font-semibold">GSTIN: <span className="font-black text-gray-900 uppercase">{invoice.sellerGST || '27AABCV1234F1ZK'}</span></p>
              <p className="font-semibold">PAN Number: <span className="font-black text-gray-900 uppercase">AAACV1234F</span></p>
            </div>
          </div>

          {/* BUYER BOX (right) */}
          <div className="space-y-2">
            <span className="font-extrabold text-gray-400 uppercase tracking-widest text-[9px] block">Buyer Details</span>
            <p className="font-black text-sm text-gray-950">{vendor.companyName}</p>
            <p className="text-gray-655 font-medium leading-relaxed">
              {vendor.address?.street || 'N/A'},<br />
              {vendor.address?.city || 'N/A'}, {vendor.address?.state || 'N/A'} - {vendor.address?.pincode || 'N/A'}
            </p>
            <div className="pt-1.5 space-y-1">
              <p className="font-semibold">GSTIN: <span className="font-black text-gray-900 uppercase">{invoice.buyerGST || vendor.gstNumber || 'N/A'}</span></p>
              <p className="font-semibold">PAN Number: <span className="font-black text-gray-900 uppercase">{vendor.panNumber || 'N/A'}</span></p>
            </div>
          </div>
        </div>

        {/* METADATA SUMMARY BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 border border-slate-100 p-4 rounded-xl">
          <div>
            <span className="text-[10px] text-gray-400 uppercase block font-semibold">Invoice Date</span>
            <span className="font-bold text-gray-900 mt-0.5 block">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase block font-semibold">Due Date</span>
            <span className="font-bold text-gray-900 mt-0.5 block">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase block font-semibold">PO Reference</span>
            <span className="font-bold text-gray-900 mt-0.5 block">{invoice.purchaseOrder?.poNumber}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase block font-semibold">Payment Terms</span>
            <span className="font-bold text-gray-900 mt-0.5 block">{invoice.paymentTerms}</span>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 font-bold">
                <th className="py-2.5 w-10">#</th>
                <th>Item Description</th>
                <th>HSN</th>
                <th className="text-right w-16">Qty</th>
                <th>Unit</th>
                <th className="text-right w-24">Rate</th>
                <th className="text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, idx) => (
                <tr key={item._id || idx} className="border-b border-gray-100 hover:bg-slate-50/50">
                  <td className="py-3.5 text-gray-400 font-medium">{idx + 1}</td>
                  <td>
                    <span className="font-bold text-gray-900 block">{item.name}</span>
                    {item.description && <span className="text-[10px] text-gray-400 block mt-0.5">{item.description}</span>}
                  </td>
                  <td className="text-gray-600 font-semibold">{item.hsn || '—'}</td>
                  <td className="text-right font-bold text-gray-800">{item.quantity}</td>
                  <td className="text-gray-500">{item.unit}</td>
                  <td className="text-right text-gray-650">{formatCurrency(item.unitPrice)}</td>
                  <td className="text-right font-bold text-gray-950">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TAX BREAKDOWN & REMITTANCE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          
          {/* LEFT PANEL: BANK DETAILS */}
          <div className="space-y-4">
            {invoice.bankDetails && (
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-2.5 text-xs text-gray-650">
                <h4 className="font-bold text-gray-700 uppercase tracking-widest text-[9px] border-b border-gray-150/40 pb-1">
                  Settlement Remittance Box
                </h4>
                <div className="grid grid-cols-2 gap-2 text-2xs">
                  <div>
                    <span className="text-gray-400 block font-semibold">Bank Name</span>
                    <span className="font-bold text-gray-900">{invoice.bankDetails.bankName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold">Branch</span>
                    <span className="font-bold text-gray-900">{invoice.bankDetails.branchName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold">Account Number</span>
                    <span className="font-bold text-gray-900">{invoice.bankDetails.accountNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold">IFSC Code</span>
                    <span className="font-bold text-gray-900 uppercase">{invoice.bankDetails.ifscCode || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <span className="font-bold text-gray-700 text-xs block">Amount in Words</span>
              <p className="text-xs text-gray-500 font-semibold italic">{invoice.amountInWords}</p>
            </div>
          </div>

          {/* RIGHT PANEL: GST SUMMARY GRID */}
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-500 font-semibold">Subtotal (Excl. Tax):</span>
              <span className="font-bold text-gray-800">{formatCurrency(invoice.subtotal)}</span>
            </div>

            {invoice.cgstAmount > 0 && (
              <>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">CGST (@{invoice.cgstRate}%):</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(invoice.cgstAmount)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500">SGST (@{invoice.sgstRate}%):</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(invoice.sgstAmount)}</span>
                </div>
              </>
            )}

            {invoice.igstAmount > 0 && (
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">IGST (@{invoice.igstRate}%):</span>
                <span className="font-semibold text-gray-800">{formatCurrency(invoice.igstAmount)}</span>
              </div>
            )}

            <div className="flex justify-between border-b border-gray-100 pb-2 text-gray-500">
              <span>Total Tax:</span>
              <span className="font-bold">{formatCurrency(invoice.totalTax)}</span>
            </div>

            <div className="flex justify-between p-3.5 bg-green-500 text-white rounded-xl font-black text-sm shadow">
              <span>GRAND TOTAL:</span>
              <span className="text-base font-extrabold">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* INVOICE DOCUMENT FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-gray-150 mt-10">
          <div className="space-y-1.5 text-xs text-gray-500 text-center sm:text-left">
            <span className="font-extrabold text-slate-800 block text-xs">Terms & Disclaimers</span>
            <p className="text-2xs leading-relaxed max-w-sm">
              All payments must be made to the designated bank account details on record. Late payments are subject to standard interest rates. Thank you for your business.
            </p>
          </div>

          {/* SIGNATORY BOX */}
          <div className="border border-dashed border-gray-300 rounded-xl p-4 text-center h-28 w-48 flex flex-col justify-between">
            <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Authorized Signatory</span>
            <span className="text-2xs text-gray-500 block border-t border-gray-150 pt-2 font-semibold">VendorBridge Billing</span>
          </div>
        </div>
      </div>

      {/* SEND EMAIL MODAL (Editable prefilled recipient box) */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 dark:border-gray-800 text-xs">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Email Tax Invoice PDF</h3>
            <p className="text-gray-400">Specify recipient email address below. The system will attach the generated invoice PDF file.</p>
            <form onSubmit={handleSendEmailSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Recipient Email Address *</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="billing@partnercompany.com"
                  className="input"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="btn btn-secondary py-2"
                  disabled={sendingEmail}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary py-2 flex items-center gap-1"
                  disabled={sendingEmail}
                >
                  <Mail size={14} /> {sendingEmail ? 'Emailing...' : 'Send Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
