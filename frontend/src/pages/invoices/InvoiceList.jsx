import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Search, Calendar, FileText, ArrowRight, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InvoiceList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const isVendor = hasRole('vendor');

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await api.get('/invoices');
        setInvoices(res.data.invoices || res.data);
      } catch (err) {
        toast.error('Failed to load Invoices.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.vendor?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.purchaseOrder?.poNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? inv.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoices & Settlement</h1>
        <p className="text-sm text-gray-500">
          {isVendor ? 'Track your billed invoices, payment status, and tax receipts.' : 'Manage tax invoices, payment sign-offs, and compliance records.'}
        </p>
      </div>

      {/* Filters card */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by invoice number, vendor, or PO reference…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>PO Number</th>
                {!isVendor && <th>Vendor</th>}
                <th className="text-right">Total Amount</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-gray-50/50">
                    <td className="font-semibold text-gray-900">{inv.invoiceNumber}</td>
                    <td>
                      <Link to={`/purchase-orders/${inv.purchaseOrder?._id || inv.purchaseOrder}`} className="font-semibold text-primary-600 hover:underline">
                        {inv.purchaseOrder?.poNumber || 'View PO'}
                      </Link>
                    </td>
                    {!isVendor && (
                      <td>
                        <span className="font-semibold text-gray-800">{inv.vendor?.companyName}</span>
                      </td>
                    )}
                    <td className="text-right font-bold text-gray-900">
                      ₹{inv.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="text-gray-600">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="text-gray-600">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${
                        inv.status === 'paid' ? 'badge-success' :
                        inv.status === 'overdue' ? 'badge-danger' :
                        inv.status === 'sent' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-center">
                        <button
                          onClick={() => navigate(`/invoices/${inv._id}`)}
                          className="btn-ghost p-1.5 rounded hover:bg-slate-100 text-gray-600 hover:text-gray-900 flex items-center gap-1 text-xs"
                        >
                          Details <ArrowRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isVendor ? '7' : '8'} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert size={24} className="text-gray-300" />
                      <span>No invoices generated yet.</span>
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
