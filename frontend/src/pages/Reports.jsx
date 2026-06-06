import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Filter,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('procurement');
  const [procStats, setProcStats] = useState(null);
  const [vendorStats, setVendorStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdminOrProc = hasRole('admin', 'procurement_officer');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [procRes, vendorRes] = await Promise.all([
          api.get('/reports/procurement'),
          api.get('/reports/vendors')
        ]);
        setProcStats(procRes.data.procurementStats);
        setVendorStats(vendorRes.data.vendorAnalytics);
      } catch (err) {
        toast.error('Failed to load reporting analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleCSVExport = async (type) => {
    const loadingToast = toast.loading(`Assembling ${type} CSV report…`);
    try {
      const res = await api.get(`/reports/export?type=${type}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv; charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      toast.success(`${type.toUpperCase()} report downloaded successfully.`, { id: loadingToast });
    } catch (err) {
      toast.error(`Failed to export ${type} report.`, { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling executive dashboards…</span>
      </div>
    );
  }

  // Formatting Recharts datasets
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const spendTrend = (procStats?.monthlySpend || []).map(item => ({
    name: months[item.month - 1] || `${item.month}`,
    spend: item.totalSpend,
    tax: item.totalTax
  }));

  const categoryPie = (procStats?.categorySpend || []).map(item => ({
    name: item._id || 'Unassigned',
    value: item.totalSpend
  }));

  const funnel = procStats?.conversionFunnel || { rfqs: 0, quotations: 0, approvals: 0, purchaseOrders: 0 };
  const funnelData = [
    { name: 'RFQs Published', count: funnel.rfqs },
    { name: 'Quotations Received', count: funnel.quotations },
    { name: 'Quotations Approved', count: funnel.approvals },
    { name: 'POs Triggered', count: funnel.purchaseOrders }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Executive Analytics</h1>
        <p className="text-sm text-gray-500">Monitor procurement velocity, spend analytics, and compliance audits.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white rounded-t-xl px-4 pt-1 shadow-sm">
        <button
          onClick={() => setActiveTab('procurement')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'procurement' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <TrendingUp size={16} /> Spend & Procurement
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'vendors' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Award size={16} /> Supplier Performance
        </button>
        {isAdminOrProc && (
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'export' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileSpreadsheet size={16} /> CSV Exports
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {/* 1. Procurement Panel */}
      <div className={`space-y-6 rounded-t-none ${activeTab === 'procurement' ? 'block' : 'hidden'}`}>
        {/* KPI metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Sourcing Cycle</span>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {procStats?.cycleTime?.avgDays ? `${procStats.cycleTime.avgDays.toFixed(1)} Days` : 'N/A'}
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">RFQ release to PO generation</p>
            </div>
            <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
              <Clock size={20} />
            </div>
          </div>
          <div className="card p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fastest Signoff</span>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {procStats?.cycleTime?.minDays ? `${procStats.cycleTime.minDays.toFixed(1)} Days` : 'N/A'}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="card p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sourcing Success</span>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {funnel.rfqs > 0 ? `${Math.round((funnel.purchaseOrders / funnel.rfqs) * 100)}%` : '0%'}
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">PO issuance completion rate</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 text-green-600">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spend trend chart */}
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Procurement Spend Trend</h3>
              <p className="text-xs text-gray-400">Total Purchase Order and Tax valuations over the year</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spendTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(1)}L`} />
                  <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                  <Legend />
                  <Bar dataKey="spend" name="Net PO Value" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tax" name="Taxes Applied" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sourcing funnel */}
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Procurement Conversion Funnel</h3>
              <p className="text-xs text-gray-400">Conversion from RFQs to Purchase Orders</p>
            </div>
            <div className="space-y-4 pt-2">
              {funnelData.map((item, index) => {
                const maxVal = funnelData[0].count || 1;
                const pct = Math.round((item.count / maxVal) * 100) || 0;
                return (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                      <span>{item.name}</span>
                      <span>{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-primary-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Supplier Performance Panel */}
      <div className={`space-y-6 rounded-t-none ${activeTab === 'vendors' ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top rated leaderboard */}
          <div className="card p-5 lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Active Vendor Analytics</h3>
              <p className="text-xs text-gray-400">Orders distribution and total expenditures per vendor</p>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Vendor ID</th>
                    <th>Company Name</th>
                    <th>Category</th>
                    <th className="text-right">Orders</th>
                    <th className="text-right">Average Order</th>
                    <th className="text-right">Total spend</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorStats?.vendorSummary?.map(vendor => (
                    <tr key={vendor._id}>
                      <td className="font-semibold text-gray-900">{vendor.vendorId}</td>
                      <td className="font-bold text-gray-800">{vendor.companyName}</td>
                      <td>
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                          {vendor.category}
                        </span>
                      </td>
                      <td className="text-right font-semibold text-gray-700">{vendor.totalOrders}</td>
                      <td className="text-right text-gray-600">₹{Math.round(vendor.avgOrderValue || 0).toLocaleString('en-IN')}</td>
                      <td className="text-right font-extrabold text-gray-950">₹{vendor.totalSpend?.toLocaleString('en-IN') || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category-wise spend chart */}
          <div className="card p-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Category Spend Distribution</h3>
              <p className="text-xs text-gray-400">Total Purchase Order value categorized by trade type</p>
            </div>
            <div className="h-56 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 text-xs border-t border-gray-50 pt-3">
              {categoryPie.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-gray-500 font-medium truncate max-w-[130px]">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">₹{entry.value.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CSV Exports Panel */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 rounded-t-none ${activeTab === 'export' ? 'grid' : 'hidden'}`}>
        <div className="card p-6 flex flex-col justify-between items-start gap-4">
          <div className="space-y-2">
            <span className="p-3 rounded-xl bg-primary-50 text-primary-600 inline-block">
              <Award size={20} />
            </span>
            <h3 className="text-sm font-bold text-gray-900">Suppliers Register</h3>
            <p className="text-xs text-gray-400">Onboarded vendor profiles, contact details, rating scores, and compliance registration numbers.</p>
          </div>
          <button
            onClick={() => handleCSVExport('vendors')}
            className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1 w-full justify-center"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="card p-6 flex flex-col justify-between items-start gap-4">
          <div className="space-y-2">
            <span className="p-3 rounded-xl bg-blue-50 text-blue-600 inline-block">
              <Download size={20} />
            </span>
            <h3 className="text-sm font-bold text-gray-900">Sourcing RFQs</h3>
            <p className="text-xs text-gray-400">Sourcing titles, categories, priorities, deadlines, and quotation count details.</p>
          </div>
          <button
            onClick={() => handleCSVExport('rfqs')}
            className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1 w-full justify-center"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="card p-6 flex flex-col justify-between items-start gap-4">
          <div className="space-y-2">
            <span className="p-3 rounded-xl bg-orange-50 text-orange-600 inline-block">
              <TrendingUp size={20} />
            </span>
            <h3 className="text-sm font-bold text-gray-900">Purchase Orders</h3>
            <p className="text-xs text-gray-400">PO tracking registers mapping vendors, status, GST types, net, and grand totals.</p>
          </div>
          <button
            onClick={() => handleCSVExport('pos')}
            className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1 w-full justify-center"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="card p-6 flex flex-col justify-between items-start gap-4">
          <div className="space-y-2">
            <span className="p-3 rounded-xl bg-red-50 text-red-600 inline-block">
              <Download size={20} />
            </span>
            <h3 className="text-sm font-bold text-gray-900">Tax Invoices</h3>
            <p className="text-xs text-gray-400">Issued billing records containing subtotal, tax amounts, and final settlement statuses.</p>
          </div>
          <button
            onClick={() => handleCSVExport('invoices')}
            className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1 w-full justify-center"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>
    </div>
  );
}
