import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Search, Calendar, FileText, ArrowRight, AlertTriangle, Download, Mail, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '@/components/shared/StatusBadge';

export default function InvoiceList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isVendor = hasRole('vendor');
  const isAdminOrProc = hasRole('admin', 'procurement_officer');

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data.invoices || res.data || []);
    } catch (err) {
      toast.error('Failed to load Invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Compute stats on the full dataset
  const totalCount = invoices.length;
  const draftCount = invoices.filter(i => i.status === 'draft').length;
  const sentCount = invoices.filter(i => i.status === 'sent').length;
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  // Apply filters
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.vendor?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.purchaseOrder?.poNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter ? inv.status === statusFilter : true;

    // Date filters
    let matchesDate = true;
    const invDate = new Date(inv.invoiceDate);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && invDate >= start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && invDate <= end;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Action methods
  const handleDownloadPDF = async (invId, invoiceNumber) => {
    const loadingToast = toast.loading('Generating invoice PDF...');
    try {
      const res = await api.get(`/invoices/${invId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${invoiceNumber}.pdf`;
      link.click();
      toast.success('PDF download started.', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to download invoice PDF.', { id: loadingToast });
    }
  };

  const handleSendEmail = async (invId, defaultEmail) => {
    const email = window.prompt('Send invoice PDF as email attachment. Enter recipient email:', defaultEmail || '');
    if (email === null) return;
    if (!email.trim()) {
      toast.error('Recipient email address is required.');
      return;
    }
    const loadingToast = toast.loading('Sending invoice email...');
    try {
      await api.post(`/invoices/${invId}/send-email`, { email });
      toast.success(`Invoice emailed successfully to ${email}.`, { id: loadingToast });
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to email invoice.', { id: loadingToast });
    }
  };

  const handleMarkAsPaid = async (invId) => {
    if (!window.confirm('Are you sure you want to mark this invoice as paid? This action changes records and cannot be undone.')) return;
    const loadingToast = toast.loading('Recording payment...');
    try {
      await api.patch(`/invoices/${invId}/status`, { status: 'paid' });
      toast.success('Invoice marked as paid.', { id: loadingToast });
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark invoice as paid.', { id: loadingToast });
    }
  };

  const handleExportCSV = async () => {
    const loadingToast = toast.loading('Preparing CSV export...');
    try {
      const res = await api.get('/invoices/export/csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('CSV export completed.', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to export invoices CSV.', { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling invoice ledgers…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Export controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Invoices & Settlement</h1>
          <p className="text-sm text-gray-500">
            {isVendor ? 'Track your billed invoices, payment status, and tax receipts.' : 'Manage tax invoices, payment sign-offs, and compliance records.'}
          </p>
        </div>

        {isAdminOrProc && (
          <button
            onClick={handleExportCSV}
            className="btn btn-primary flex items-center gap-2 text-xs py-2.5 px-4 self-start sm:self-auto shadow-md"
          >
            <FileSpreadsheet size={16} /> Export Invoices CSV
          </button>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card p-4 text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Total Invoices</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{totalCount}</h3>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-amber-400">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Drafts</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{draftCount}</h3>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-blue-500">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Sent</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{sentCount}</h3>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-green-500">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Paid</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{paidCount}</h3>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-red-500">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Overdue</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{overdueCount}</h3>
        </div>
      </div>

      {/* Filters row */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by invoice number, vendor, or PO reference…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 text-xs"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-xs w-full md:w-44"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="btn btn-secondary py-2 text-xs"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50 dark:border-gray-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold uppercase text-[9px]">Issued Date From:</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input py-1.5 px-3 text-xs w-36" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold uppercase text-[9px]">To:</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input py-1.5 px-3 text-xs w-36" />
          </div>
        </div>
      </div>

      {/* Invoices table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table text-xs">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>PO Number</th>
                {!isVendor && <th>Vendor</th>}
                <th className="text-right">Grand Total</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-center w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-gray-50/50">
                    <td className="font-bold text-gray-900 dark:text-white">{inv.invoiceNumber}</td>
                    <td>
                      <Link
                        to={`/purchase-orders/${inv.purchaseOrder?._id || inv.purchaseOrder}`}
                        className="font-bold text-primary-600 hover:underline"
                      >
                        {inv.purchaseOrder?.poNumber || 'View PO'}
                      </Link>
                    </td>
                    {!isVendor && (
                      <td>
                        <span className="font-semibold text-gray-800 dark:text-slate-200">{inv.vendor?.companyName}</span>
                      </td>
                    )}
                    <td className="text-right font-extrabold text-gray-900 dark:text-white">
                      ₹{inv.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="text-gray-600 dark:text-slate-400">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="text-gray-600 dark:text-slate-400">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => navigate(`/invoices/${inv._id}`)}
                          className="p-1.5 rounded hover:bg-slate-100 text-gray-500 hover:text-gray-950"
                          title="View Invoice Document"
                        >
                          <ArrowRight size={14} />
                        </button>
                        
                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadPDF(inv._id, inv.invoiceNumber)}
                          className="p-1.5 rounded hover:bg-slate-100 text-gray-500 hover:text-primary-600"
                          title="Download PDF Invoice"
                        >
                          <Download size={14} />
                        </button>
                        
                        {/* Send Email */}
                        {isAdminOrProc && (
                          <button
                            onClick={() => handleSendEmail(inv._id, inv.vendor?.email)}
                            className="p-1.5 rounded hover:bg-slate-100 text-gray-500 hover:text-blue-600"
                            title="Email PDF Invoice"
                          >
                            <Mail size={14} />
                          </button>
                        )}
                        
                        {/* Mark as Paid */}
                        {isAdminOrProc && ['sent', 'overdue'].includes(inv.status) && (
                          <button
                            onClick={() => handleMarkAsPaid(inv._id)}
                            className="p-1.5 rounded hover:bg-slate-100 text-gray-500 hover:text-green-600"
                            title="Mark as Paid"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isVendor ? '7' : '8'} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle size={28} className="text-gray-300" />
                      <span>No Invoices logged matching search parameters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
