import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  ArrowLeft,
  Edit2,
  Mail,
  Phone,
  MapPin,
  Landmark,
  FileText,
  Star,
  DollarSign,
  TrendingUp,
  AlertCircle,
  FolderOpen,
  Calendar,
  CheckCircle,
  FileDown
} from 'lucide-react';
import StatusBadge from '@/components/shared/StatusBadge';
import toast from 'react-hot-toast';

export default function VendorDetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const canEdit = hasRole('admin', 'procurement_officer');
  const isAdmin = hasRole('admin');

  const fetchVendorData = async () => {
    try {
      const [vendorRes, poRes] = await Promise.all([
        api.get(`/vendors/${id}`),
        api.get('/purchase-orders')
      ]);

      const vendorData = vendorRes.data.vendor || vendorRes.data;
      setVendor(vendorData);

      const allPOs = poRes.data.purchaseOrders || poRes.data.pos || poRes.data;
      if (Array.isArray(allPOs)) {
        setPOs(allPOs.filter(p => (p.vendor?._id || p.vendor) === id).slice(0, 5)); // Limit to last 5 POs
      }
    } catch (err) {
      toast.error('Failed to load vendor profile details.');
      navigate('/vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorData();
  }, [id, navigate]);

  const handleStatusChange = async (e) => {
    const nextStatus = e.target.value;
    if (!isAdmin) {
      toast.error('Only administrators can update vendor status.');
      return;
    }
    setStatusUpdating(true);
    try {
      await api.patch(`/vendors/${id}/status`, { status: nextStatus });
      toast.success(`Vendor status set to ${nextStatus}.`);
      fetchVendorData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update vendor status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Loading partner profile…</span>
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="card bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <button
            onClick={() => navigate('/vendors')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">{vendor.companyName}</h2>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                {vendor.category}
              </span>
              <StatusBadge status={vendor.status} />
            </div>
            <p className="text-xs text-gray-400 font-semibold">{vendor.vendorId} &bull; Active since {new Date(vendor.createdAt).toLocaleDateString('en-IN')}</p>
            <div className="flex items-center gap-1 text-amber-500 pt-1">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  size={14}
                  className={idx < Math.round(vendor.rating || 0) ? 'fill-amber-500' : 'text-gray-200 dark:text-gray-700'}
                />
              ))}
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-1">({vendor.rating?.toFixed(1) || '0.0'})</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status Override</span>
              <select
                value={vendor.status}
                onChange={handleStatusChange}
                disabled={statusUpdating}
                className="input py-1.5 px-3 text-xs w-36"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          )}

          {canEdit && (
            <button
              onClick={() => navigate(`/vendors/${vendor._id}/edit`)}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <Edit2 size={12} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Orders count</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{vendor.totalOrders || 0} POs</h3>
            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5">
              <TrendingUp size={12} className="text-green-500" /> Fulfillments volume
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
            <FileText size={20} />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total spend</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">₹{(vendor.totalSpend || 0).toLocaleString('en-IN')}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Net payments processed</p>
          </div>
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Internal Rating</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{vendor.rating?.toFixed(1) || '0.0'} Score</h3>
            <p className="text-[10px] text-gray-400 mt-1">Reliability evaluation</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
            <Star size={20} className="fill-amber-500/10" />
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* General profile info */}
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-2">Business Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Contact Person</span>
                <span className="font-bold text-gray-800 dark:text-slate-300 mt-0.5 block">{vendor.contactPerson}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg">
                  <Mail size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Email Address</span>
                  <span className="font-semibold text-gray-800 dark:text-slate-300 block">{vendor.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg">
                  <Phone size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Phone Details</span>
                  <span className="font-semibold text-gray-800 dark:text-slate-300 block">{vendor.phone}</span>
                  {vendor.alternatePhone && <span className="text-[10px] text-gray-400 block">Alt: {vendor.alternatePhone}</span>}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Regulatory Compliance IDs</span>
                <p className="mt-0.5">
                  GST: <span className="font-bold text-gray-900 dark:text-white font-mono">{vendor.gstNumber || '—'}</span> &bull; PAN: <span className="font-bold text-gray-900 dark:text-white font-mono">{vendor.panNumber || '—'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Settlement Bank Details */}
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-2 flex items-center gap-2">
              <Landmark size={16} className="text-gray-500" />
              Settlement Bank Account
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Beneficiary Bank Name</span>
                <span className="font-bold text-gray-800 dark:text-slate-300 mt-0.5 block">{vendor.bankDetails?.bankName || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Account Number</span>
                <span className="font-bold text-gray-800 dark:text-slate-300 mt-0.5 block">{vendor.bankDetails?.accountNumber || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">IFS Code (NEFT/RTGS)</span>
                <span className="font-bold text-gray-900 dark:text-white mt-0.5 block font-mono uppercase">{vendor.bankDetails?.ifscCode || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold uppercase tracking-wider">Branch Details</span>
                <span className="font-semibold text-gray-800 dark:text-slate-300 mt-0.5 block">{vendor.bankDetails?.branchName || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Address & Compliance docs column */}
        <div className="space-y-6">
          {/* Corporate Address */}
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-2 flex items-center gap-2">
              <MapPin size={16} className="text-gray-500" />
              Headquarters Address
            </h3>
            {vendor.address ? (
              <div className="space-y-1 text-xs text-gray-600 dark:text-slate-400 leading-relaxed font-semibold">
                <p>{vendor.address.street}</p>
                <p>{vendor.address.city}, {vendor.address.state}</p>
                <p>{vendor.address.pincode}</p>
                <p className="text-gray-900 dark:text-white font-bold">{vendor.address.country}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No office address listed.</p>
            )}
          </div>

          {/* Compliance Documents */}
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-2 flex items-center gap-2">
              <FileText size={16} className="text-gray-500" />
              Verification Documents
            </h3>
            <div className="space-y-2.5 max-h-56 overflow-y-auto scrollbar-thin">
              {vendor.documents && vendor.documents.length > 0 ? (
                vendor.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 p-2.5 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-slate-50/50 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-gray-850 dark:text-slate-300 block truncate max-w-[130px]">{doc.name}</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : 'Uploaded'}
                      </span>
                    </div>
                    <a
                      href={doc.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      <FileDown size={14} />
                    </a>
                  </div>
                ))
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-1">
                  <FolderOpen size={20} className="text-gray-300 dark:text-gray-700" />
                  <span className="text-[10px] text-gray-400">No verification files uploaded.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent POs widget */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-2">Recent Purchase Orders</h3>
        <div className="overflow-x-auto scrollbar-thin">
          {pos.length > 0 ? (
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Order Date</th>
                  <th className="text-right">Grand Total</th>
                  <th>Payment Terms</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pos.map(po => (
                  <tr
                    key={po._id}
                    onClick={() => navigate(`/purchase-orders/${po._id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                  >
                    <td className="font-bold text-gray-900 dark:text-white">{po.poNumber}</td>
                    <td className="text-gray-600">{new Date(po.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="text-right font-extrabold text-gray-900 dark:text-white">₹{po.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="text-gray-600">{po.paymentTerms}</td>
                    <td>
                      <StatusBadge status={po.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400">No Purchase Orders logged against this partner.</div>
          )}
        </div>
      </div>
    </div>
  );
}
