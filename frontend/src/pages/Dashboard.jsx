import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  TrendingUp,
  FileText,
  CheckCircle,
  Building2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  DollarSign
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
import toast from 'react-hot-toast';

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#dc2626', '#8b5cf6', '#6b7280'];

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/reports/dashboard');
        setData(res.data.dashboard);
      } catch (err) {
        toast.error('Failed to load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling statistics…</span>
      </div>
    );
  }

  const kpis = data?.kpis || {
    activeRFQs: 0,
    pendingApprovals: 0,
    posThisMonth: 0,
    poValueThisMonth: 0,
    totalInvoices: 0,
    overdueInvoices: 0
  };

  const isVendor = hasRole('vendor');

  // Map monthly spend data to human readable months
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedSpend = (data?.spendByMonth || []).map(item => ({
    name: months[item.month - 1] || `${item.month}`,
    amount: item.totalSpend
  }));

  const rfqPieData = (data?.rfqStatusDist || []).map(item => ({
    name: item._id.toUpperCase().replace('_', ' '),
    value: item.count
  }));

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-sm text-gray-500">
            Here is what's happening with VendorBridge today.
          </p>
        </div>
        {!isVendor && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/rfqs/new')}
              className="btn btn-primary"
            >
              Create RFQ
            </button>
            <button
              onClick={() => navigate('/vendors/new')}
              className="btn btn-outline"
            >
              Onboard Vendor
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isVendor ? (
          <>
            <div className="card p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Assignments</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{kpis.activeRFQs}</h3>
              </div>
              <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
                <FileText size={20} />
              </div>
            </div>
            <div className="card p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">POs Awaiting Action</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{kpis.posThisMonth}</h3>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <Clock size={20} />
              </div>
            </div>
            <div className="card p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Invoices</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalInvoices}</h3>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                <CheckCircle size={20} />
              </div>
            </div>
            <div className="card p-5 flex items-center justify-between border-l-4 border-red-500">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overdue Invoices</span>
                <h3 className="text-2xl font-bold text-red-600 mt-1">{kpis.overdueInvoices}</h3>
              </div>
              <div className="p-3 rounded-xl bg-red-50 text-red-600">
                <AlertCircle size={20} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active RFQs</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{kpis.activeRFQs}</h3>
              </div>
              <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
                <FileText size={20} />
              </div>
            </div>
            <div className="card p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Approvals</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{kpis.pendingApprovals}</h3>
              </div>
              <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                <Clock size={20} />
              </div>
            </div>
            <div className="card p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Monthly Spend</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{kpis.poValueThisMonth.toLocaleString('en-IN')}</h3>
                <span className="text-[10px] text-gray-400">{kpis.posThisMonth} POs created this month</span>
              </div>
              <div className="p-3 rounded-xl bg-green-50 text-green-600">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="card p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overdue Invoices</span>
                <h3 className="text-2xl font-bold text-red-600 mt-1">{kpis.overdueInvoices}</h3>
                <span className="text-[10px] text-gray-400">Out of {kpis.totalInvoices} total invoices</span>
              </div>
              <div className="p-3 rounded-xl bg-red-50 text-red-600">
                <AlertCircle size={20} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Visual Charts section */}
      {!isVendor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Spend Chart */}
          <div className="card p-5 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Spending Trend</h3>
                <p className="text-xs text-gray-400">Total Purchase Order value over the last 6 months</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <TrendingUp size={12} />
                Spend Analytics
              </span>
            </div>
            <div className="h-64">
              {formattedSpend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedSpend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff' }}
                      formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Spend']}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">No transaction data available yet.</div>
              )}
            </div>
          </div>

          {/* RFQ Status Distribution */}
          <div className="card p-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">RFQ Status Distribution</h3>
              <p className="text-xs text-gray-400">Active sourcing activities</p>
            </div>
            <div className="h-48 flex items-center justify-center relative">
              {rfqPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rfqPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {rfqPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'RFQs']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-400">No RFQs recorded.</div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
              {rfqPieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate text-gray-500 font-medium">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recents Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchase Orders */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Recent Purchase Orders</h3>
            <button
              onClick={() => navigate('/purchase-orders')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
            >
              View All <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {data?.recentPOs?.length > 0 ? (
              data.recentPOs.map(po => (
                <div
                  key={po._id}
                  onClick={() => navigate(`/purchase-orders/${po._id}`)}
                  className="flex items-center justify-between py-3 hover:bg-gray-50/50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{po.poNumber}</h4>
                    <p className="text-xs text-gray-400">{po.vendor?.companyName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">₹{po.totalAmount.toLocaleString('en-IN')}</span>
                    <div className="mt-1">
                      <span className={`badge ${
                        po.status === 'completed' ? 'badge-success' :
                        po.status === 'cancelled' ? 'badge-danger' :
                        po.status === 'sent' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {po.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-gray-400">No Purchase Orders found.</div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Recent Invoices</h3>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
            >
              View All <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {data?.recentInvoices?.length > 0 ? (
              data.recentInvoices.map(inv => (
                <div
                  key={inv._id}
                  onClick={() => navigate(`/invoices/${inv._id}`)}
                  className="flex items-center justify-between py-3 hover:bg-gray-50/50 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</h4>
                    <p className="text-xs text-gray-400">{inv.vendor?.companyName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">₹{inv.totalAmount.toLocaleString('en-IN')}</span>
                    <div className="mt-1">
                      <span className={`badge ${
                        inv.status === 'paid' ? 'badge-success' :
                        inv.status === 'overdue' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-gray-400">No Invoices found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
