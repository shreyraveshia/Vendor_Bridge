import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Search, Plus, Star, Eye, Edit2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const canEdit = hasRole('admin', 'procurement_officer');

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await api.get('/vendors');
        // Handle paginated or list response
        setVendors(res.data.vendors || res.data);
      } catch (err) {
        toast.error('Failed to load vendors list.');
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.vendorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? v.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(vendors.map(v => v.category))].filter(Boolean);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Retrieving vendor profiles…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vendor Directory</h1>
          <p className="text-sm text-gray-500">Manage vendor relationships, compliance status, and analytics.</p>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate('/vendors/new')}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus size={16} />
            Onboard Vendor
          </button>
        )}
      </div>

      {/* Filters card */}
      <div className="card p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by company name, ID, or contact person…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="w-full md:w-60">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table">
            <thead>
              <tr>
                <th>Vendor ID</th>
                <th>Company</th>
                <th>Category</th>
                <th>Rating</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Spend</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length > 0 ? (
                filteredVendors.map(vendor => (
                  <tr key={vendor._id} className="hover:bg-gray-50/50">
                    <td className="font-semibold text-gray-900">{vendor.vendorId}</td>
                    <td>
                      <div>
                        <div className="font-semibold text-gray-800">{vendor.companyName}</div>
                        <div className="text-xs text-gray-400">{vendor.contactPerson}</div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        {vendor.category}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Star className="text-amber-500 fill-amber-500" size={14} />
                        <span className="text-sm font-semibold text-gray-700">{vendor.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </td>
                    <td className="text-right font-medium text-gray-700">{vendor.totalOrders || 0}</td>
                    <td className="text-right font-semibold text-gray-900">
                      ₹{vendor.totalSpend?.toLocaleString('en-IN') || '0'}
                    </td>
                    <td>
                      <span className={`badge ${
                        vendor.status === 'active' ? 'badge-success' :
                        vendor.status === 'inactive' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => navigate(`/vendors/${vendor._id}`)}
                          className="btn-ghost p-1.5 rounded hover:bg-slate-100 text-gray-600 hover:text-gray-900"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/vendors/${vendor._id}/edit`)}
                            className="btn-ghost p-1.5 rounded hover:bg-slate-100 text-gray-600 hover:text-gray-900"
                            title="Edit Profile"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert size={24} className="text-gray-300" />
                      <span>No vendors found matching search criteria.</span>
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
