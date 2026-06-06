import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Search, Calendar, FileText, ArrowRight, ShieldCheck, DollarSign, ShoppingBag, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '@/components/shared/StatusBadge';

export default function POList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isVendor = hasRole('vendor');

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const res = await api.get('/purchase-orders');
        setPOs(res.data.purchaseOrders || res.data.pos || res.data || []);
      } catch (err) {
        toast.error('Failed to load Purchase Orders.');
      } finally {
        setLoading(false);
      }
    };
    fetchPOs();
  }, []);

  // Compute stats on overall PO dataset
  const totalCount = pos.length;
  const totalSpend = pos.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
  const activeCount = pos.filter(po => ['sent', 'acknowledged', 'in_progress', 'delivered'].includes(po.status)).length;
  const completedCount = pos.filter(po => po.status === 'completed').length;

  // Extract unique vendors for dropdown filter
  const uniqueVendors = Array.from(
    new Map(
      pos.map(po => [po.vendor?._id, po.vendor]).filter(([id, vendor]) => id && vendor)
    ).values()
  );

  // Apply filters
  const filteredPOs = pos.filter(po => {
    const matchesSearch = po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          po.rfq?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          po.vendor?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter ? po.status === statusFilter : true;
    const matchesVendor = vendorFilter ? po.vendor?._id === vendorFilter : true;

    // Date range filters
    let matchesDate = true;
    const poDate = new Date(po.createdAt);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && poDate >= start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && poDate <= end;
    }

    return matchesSearch && matchesStatus && matchesVendor && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling purchase orders…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Purchase Orders (POs)</h1>
        <p className="text-sm text-gray-500">
          {isVendor ? 'Track your active contracts, deliveries and status transitions.' : 'Manage issued agreements, delivery fulfillments, and legal contracts.'}
        </p>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total POs</span>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">{totalCount}</h3>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            <ShoppingBag size={18} />
          </div>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active POs</span>
            <h3 className="text-xl font-black text-blue-600 dark:text-blue-500 mt-1">{activeCount}</h3>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-500">
            <Truck size={18} />
          </div>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</span>
            <h3 className="text-xl font-black text-green-600 dark:text-green-500 mt-1">{completedCount}</h3>
          </div>
          <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-500">
            <ShieldCheck size={18} />
          </div>
        </div>
        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Spend Value</span>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">₹{totalSpend.toLocaleString('en-IN')}</h3>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* Filters Form */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by PO number, vendor, or RFQ title…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 text-xs"
            />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-xs w-full sm:w-36"
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

            {!isVendor && (
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="input text-xs w-full sm:w-44"
              >
                <option value="">All Suppliers</option>
                {uniqueVendors.map(vendor => (
                  <option key={vendor._id} value={vendor._id}>
                    {vendor.companyName}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setVendorFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="btn btn-secondary py-2 text-xs w-full sm:w-auto sm:col-span-1"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50 dark:border-gray-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold uppercase text-[9px]">Issued From:</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input py-1.5 px-3 text-xs w-36" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold uppercase text-[9px]">To:</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input py-1.5 px-3 text-xs w-36" />
          </div>
        </div>
      </div>

      {/* PO Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table text-xs">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>RFQ Sourcing Reference</th>
                {!isVendor && <th>Vendor</th>}
                <th className="text-right">Grand Total</th>
                <th>Expected Delivery</th>
                <th>Issued Date</th>
                <th>Status</th>
                <th className="text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPOs.length > 0 ? (
                filteredPOs.map(po => (
                  <tr key={po._id} className="hover:bg-gray-50/50">
                    <td className="font-bold text-gray-900 dark:text-white">{po.poNumber}</td>
                    <td>
                      <span className="font-semibold text-gray-850 dark:text-slate-350 line-clamp-1">{po.rfq?.title}</span>
                    </td>
                    {!isVendor && (
                      <td>
                        <span className="font-semibold text-gray-800 dark:text-slate-200">{po.vendor?.companyName}</span>
                      </td>
                    )}
                    <td className="text-right font-extrabold text-gray-900 dark:text-white">
                      ₹{po.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="text-gray-600 dark:text-slate-400">
                      {new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="text-gray-600 dark:text-slate-400">
                      {new Date(po.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <StatusBadge status={po.status} />
                    </td>
                    <td>
                      <div className="flex justify-center">
                        <button
                          onClick={() => navigate(`/purchase-orders/${po._id}`)}
                          className="btn btn-secondary py-1.5 px-3 text-[10px] uppercase font-bold flex items-center gap-1"
                        >
                          Details <ArrowRight size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isVendor ? '7' : '8'} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck size={28} className="text-gray-300" />
                      <span>No Purchase Orders logged matching filter criteria.</span>
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
