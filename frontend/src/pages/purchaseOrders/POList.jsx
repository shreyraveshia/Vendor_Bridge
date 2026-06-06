import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Search, Calendar, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function POList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const isVendor = hasRole('vendor');

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const res = await api.get('/purchase-orders');
        setPOs(res.data.purchaseOrders || res.data.pos || res.data);
      } catch (err) {
        toast.error('Failed to load Purchase Orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchPOs();
  }, []);

  const filteredPOs = pos.filter(po => {
    const matchesSearch = po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          po.vendor?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          po.rfq?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? po.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling purchase orders…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Purchase Orders (POs)</h1>
        <p className="text-sm text-gray-500">
          {isVendor ? 'Track your active contracts, deliveries and status transitions.' : 'Manage issued agreements, delivery fulfillments, and legal contracts.'}
        </p>
      </div>

      {/* Filters card */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by PO number, vendor, or RFQ title…"
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
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* PO Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>RFQ Sourcing Reference</th>
                {!isVendor && <th>Vendor</th>}
                <th className="text-right">Grand Total</th>
                <th>Expected Delivery</th>
                <th>Issued Date</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.length > 0 ? (
                filteredPOs.map(po => (
                  <tr key={po._id} className="hover:bg-gray-50/50">
                    <td className="font-semibold text-gray-900">{po.poNumber}</td>
                    <td>
                      <span className="font-medium text-gray-800 line-clamp-1">{po.rfq?.title}</span>
                    </td>
                    {!isVendor && (
                      <td>
                        <span className="font-semibold text-gray-800">{po.vendor?.companyName}</span>
                      </td>
                    )}
                    <td className="text-right font-bold text-gray-900">
                      ₹{po.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="text-gray-600">
                      {new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="text-gray-600">
                      {new Date(po.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${
                        po.status === 'completed' ? 'badge-success' :
                        po.status === 'cancelled' ? 'badge-danger' :
                        po.status === 'sent' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-center">
                        <button
                          onClick={() => navigate(`/purchase-orders/${po._id}`)}
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
                      <ShieldCheck size={24} className="text-gray-300" />
                      <span>No Purchase Orders logged yet.</span>
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
