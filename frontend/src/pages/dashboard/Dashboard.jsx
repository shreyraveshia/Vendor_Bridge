import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  FileText,
  Clock,
  ShoppingCart,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  BarChart2,
  Users,
  Database,
  Send,
  Building,
  CheckCircle,
  FolderOpen
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { SkeletonCard, SkeletonTable, SkeletonText } from '@/components/shared/SkeletonLoader';
import StatusBadge from '@/components/shared/StatusBadge';
import toast from 'react-hot-toast';

const PIE_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#dc2626', '#8b5cf6', '#6b7280'];

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isManager = hasRole('manager');
  const isAdmin = hasRole('admin');
  const isProcurement = hasRole('procurement_officer');
  const isVendor = hasRole('vendor');

  // React Query Fetch
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard');
      return res.data.dashboard;
    },
    refetchInterval: 60000 // Refetch every 1 minute
  });

  // Database seed mutation (Admin only)
  const seedMutation = useMutation({
    mutationFn: async () => {
      return await api.post('/seed');
    },
    onMutate: () => {
      toast.loading('Resetting and seeding demo database…', { id: 'seed' });
    },
    onSuccess: () => {
      toast.success('Database seeded successfully!', { id: 'seed' });
      queryClient.invalidateQueries(['dashboard']);
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to seed database.';
      toast.error(msg, { id: 'seed' });
    }
  });

  if (isError) {
    return (
      <div className="card p-6 max-w-md mx-auto text-center space-y-4 my-12">
        <AlertCircle className="mx-auto text-red-500" size={40} />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Failed to load Dashboard</h3>
        <p className="text-xs text-gray-500">The server encountered an error while aggregating sourcing statistics.</p>
        <button onClick={() => queryClient.invalidateQueries(['dashboard'])} className="btn btn-primary">
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const recentPOs = data?.recentPOs || [];
  const topVendors = data?.topVendors || [];

  // Monthly spend mapping
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const spendData = (data?.spendByMonth || []).map(item => ({
    name: months[item.month - 1] || `${item.month}`,
    amount: item.totalSpend
  }));

  // RFQ status distribution
  const rfqPieData = (data?.rfqStatusDist || []).map(item => ({
    name: item._id.toUpperCase().replace('_', ' '),
    value: item.count
  }));

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* 1. Greeting Banner */}
      <div className="card bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg md:text-xl font-extrabold tracking-tight">
              Welcome back, {user?.firstName}!
            </h2>
            <span className="bg-green-500/20 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-green-500/20 capitalize">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Here's your procurement overview for today.
          </p>
        </div>
        <div className="text-right text-xs text-slate-400 font-semibold md:border-l md:border-white/10 md:pl-6">
          <span className="block text-[10px] uppercase tracking-wider">Current Session</span>
          <span className="text-white mt-1 block">{currentDate}</span>
        </div>
      </div>

      {/* 2. KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => <SkeletonCard key={idx} height="100px" />)
        ) : (
          <>
            {/* Active RFQs */}
            <div className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Active RFQs</span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {kpis.activeRFQs || 0}
                </h3>
                <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5">
                  <TrendingUp size={12} className="text-green-500" /> Active sourcing bids
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                <FileText size={22} />
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Pending Approvals</span>
                <h3 className={`text-2xl font-black mt-1 ${kpis.pendingApprovals > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {kpis.pendingApprovals || 0}
                </h3>
                <span className="text-[10px] text-gray-400 mt-1">
                  {kpis.pendingApprovals > 0 ? 'Requires immediate action' : 'All steps cleared'}
                </span>
              </div>
              <div className={`p-3 rounded-xl ${
                kpis.pendingApprovals > 0
                  ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
              }`}>
                <Clock size={22} />
              </div>
            </div>

            {/* Total POs this month */}
            <div className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">POs This Month</span>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {kpis.posThisMonth || 0}
                </h3>
                <span className="text-[10px] text-gray-400 mt-1">
                  Valued at ₹{(kpis.poValueThisMonth || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400">
                <ShoppingCart size={22} />
              </div>
            </div>

            {/* Overdue Invoices */}
            <div className="card p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Overdue Invoices</span>
                <h3 className={`text-2xl font-black mt-1 ${kpis.overdueInvoices > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {kpis.overdueInvoices || 0}
                </h3>
                <span className="text-[10px] text-gray-400 mt-1">
                  {kpis.overdueInvoices > 0 ? 'Unpaid past due date' : 'Healthy aging ledger'}
                </span>
              </div>
              <div className={`p-3 rounded-xl ${
                kpis.overdueInvoices > 0
                  ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}>
                <AlertCircle size={22} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly spend AreaChart */}
        <div className="card p-5 lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Procurement Spend Trend</h3>
            <p className="text-xs text-gray-400">Net monthly Purchase Order values (in Lakhs INR)</p>
          </div>
          <div className="h-64">
            {isLoading ? (
              <SkeletonCard height="240px" />
            ) : spendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff' }}
                    formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Total Spend']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorSpendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 gap-1.5">
                <FolderOpen size={24} className="text-gray-300" />
                <span>No transaction records found to render.</span>
              </div>
            )}
          </div>
        </div>

        {/* RFQ Status PieChart */}
        <div className="card p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">RFQ Status Distribution</h3>
            <p className="text-xs text-gray-400">Breakdown of sourcing requirements</p>
          </div>
          <div className="h-44 flex items-center justify-center relative">
            {isLoading ? (
              <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-slate-300 animate-spin" />
            ) : rfqPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rfqPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                    {rfqPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => [v, 'RFQs']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-gray-400">No active RFQs.</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-gray-50 dark:border-gray-800">
            {rfqPieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="truncate text-gray-500 font-semibold capitalize">{entry.name.toLowerCase()} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Table and 5. Pending approvals widgets row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Purchase Orders Table */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Recent Purchase Orders</h3>
            <button onClick={() => navigate('/purchase-orders')} className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-0.5">
              PO Register <ArrowRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            {isLoading ? (
              <SkeletonTable rows={5} />
            ) : recentPOs.length > 0 ? (
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th className="text-right">Grand Total</th>
                    <th>Issue Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPOs.map(po => (
                    <tr key={po._id} onClick={() => navigate(`/purchase-orders/${po._id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer">
                      <td className="font-bold text-gray-900 dark:text-white">{po.poNumber}</td>
                      <td className="font-semibold text-gray-700 dark:text-slate-300">{po.vendor?.companyName}</td>
                      <td className="text-right font-extrabold text-gray-900 dark:text-white">₹{po.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="text-gray-500">{new Date(po.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <StatusBadge status={po.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-xs text-gray-400">No Purchase Orders generated.</div>
            )}
          </div>
        </div>

        {/* 5. Pending Approvals Widget (Manager / Admin only) */}
        {(isManager || isAdmin) && (
          <div className="card p-5 space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Pending Approvals</h3>
              <button onClick={() => navigate('/approvals')} className="text-xs font-bold text-primary-600 hover:underline">
                Approvals Queue
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-60 scrollbar-thin">
              {isLoading ? (
                <SkeletonText lines={5} />
              ) : kpis.pendingApprovals > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/20 rounded-xl flex items-center gap-2.5 text-xs text-red-700 dark:text-red-400">
                    <Clock size={16} />
                    <span>You have <strong>{kpis.pendingApprovals}</strong> approval tasks requiring sign-off.</span>
                  </div>
                  <button
                    onClick={() => navigate('/approvals')}
                    className="btn btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                  >
                    Review Queue <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 flex items-center justify-center shadow-inner">
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 dark:text-white">All caught up!</h4>
                    <p className="text-[10px] text-gray-400">No pending approvals are assigned to you.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Quick Actions Bar and 7. Top Vendors Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 card p-5 space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-2">Quick Operations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isProcurement && (
              <>
                <button onClick={() => navigate('/rfq/new')} className="btn btn-outline border-slate-200 dark:border-slate-800 py-3 text-xs flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Plus size={16} className="text-primary-600" /> New Sourcing RFQ
                </button>
                <button onClick={() => navigate('/vendors/new')} className="btn btn-outline border-slate-200 dark:border-slate-800 py-3 text-xs flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Building size={16} className="text-blue-600" /> Onboard Supplier
                </button>
                <button onClick={() => navigate('/rfq')} className="btn btn-outline border-slate-200 dark:border-slate-800 py-3 text-xs flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300">
                  <BarChart2 size={16} className="text-green-600" /> Compare Quotes
                </button>
              </>
            )}

            {isManager && (
              <>
                <button onClick={() => navigate('/approvals')} className="btn btn-outline border-slate-200 dark:border-slate-800 py-3 text-xs flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Clock size={16} className="text-amber-500" /> Approvals ({kpis.pendingApprovals || 0})
                </button>
                <button onClick={() => navigate('/reports')} className="btn btn-outline border-slate-200 dark:border-slate-800 py-3 text-xs flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300">
                  <BarChart2 size={16} className="text-primary-600" /> Sourcing Reports
                </button>
              </>
            )}

            {isVendor && (
              <>
                <button onClick={() => navigate('/rfq')} className="btn btn-outline border-slate-200 dark:border-slate-800 py-3 text-xs flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Send size={16} className="text-primary-600" /> Submit Quotation
                </button>
                <button onClick={() => navigate('/quotations')} className="btn btn-outline border-slate-200 dark:border-slate-800 py-3 text-xs flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300">
                  <FileText size={16} className="text-blue-600" /> My Quotations
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <button onClick={() => navigate('/admin')} className="btn btn-outline border-slate-200 dark:border-slate-800 py-3 text-xs flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Users size={16} className="text-primary-600" /> User Permissions
                </button>
                <button onClick={() => navigate('/reports')} className="btn btn-outline border-slate-200 dark:border-slate-800 py-3 text-xs flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300">
                  <BarChart2 size={16} className="text-blue-600" /> Sourcing Reports
                </button>
                <button
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  className="btn btn-outline border-slate-200 dark:border-slate-800 py-3 text-xs flex flex-col items-center gap-2 text-slate-700 dark:text-slate-300 disabled:opacity-50"
                >
                  <Database size={16} className="text-amber-500" /> Seed Database
                </button>
              </>
            )}
          </div>
        </div>

        {/* 7. Top Vendors Widget */}
        <div className="card p-5 space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-2">Top Vendors</h3>
          <div className="space-y-3.5">
            {isLoading ? (
              <SkeletonText lines={5} />
            ) : topVendors.length > 0 ? (
              topVendors.map((vendor, index) => {
                const maxSpend = topVendors[0]?.totalSpend || 1;
                const spendPercentage = Math.round((vendor.totalSpend / maxSpend) * 100);
                return (
                  <div key={vendor._id} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-semibold text-gray-800 dark:text-gray-200">
                      <span className="truncate max-w-[150px]">{index + 1}. {vendor.companyName}</span>
                      <span className="font-extrabold text-gray-900 dark:text-white">₹{vendor.totalSpend.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-green-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${spendPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 font-medium">
                      <span>Category: {vendor.category}</span>
                      <span>Orders count: {vendor.totalOrders || 0}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 italic">No vendor summaries found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
