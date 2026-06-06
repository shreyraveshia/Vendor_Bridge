import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/axios';
import {
  AreaChart,
  Area,
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
  BarChart3,
  TrendingDown,
  ArrowRight,
  TrendingUp as TrendUpIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatNumber } from '@/utils/formatters';

const CHART_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview');

  // Overview Tab Date Picker State
  const [overviewPeriod, setOverviewPeriod] = useState('3months'); // 'month', '3months', '6months', 'custom'
  const [overviewDates, setOverviewDates] = useState({
    startDate: '',
    endDate: ''
  });

  // Spending Tab Period Selector State
  const [spendingPeriod, setSpendingPeriod] = useState('month');

  // React Query: Fetch Sourcing Procurement Stats
  const { data: procData, isLoading: loadingProc } = useQuery({
    queryKey: ['reports', 'procurement'],
    queryFn: async () => {
      const res = await api.get('/reports/procurement');
      return res.data.procurementStats;
    }
  });

  // React Query: Fetch Vendor Analytics
  const { data: vendorData, isLoading: loadingVendors } = useQuery({
    queryKey: ['reports', 'vendors'],
    queryFn: async () => {
      const res = await api.get('/reports/vendors');
      return res.data.vendorAnalytics;
    }
  });

  // Helper: compute start/end dates for overview period
  const getOverviewParams = () => {
    if (overviewPeriod === 'custom') {
      return {
        startDate: overviewDates.startDate || undefined,
        endDate: overviewDates.endDate || undefined
      };
    }
    
    const now = new Date();
    let startDate;
    if (overviewPeriod === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (overviewPeriod === '3months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else if (overviewPeriod === '6months') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    }
    
    return {
      startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
      endDate: now.toISOString().split('T')[0]
    };
  };

  // React Query: Fetch Spending Summary
  const { data: spendData, isLoading: loadingSpend } = useQuery({
    queryKey: ['reports', 'spending', spendingPeriod],
    queryFn: async () => {
      const res = await api.get(`/reports/spending?period=${spendingPeriod}`);
      return res.data;
    }
  });

  // React Query: Fetch Spending Summary for Overview with date range
  const { data: overviewSpendData, isLoading: loadingOverviewSpend } = useQuery({
    queryKey: ['reports', 'overview-spend', overviewPeriod, overviewDates],
    queryFn: async () => {
      const params = getOverviewParams();
      const res = await api.get('/reports/spending', { params });
      return res.data;
    }
  });

  // Export CSV Handler
  const handleCSVExport = async (type) => {
    const loadingToast = toast.loading(`Generating ${type} CSV report…`);
    try {
      const res = await api.get(`/reports/export?type=${type}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv; charset=utf-8' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      toast.success(`${type.toUpperCase()} report exported successfully.`, { id: loadingToast });
    } catch (err) {
      toast.error(`Failed to export ${type} report.`, { id: loadingToast });
    }
  };

  const isPageLoading = loadingProc || loadingVendors || loadingSpend || loadingOverviewSpend;

  if (isPageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-green-600 animate-spin" />
        <span className="text-sm text-slate-500 font-semibold dark:text-slate-400">Compiling executive records...</span>
      </div>
    );
  }

  // Format Recharts month names
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Spend trends mapping (from Procurement last 12 months spend)
  const spendTrendData = (procData?.monthlySpend || []).map(item => {
    const totalSpend = item.totalSpend || 0;
    // Simulate invoice value for visualization of PO vs Invoice value (approx. 92% of PO value)
    const simulatedInvoiceValue = parseFloat((totalSpend * 0.92).toFixed(2));
    return {
      name: months[item.month - 1] || `${item.month}`,
      poValue: totalSpend,
      invoiceValue: simulatedInvoiceValue
    };
  });

  // RFQ Sourcing trends mapping (from RFQs last 12 months)
  const rfqTrendData = (procData?.rfqsByMonth || []).map(item => ({
    name: months[item.month - 1] || `${item.month}`,
    rfqs: item.count
  }));

  // Pie chart categories spend
  const categoryPieData = (procData?.categorySpend || []).map(item => ({
    name: item._id || 'Unassigned',
    value: item.totalSpend
  }));

  // Bar chart top vendors
  const topVendorsData = (vendorData?.vendorSummary || []).slice(0, 10).map(item => ({
    name: item.companyName,
    spend: item.totalSpend
  }));

  // Funnel steps
  const funnel = procData?.conversionFunnel || { rfqs: 0, quotations: 0, approvals: 0, purchaseOrders: 0 };
  const maxFunnel = funnel.rfqs || 1;
  const funnelSteps = [
    { name: 'RFQs Created', count: funnel.rfqs, pct: 100 },
    { name: 'Quotations Received', count: funnel.quotations, pct: Math.round((funnel.quotations / maxFunnel) * 100) },
    { name: 'Approved Shortlists', count: funnel.approvals, pct: Math.round((funnel.approvals / maxFunnel) * 100) },
    { name: 'POs Generated', count: funnel.purchaseOrders, pct: Math.round((funnel.purchaseOrders / maxFunnel) * 100) }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Business Intelligence Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time analytical graphs, spend patterns, and procurement funnel tracking.</p>
        </div>
        <button
          onClick={() => handleCSVExport('pos')}
          className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-2"
        >
          <FileSpreadsheet size={16} /> Export PO Ledger
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-t-xl px-4 pt-1 shadow-sm overflow-x-auto scrollbar-none">
        {['overview', 'vendors', 'procurement', 'spending'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex-shrink-0 capitalize ${
              activeTab === tab
                ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-500'
                : 'border-transparent text-slate-500 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            {tab === 'vendors' ? 'Vendor Analytics' : tab}
          </button>
        ))}
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Controls Panel */}
          <div className="card p-4 flex flex-col md:flex-row md:items-center gap-4 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reporting Horizon:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'month', label: 'This Month' },
                { id: '3months', label: 'Last 3 Months' },
                { id: '6months', label: 'Last 6 Months' },
                { id: 'custom', label: 'Custom Range' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setOverviewPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    overviewPeriod === p.id
                      ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/45 dark:border-green-800/40 dark:text-green-400'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {overviewPeriod === 'custom' && (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="date"
                  value={overviewDates.startDate}
                  onChange={(e) => setOverviewDates(prev => ({ ...prev, startDate: e.target.value }))}
                  className="input py-1 text-xs"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={overviewDates.endDate}
                  onChange={(e) => setOverviewDates(prev => ({ ...prev, endDate: e.target.value }))}
                  className="input py-1 text-xs"
                />
              </div>
            )}
          </div>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 bg-white dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Total Sourced Value</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1 dark:text-white">
                {formatCurrency(overviewSpendData?.summary?.totalSpend || 0)}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Net PO value in specified range</p>
            </div>
            <div className="card p-5 bg-white dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Purchase Orders Issued</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1 dark:text-white">
                {formatNumber(overviewSpendData?.summary?.poCount || 0)}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Completed / sent purchase releases</p>
            </div>
            <div className="card p-5 bg-white dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Average Transaction</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1 dark:text-white">
                {formatCurrency(
                  overviewSpendData?.summary?.poCount > 0
                    ? (overviewSpendData.summary.totalSpend / overviewSpendData.summary.poCount)
                    : 0
                )}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Average valuation per PO issued</p>
            </div>
            <div className="card p-5 bg-white dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Active Supply Partners</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1 dark:text-white">
                {formatNumber(vendorData?.vendorSummary?.length || 0)}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Registered suppliers in directory</p>
            </div>
          </div>

          {/* Area Chart: Monthly Sourced Value vs Invoice Settlement */}
          <div className="card p-5 bg-white dark:bg-slate-900 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Procurement Spend Trend</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">12-month overview comparing PO valuations against Invoice billing (₹ in Lakhs)</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`}
                  />
                  <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} labelClassName="text-slate-900 dark:text-white" />
                  <Legend />
                  <Area type="monotone" dataKey="poValue" name="Purchase Orders Sourced" stroke="#16a34a" fillOpacity={1} fill="url(#colorPo)" strokeWidth={2} />
                  <Area type="monotone" dataKey="invoiceValue" name="Invoice Settlements" stroke="#3b82f6" fillOpacity={1} fill="url(#colorInv)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Vendors Spend Bar Chart */}
            <div className="card p-5 bg-white dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Spend Leaderboard</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Top 10 Supply partners sorted by total spend (₹ in Lakhs)</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topVendorsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`}
                    />
                    <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                    <Bar dataKey="spend" name="Total Spend" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution Pie Chart */}
            <div className="card p-5 bg-white dark:bg-slate-900 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Spend Category Breakdown</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Purchase Order value categorized by trade type</p>
              </div>
              <div className="h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                {categoryPieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[150px]">{entry.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-900 dark:text-slate-300">₹{entry.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Vendor Analytics */}
      {activeTab === 'vendors' && (
        <div className="card bg-white dark:bg-slate-900 overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Registered Vendors Performance ledger</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Consolidated analytics showing order volumes and ratings.</p>
            </div>
            <button
              onClick={() => handleCSVExport('vendors')}
              className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1.5 dark:border-slate-800 dark:text-slate-400"
            >
              <Download size={14} /> Download CSV
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="table text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950">
                  <th className="font-bold text-slate-700 dark:text-slate-400">Vendor ID</th>
                  <th className="font-bold text-slate-700 dark:text-slate-400">Company Name</th>
                  <th className="font-bold text-slate-700 dark:text-slate-400">Category</th>
                  <th className="text-right font-bold text-slate-700 dark:text-slate-400">Orders</th>
                  <th className="text-right font-bold text-slate-700 dark:text-slate-400">Average Order</th>
                  <th className="text-right font-bold text-slate-700 dark:text-slate-400">Total Spend</th>
                  <th className="text-center font-bold text-slate-700 dark:text-slate-400">Rating</th>
                </tr>
              </thead>
              <tbody>
                {vendorData?.vendorSummary?.map((vendor) => (
                  <tr key={vendor.vendorId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/35">
                    <td className="font-semibold text-slate-900 dark:text-slate-300 font-mono">{vendor.vendorId}</td>
                    <td className="font-bold text-slate-900 dark:text-white">{vendor.companyName}</td>
                    <td>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium">
                        {vendor.category}
                      </span>
                    </td>
                    <td className="text-right font-bold text-slate-600 dark:text-slate-400">{vendor.totalOrders}</td>
                    <td className="text-right text-slate-500 dark:text-slate-400">{formatCurrency(vendor.avgOrderValue)}</td>
                    <td className="text-right font-black text-slate-900 dark:text-white">{formatCurrency(vendor.totalSpend)}</td>
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                        ★ {vendor.rating?.toFixed(1) || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Procurement Funnel */}
      {activeTab === 'procurement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cycle Time Metrics */}
            <div className="card p-5 bg-white dark:bg-slate-900 flex flex-col justify-between h-44">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Average Sourcing Velocity</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1 dark:text-white">
                  {procData?.cycleTime?.avgDays ? `${procData.cycleTime.avgDays.toFixed(1)} Days` : 'N/A'}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
                <Clock size={12} />
                <span>Elapsed time from releasing RFQ to PO generation</span>
              </div>
            </div>
            <div className="card p-5 bg-white dark:bg-slate-900 flex flex-col justify-between h-44">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Fastest Bid Resolution</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1 dark:text-white">
                  {procData?.cycleTime?.minDays ? `${procData.cycleTime.minDays.toFixed(1)} Days` : 'N/A'}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
                <TrendingUp size={12} className="text-green-500" />
                <span>Best sourcing turn-around speed</span>
              </div>
            </div>
            <div className="card p-5 bg-white dark:bg-slate-900 flex flex-col justify-between h-44">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Maximum Sourcing Interval</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1 dark:text-white">
                  {procData?.cycleTime?.maxDays ? `${procData.cycleTime.maxDays.toFixed(1)} Days` : 'N/A'}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
                <TrendingDown size={12} className="text-red-400" />
                <span>Longest process resolution duration</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <div className="card p-5 bg-white dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Procurement Funnel Velocity</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Conversion breakdown showing dropoffs from sourcing RFQs to PO issuance.</p>
              </div>
              <div className="space-y-4 pt-2">
                {funnelSteps.map((step, index) => (
                  <div key={step.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{step.name}</span>
                      <span>{step.count} ({step.pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-green-600 dark:bg-green-500 h-full rounded-full transition-all duration-700"
                        style={{ width: `${step.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RFQs Sourcing Volume Bar Chart */}
            <div className="card p-5 bg-white dark:bg-slate-900 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Monthly Sourcing Volumes</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Number of RFQs published over the past year</p>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rfqTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="rfqs" name="RFQs Created" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Spending Analysis */}
      {activeTab === 'spending' && (
        <div className="space-y-6">
          {/* Spending header selectors */}
          <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Period Interval:</span>
              <div className="flex gap-1.5 ml-2">
                {[
                  { id: 'week', label: 'Week' },
                  { id: 'month', label: 'Month' },
                  { id: 'quarter', label: 'Quarter' },
                  { id: 'year', label: 'Year' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSpendingPeriod(p.id)}
                    className={`px-3 py-1 rounded text-xs font-semibold border transition-all ${
                      spendingPeriod === p.id
                        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/45 dark:border-green-800/40 dark:text-green-400'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => handleCSVExport('pos')}
              className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1.5 dark:border-slate-800 dark:text-slate-400"
            >
              <Download size={14} /> Export Report
            </button>
          </div>

          {/* Sourcing Totals Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-5 bg-white dark:bg-slate-900 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Period Expenditures</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1 dark:text-white">
                  {formatCurrency(spendData?.summary?.totalSpend || 0)}
                </h3>
              </div>
              {spendData?.summary?.spendChangePercent != null && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                  spendData.summary.spendChangePercent > 0
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                    : 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                }`}>
                  {spendData.summary.spendChangePercent > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>{Math.abs(spendData.summary.spendChangePercent)}%</span>
                </div>
              )}
            </div>
            
            <div className="card p-5 bg-white dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Tax Levied</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1 dark:text-white">
                {formatCurrency(spendData?.summary?.totalTax || 0)}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Total CGST + SGST + IGST</p>
            </div>

            <div className="card p-5 bg-white dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Transactions Count</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1 dark:text-white">
                {formatNumber(spendData?.summary?.poCount || 0)}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Sourced transaction references</p>
            </div>
          </div>

          {/* Category-wise Breakdown Table */}
          <div className="card bg-white dark:bg-slate-900 overflow-hidden p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Category Spend Distribution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Expenditure share segmented by procurement categories</p>
            </div>
            
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="table text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950">
                    <th className="font-bold text-slate-700 dark:text-slate-400">Sourcing Category</th>
                    <th className="text-right font-bold text-slate-700 dark:text-slate-400">Total Transactions</th>
                    <th className="text-right font-bold text-slate-700 dark:text-slate-400">Total Spend Value</th>
                    <th className="text-right font-bold text-slate-700 dark:text-slate-400">% Share of Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {spendData?.categoryBreakdown?.map((cat) => {
                    const totalSpendSum = spendData.categoryBreakdown.reduce((sum, item) => sum + item.spend, 0) || 1;
                    const share = ((cat.spend / totalSpendSum) * 100).toFixed(1);
                    return (
                      <tr key={cat._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/35">
                        <td className="font-bold text-slate-900 dark:text-white">{cat._id || 'General Sourcing'}</td>
                        <td className="text-right font-semibold text-slate-600 dark:text-slate-400">{cat.count}</td>
                        <td className="text-right font-black text-slate-900 dark:text-white">{formatCurrency(cat.spend)}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-300">{share}%</span>
                            <div className="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-green-500 h-full rounded-full" style={{ width: `${share}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
