import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Landmark,
  FileText,
  Receipt,
  Star,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [pos, setPOs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  const canEdit = hasRole('admin', 'procurement_officer');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vendorRes, poRes, invRes] = await Promise.all([
          api.get(`/vendors/${id}`),
          api.get('/purchase-orders'),
          api.get('/invoices')
        ]);
        setVendor(vendorRes.data.vendor || vendorRes.data);

        // Filter POs and Invoices for this vendor
        const allPOs = poRes.data.purchaseOrders || poRes.data.pos || poRes.data;
        const allInvoices = invRes.data.invoices || invRes.data;
        if (Array.isArray(allPOs)) {
          setPOs(allPOs.filter(p => (p.vendor?._id || p.vendor) === id));
        }
        if (Array.isArray(allInvoices)) {
          setInvoices(allInvoices.filter(i => (i.vendor?._id || i.vendor) === id));
        }
      } catch (err) {
        toast.error('Failed to load vendor details.');
        navigate('/vendors');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling partner profile…</span>
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/vendors')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{vendor.companyName}</h1>
              <span className={`badge ${
                vendor.status === 'active' ? 'badge-success' : 'badge-danger'
              }`}>
                {vendor.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">{vendor.vendorId} &bull; {vendor.category}</p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate(`/vendors/${vendor._id}/edit`)}
            className="btn btn-primary self-start sm:self-auto"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total spend</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{vendor.totalSpend?.toLocaleString('en-IN') || '0'}</h3>
          </div>
          <div className="p-3 rounded-xl bg-green-50 text-green-600">
            <DollarSign size={20} />
          </div>
        </div>
        <div className="card p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Orders Flipped</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{vendor.totalOrders || 0}</h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <TrendingUp size={20} />
          </div>
        </div>
        <div className="card p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quality Score</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Star className="text-amber-500 fill-amber-500" size={20} />
              <h3 className="text-2xl font-bold text-gray-900">{vendor.rating?.toFixed(1) || '0.0'}</h3>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Star size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white rounded-t-xl px-4 pt-2 shadow-sm">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'profile' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Building2 size={16} />
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'pos' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText size={16} />
          Purchase Orders ({pos.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'invoices' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Receipt size={16} />
          Invoices ({invoices.length})
        </button>
      </div>

      {/* Tab Panels */}
      {/* 1. Profile Details */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 rounded-t-none ${activeTab === 'profile' ? 'grid' : 'hidden'}`}>
        <div className="md:col-span-2 space-y-6">
          {/* General Information */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2">Business Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-400">Primary Contact Person</span>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{vendor.contactPerson}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                  <Mail size={16} />
                </div>
                <div>
                  <span className="text-xs text-gray-400">Email Address</span>
                  <p className="text-sm font-medium text-gray-800">{vendor.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gray-50 rounded-lg text-gray-500">
                  <Phone size={16} />
                </div>
                <div>
                  <span className="text-xs text-gray-400">Phone Number</span>
                  <p className="text-sm font-medium text-gray-800">{vendor.phone}</p>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-400">Tax Compliance Numbers</span>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  GST: <span className="font-semibold">{vendor.gstNumber || 'N/A'}</span> &bull; PAN: <span className="font-semibold">{vendor.panNumber || 'N/A'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bank details */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-2">
              <Landmark size={18} className="text-gray-500" />
              Settlement Bank Account
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-400">Beneficiary Bank Name</span>
                <p className="text-sm font-semibold text-gray-800">{vendor.bankDetails?.bankName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Account Number</span>
                <p className="text-sm font-semibold text-gray-800">{vendor.bankDetails?.accountNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">IFS Code</span>
                <p className="text-sm font-semibold text-gray-800 uppercase">{vendor.bankDetails?.ifscCode || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400">Branch details</span>
                <p className="text-sm font-medium text-gray-800">{vendor.bankDetails?.branchName || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Address & Notes */}
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-2">
              <MapPin size={18} className="text-gray-500" />
              Corporate Headquarters
            </h3>
            {vendor.address ? (
              <div className="space-y-1 text-sm text-gray-600 leading-relaxed">
                <p>{vendor.address.street}</p>
                <p>{vendor.address.city}, {vendor.address.state}</p>
                <p>{vendor.address.pincode}</p>
                <p className="font-semibold text-gray-800">{vendor.address.country}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No address listed.</p>
            )}
          </div>

          <div className="card p-6 space-y-3 bg-slate-50/50">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Internal Partnership Notes</h3>
            <p className="text-sm text-gray-600 italic">
              {vendor.notes || '"No internal comments recorded for this partner."'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Purchase Orders list */}
      <div className={`card overflow-hidden ${activeTab === 'pos' ? 'block' : 'hidden'}`}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Order Date</th>
                <th className="text-right">Total Amount</th>
                <th>Payment Terms</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pos.length > 0 ? (
                pos.map(po => (
                  <tr
                    key={po._id}
                    onClick={() => navigate(`/purchase-orders/${po._id}`)}
                    className="hover:bg-gray-50/50 cursor-pointer"
                  >
                    <td className="font-semibold text-gray-900">{po.poNumber}</td>
                    <td className="text-gray-600">{new Date(po.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="text-right font-bold text-gray-900">₹{po.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="text-gray-600">{po.paymentTerms}</td>
                    <td>
                      <span className={`badge ${
                        po.status === 'completed' ? 'badge-success' :
                        po.status === 'cancelled' ? 'badge-danger' :
                        po.status === 'sent' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-1.5">
                      <AlertCircle size={20} />
                      <span>No Purchase Orders logged against this vendor.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Invoices list */}
      <div className={`card overflow-hidden ${activeTab === 'invoices' ? 'block' : 'hidden'}`}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th className="text-right">Total Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map(inv => (
                  <tr
                    key={inv._id}
                    onClick={() => navigate(`/invoices/${inv._id}`)}
                    className="hover:bg-gray-50/50 cursor-pointer"
                  >
                    <td className="font-semibold text-gray-900">{inv.invoiceNumber}</td>
                    <td className="text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                    <td className="text-gray-600">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                    <td className="text-right font-bold text-gray-900">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`badge ${
                        inv.status === 'paid' ? 'badge-success' :
                        inv.status === 'overdue' ? 'badge-danger' : 'badge-warning'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-1.5">
                      <AlertCircle size={20} />
                      <span>No Invoices registered from this vendor.</span>
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
