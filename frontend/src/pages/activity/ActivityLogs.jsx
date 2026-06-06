import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  User
} from 'lucide-react';
import { formatDate, formatDateRelative } from '@/utils/formatters';

const MODULES = [
  { id: 'auth', label: 'Authentication' },
  { id: 'vendor', label: 'Vendors Profile' },
  { id: 'rfq', label: 'RFQs Sourcing' },
  { id: 'quotation', label: 'Bids & Quotations' },
  { id: 'approval', label: 'Approvals Workflow' },
  { id: 'purchase_order', label: 'Purchase Orders' },
  { id: 'invoice', label: 'Invoices & Settlement' }
];

export default function ActivityLogs() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  // Filters State
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch Users for Admin filter dropdown
  const { data: users } = useQuery({
    queryKey: ['admin', 'users-list'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.users || [];
    },
    enabled: isAdmin
  });

  // Fetch Activity Logs
  const { data: logData, isLoading } = useQuery({
    queryKey: ['activity-logs', page, moduleFilter, statusFilter, searchTerm, userFilter, startDate, endDate],
    queryFn: async () => {
      const endpoint = isAdmin ? '/activity-logs' : '/activity-logs/mine';
      const params = {
        page,
        limit: 15,
        module: moduleFilter || undefined,
        status: statusFilter || undefined,
        action: searchTerm || undefined,
        user: userFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
      const res = await api.get(endpoint, { params });
      return res.data;
    }
  });

  const logs = logData?.logs || [];
  const totalPages = logData?.pages || 1;

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Map module to indicator color dots and border colors
  const getModuleStyles = (mod) => {
    const m = String(mod || '').toLowerCase();
    switch (m) {
      case 'rfq':
        return { dot: 'bg-blue-500 ring-blue-500/30', text: 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950/45 dark:text-blue-400 dark:border-blue-800/30' };
      case 'invoice':
        return { dot: 'bg-green-500 ring-green-500/30', text: 'text-green-600 bg-green-50 border-green-100 dark:bg-green-950/45 dark:text-green-400 dark:border-green-800/30' };
      case 'approval':
        return { dot: 'bg-amber-500 ring-amber-500/30', text: 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/45 dark:text-amber-400 dark:border-amber-800/30' };
      case 'purchase_order':
      case 'purchaseorder':
        return { dot: 'bg-indigo-500 ring-indigo-500/30', text: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/45 dark:text-indigo-400 dark:border-indigo-800/30' };
      case 'vendor':
        return { dot: 'bg-purple-500 ring-purple-500/30', text: 'text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-950/45 dark:text-purple-400 dark:border-purple-800/30' };
      case 'auth':
        return { dot: 'bg-slate-400 ring-slate-400/30', text: 'text-slate-600 bg-slate-100 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/30' };
      default:
        return { dot: 'bg-slate-400 ring-slate-400/30', text: 'text-slate-600 bg-slate-100 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/30' };
    }
  };

  // Map entity link based on log
  const renderEntityLink = (log) => {
    if (!log.entityNumber || !log.entityId) return null;
    
    let path = '';
    const type = String(log.entityType || '').toLowerCase();
    switch (type) {
      case 'rfq':
        path = `/rfq/${log.entityId}`;
        break;
      case 'purchaseorder':
        path = `/purchase-orders/${log.entityId}`;
        break;
      case 'invoice':
        path = `/invoices/${log.entityId}`;
        break;
      case 'vendor':
        path = `/vendors/${log.entityId}`;
        break;
      case 'approval':
        path = `/approvals`;
        break;
      default:
        return <span className="font-semibold text-slate-500 font-mono text-xs select-all">#{log.entityNumber}</span>;
    }
    
    return (
      <Link
        to={path}
        className="inline-block text-[11px] font-black text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-950/20 px-1.5 py-0.5 rounded-md hover:underline font-mono"
      >
        {log.entityNumber}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Audit Ledger</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isAdmin ? 'System-wide events tracking compliance parameters.' : 'Your personal action ledger log on the platform.'}
        </p>
      </div>

      {/* Filter Options */}
      <div className="card p-5 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search actions (e.g. USER_LOGIN)…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input pl-9 text-xs"
            />
          </div>

          <div>
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="input text-xs"
            >
              <option value="">All Modules</option>
              {MODULES.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input text-xs"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>

          {isAdmin && (
            <div>
              <select
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setPage(1);
                }}
                className="input text-xs"
              >
                <option value="">All Users</option>
                {users?.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Calendar size={14} />
            <span>Event Date Filter:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="input py-1 text-xs"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="input py-1 text-xs"
            />
          </div>
          {(startDate || endDate || searchTerm || moduleFilter || statusFilter || userFilter) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
                setModuleFilter('');
                setStatusFilter('');
                setUserFilter('');
                setPage(1);
              }}
              className="text-xs text-red-500 hover:text-red-700 font-bold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="card p-6 bg-white dark:bg-slate-900 shadow-sm relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-green-600 animate-spin" />
            <span className="text-xs text-slate-500 font-semibold dark:text-slate-400">Loading audit records...</span>
          </div>
        ) : logs.length > 0 ? (
          <div className="relative pl-6 border-l border-slate-100 dark:border-slate-800 space-y-6">
            {logs.map((log) => {
              const styles = getModuleStyles(log.module);
              return (
                <div key={log._id} className="relative group">
                  {/* Color dot */}
                  <span className={`absolute -left-[30px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ${styles.dot} transition-transform group-hover:scale-125 duration-150`} />

                  {/* Header metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${styles.text}`}>
                        {log.action}
                      </span>
                      {renderEntityLink(log)}
                    </div>
                    
                    {/* Timestamp relative with absolute tooltip */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400" title={new Date(log.createdAt).toLocaleString('en-IN')}>
                      <Clock size={12} />
                      <span className="font-semibold">{formatDateRelative(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Core log description */}
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2">
                    {log.description}
                  </p>

                  {/* User / Meta section */}
                  <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-500 dark:text-slate-500 border-t border-slate-50 dark:border-slate-800/40 pt-2 font-medium">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {log.user ? (
                        <span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {log.user.firstName} {log.user.lastName}
                          </span>{' '}
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded uppercase font-bold text-slate-500 dark:text-slate-400">
                            {log.user.role}
                          </span>
                        </span>
                      ) : (
                        <span className="italic">System Core Daemon</span>
                      )}
                    </span>

                    {log.ipAddress && (
                      <span className="font-mono text-[11px] text-slate-400">
                        IP: {log.ipAddress}
                      </span>
                    )}

                    <span className="ml-auto">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        log.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                      }`}>
                        {log.status === 'success' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        <span className="capitalize">{log.status}</span>
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <ShieldAlert size={28} className="text-slate-300 dark:text-slate-700" />
              <span className="text-sm font-semibold">No activity trails match the filter parameters.</span>
            </div>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-8 pt-4">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <span className="text-xs text-slate-500 font-bold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
