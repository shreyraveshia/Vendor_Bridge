import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  Activity,
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Terminal,
  CheckCircle,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const MODULES = [
  { id: 'auth', label: 'Authentication' },
  { id: 'vendor', label: 'Vendors Profile' },
  { id: 'rfq', label: 'RFQs Sourcing' },
  { id: 'quotation', label: 'Bids & Quotations' },
  { id: 'approval', label: 'Approvals' },
  { id: 'purchase_order', label: 'Purchase Orders' },
  { id: 'invoice', label: 'Invoices & Settlement' }
];

export default function ActivityLogs() {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = hasRole('admin');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const endpoint = isAdmin ? '/activity-logs' : '/activity-logs/mine';
      const params = {
        page,
        limit: 15,
        module: moduleFilter || undefined,
        status: statusFilter || undefined,
        action: searchTerm || undefined
      };

      const res = await api.get(endpoint, { params });
      setLogs(res.data.logs || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      toast.error('Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, moduleFilter, statusFilter, searchTerm]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Logs & Activity</h1>
        <p className="text-sm text-gray-500">
          {isAdmin ? 'System-wide activity ledger for audit compliance.' : 'Your personal activity trail on the platform.'}
        </p>
      </div>

      {/* Filters card */}
      <div className="card p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by action name (e.g. VENDOR_CREATED)…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="input pl-10"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setPage(1);
            }}
            className="input"
          >
            <option value="">All Modules</option>
            {MODULES.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>
      </div>

      {/* Log Feed */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
            <span className="text-sm text-gray-400 font-medium">Retrieving audit entries…</span>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Module</th>
                  <th>Action Triggered</th>
                  <th>Description</th>
                  {isAdmin && <th>Triggered By</th>}
                  <th>IP Address</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="text-gray-400 font-medium whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px]">
                        {log.module}
                      </span>
                    </td>
                    <td className="font-semibold text-gray-900 font-mono text-[10px]">{log.action}</td>
                    <td className="text-gray-600 font-medium">{log.description}</td>
                    {isAdmin && (
                      <td>
                        {log.user ? (
                          <div>
                            <span className="font-bold text-gray-800">{log.user.firstName} {log.user.lastName}</span>
                            <span className="text-[10px] text-gray-400 block">{log.user.email} &bull; {log.user.role}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">System Process</span>
                        )}
                      </td>
                    )}
                    <td className="text-gray-500 font-mono">{log.ipAddress || '—'}</td>
                    <td>
                      <span className={`flex items-center gap-1 font-bold ${
                        log.status === 'success' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {log.status === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        <span className="capitalize">{log.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            <div className="flex flex-col items-center gap-2">
              <ShieldAlert size={24} className="text-gray-300" />
              <span>No activity logs matches your query.</span>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-white">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="btn btn-outline py-1 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <span className="text-xs text-gray-500 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="btn btn-outline py-1 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
