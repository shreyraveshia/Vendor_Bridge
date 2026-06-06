import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  Search,
  Plus,
  Star,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle,
  FolderOpen,
  Filter,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert
} from 'lucide-react';
import { SkeletonTable } from '@/components/shared/SkeletonLoader';
import StatusBadge from '@/components/shared/StatusBadge';
import toast from 'react-hot-toast';

export default function VendorList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({ active: 0, inactive: 0, blacklisted: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const canEdit = hasRole('admin', 'procurement_officer');
  const isAdmin = hasRole('admin');

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 40000); // 400ms debounce
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/vendors/stats');
      const byStatus = res.data.data?.byStatus || [];
      const statsObj = {
        active: byStatus.find(s => s._id === 'active')?.count || 0,
        inactive: byStatus.find(s => s._id === 'inactive')?.count || 0,
        blacklisted: byStatus.find(s => s._id === 'blacklisted')?.count || 0
      };
      setStats(statsObj);
    } catch (err) {
      // swallow background stats errors
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        q: debouncedSearch || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined
      };
      const res = await api.get('/vendors', { params });
      setVendors(res.data.vendors || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      toast.error('Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [page, debouncedSearch, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleToggleStatus = async (vendorId, currentStatus) => {
    if (!isAdmin) {
      toast.error('Only administrators can update vendor status.');
      return;
    }
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/vendors/${vendorId}/status`, { status: nextStatus });
      toast.success(`Vendor set to ${nextStatus}`);
      fetchVendors();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setPage(1);
  };

  const categories = ['IT & Technology', 'Construction', 'Office Supplies', 'Logistics', 'Electrical', 'Human Resources', 'Marketing', 'Consulting'];

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Vendor Directory</h1>
          <p className="text-sm text-gray-500">Manage supplier profiles, settlement banking, and active compliance.</p>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate('/vendors/new')}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus size={16} /> Add Vendor
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-green-500">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Partners</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {loadingStats ? '...' : stats.active}
            </h3>
          </div>
          <CheckCircle size={20} className="text-green-500" />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-gray-400">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inactive / Suspended</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {loadingStats ? '...' : stats.inactive}
            </h3>
          </div>
          <XCircle size={20} className="text-gray-400" />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-red-500">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Blacklisted / Warning</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {loadingStats ? '...' : stats.blacklisted}
            </h3>
          </div>
          <AlertTriangle size={20} className="text-red-500" />
        </div>
      </div>

      {/* Filters card */}
      <div className="card p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by company name, contact, or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 text-xs"
          />
        </div>
        <div className="w-full md:w-44">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="input text-xs"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="w-full md:w-44">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input text-xs"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <button onClick={handleClearFilters} className="btn btn-secondary py-2 text-xs flex items-center gap-1 w-full md:w-auto">
          Clear Filters
        </button>
      </div>

      {/* Table list */}
      <div className="card overflow-hidden">
        {loading ? (
          <SkeletonTable rows={5} />
        ) : vendors.length > 0 ? (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>Vendor ID</th>
                  <th>Company Name</th>
                  <th>Category</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>GST Number</th>
                  <th>Status</th>
                  <th>Rating</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(vendor => (
                  <tr key={vendor._id}>
                    <td className="font-bold text-gray-900 dark:text-white">{vendor.vendorId}</td>
                    <td className="font-semibold text-gray-800 dark:text-slate-300">{vendor.companyName}</td>
                    <td>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                        {vendor.category}
                      </span>
                    </td>
                    <td>{vendor.contactPerson}</td>
                    <td className="font-medium">{vendor.phone}</td>
                    <td className="font-mono text-gray-600 dark:text-slate-400">{vendor.gstNumber || '—'}</td>
                    <td>
                      <StatusBadge status={vendor.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            size={12}
                            className={idx < Math.round(vendor.rating || 0) ? 'fill-amber-500' : 'text-gray-200 dark:text-gray-700'}
                          />
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/vendors/${vendor._id}`)}
                          className="p-1 rounded text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="View Profile"
                        >
                          <Eye size={14} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/vendors/${vendor._id}/edit`)}
                            className="p-1 rounded text-gray-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit Profile"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleToggleStatus(vendor._id, vendor.status)}
                            className={`p-1 rounded transition-colors ${
                              vendor.status === 'active' ? 'text-green-500' : 'text-gray-400'
                            }`}
                            title={vendor.status === 'active' ? 'Deactivate Vendor' : 'Activate Vendor'}
                          >
                            {vendor.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center text-center justify-center gap-2">
            <FolderOpen size={32} className="text-gray-300 dark:text-gray-700" />
            <h4 className="text-xs font-bold text-gray-800 dark:text-slate-300">No vendors found</h4>
            <p className="text-[10px] text-gray-400">Try adjusting your filters or search keywords.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-6 py-4 bg-white dark:bg-gray-900 text-xs">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="btn btn-secondary py-1 px-3 text-xs disabled:opacity-50"
            >
              Previous
            </button>
            <span className="font-semibold text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="btn btn-secondary py-1 px-3 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
