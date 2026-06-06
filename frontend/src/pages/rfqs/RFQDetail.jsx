import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  User,
  Trash2,
  Send,
  Eye,
  BarChart4
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RFQDetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [rfq, setRFQ] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdminOrProc = hasRole('admin', 'procurement_officer');
  const isVendor = hasRole('vendor');

  const fetchRFQData = async () => {
    try {
      const res = await api.get(`/rfqs/${id}`);
      setRFQ(res.data.rfq || res.data);

      if (!isVendor) {
        // Fetch quotations for this RFQ
        const qRes = await api.get(`/quotations?rfq=${id}`);
        setQuotes(qRes.data.quotations || qRes.data);
      } else {
        // Fetch only vendor's own quotations for this RFQ
        const qRes = await api.get(`/quotations?rfq=${id}`);
        setQuotes(qRes.data.quotations || qRes.data);
      }
    } catch (err) {
      toast.error('Failed to load RFQ details.');
      navigate('/rfqs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQData();
  }, [id, navigate]);

  const handlePublish = async () => {
    try {
      await api.patch(`/rfqs/${id}/publish`);
      toast.success('RFQ published successfully.');
      fetchRFQData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish RFQ.');
    }
  };

  const handleClose = async () => {
    try {
      await api.patch(`/rfqs/${id}/close`);
      toast.success('RFQ closed for bidding.');
      fetchRFQData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close RFQ.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this draft RFQ?')) return;
    try {
      await api.delete(`/rfqs/${id}`);
      toast.success('RFQ deleted successfully.');
      navigate('/rfqs');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete RFQ.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling bidding context…</span>
      </div>
    );
  }

  if (!rfq) return null;

  // Check if current vendor user is assigned
  const isAssigned = rfq.assignedVendors?.some(v => v._id === user?.vendorId || v === user?.vendorId);
  // Check if current vendor user already submitted quote
  const hasSubmittedQuote = quotes.some(q => q.vendor?._id === user?.vendorId || q.vendor === user?.vendorId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/rfqs')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{rfq.title}</h1>
              <span className={`badge ${
                rfq.status === 'published' ? 'badge-success' :
                rfq.status === 'closed' ? 'badge-danger' :
                rfq.status === 'under_review' ? 'badge-info' : 'badge-warning'
              }`}>
                {rfq.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">{rfq.rfqNumber} &bull; {rfq.category}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {isAdminOrProc && (
            <>
              {rfq.status === 'draft' && (
                <>
                  <button
                    onClick={handlePublish}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Send size={16} />
                    Publish RFQ
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
              {rfq.status === 'published' && (
                <button
                  onClick={handleClose}
                  className="btn btn-outline border-orange-200 text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                >
                  <AlertCircle size={16} />
                  Close Bidding
                </button>
              )}
              {rfq.status !== 'draft' && quotes.length > 0 && (
                <button
                  onClick={() => navigate(`/quotations/compare/${rfq._id}`)}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <BarChart4 size={16} />
                  Compare Quotations
                </button>
              )}
            </>
          )}

          {isVendor && rfq.status === 'published' && isAssigned && !hasSubmittedQuote && (
            <Link
              to={`/quotations/${rfq._id}/submit`}
              className="btn btn-primary flex items-center gap-2"
            >
              <Send size={16} />
              Submit Bid
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Specs & Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2">RFQ Details</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{rfq.description}</p>
            {rfq.notes && (
              <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 text-sm">
                <span className="font-bold text-slate-700 block mb-1">Additional Notes</span>
                <p className="text-gray-600 leading-relaxed">{rfq.notes}</p>
              </div>
            )}
          </div>

          {/* Line items table */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2">Line Items</h3>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Name</th>
                    <th>Specifications</th>
                    <th className="text-right">Qty</th>
                    <th>Unit</th>
                    {!isVendor && <th className="text-right">Est. Unit Price</th>}
                    {!isVendor && <th className="text-right">Est. Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {rfq.items?.map((item, idx) => (
                    <tr key={item._id}>
                      <td className="text-gray-400 font-medium">{idx + 1}</td>
                      <td className="font-semibold text-gray-900">{item.name}</td>
                      <td className="text-gray-600">{item.description}</td>
                      <td className="text-right font-medium text-gray-900">{item.quantity}</td>
                      <td className="text-gray-500">{item.unit}</td>
                      {!isVendor && <td className="text-right text-gray-700">₹{item.estimatedUnitPrice.toLocaleString('en-IN')}</td>}
                      {!isVendor && (
                        <td className="text-right font-semibold text-gray-900">
                          ₹{(item.estimatedUnitPrice * item.quantity).toLocaleString('en-IN')}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Bidding Timeline</h3>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Calendar size={18} className="text-gray-400" />
              <div>
                <span className="text-xs text-gray-400 block">Submission Deadline</span>
                <span className="font-semibold text-gray-900">{new Date(rfq.deadline).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <User size={18} className="text-gray-400" />
              <div>
                <span className="text-xs text-gray-400 block">Created By</span>
                <span className="font-semibold text-gray-900">
                  {rfq.createdBy?.firstName} {rfq.createdBy?.lastName} ({rfq.createdBy?.email})
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Vendors / Submissions list (Procurement only) */}
          {isAdminOrProc && (
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Invited Suppliers</h3>
              <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {rfq.assignedVendors?.map(vendor => {
                  const quote = quotes.find(q => q.vendor?._id === vendor._id || q.vendor === vendor._id);
                  return (
                    <div key={vendor._id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-semibold text-gray-800 block truncate max-w-[150px]">{vendor.companyName}</span>
                        <span className="text-[10px] text-gray-400">{vendor.contactPerson}</span>
                      </div>
                      <div>
                        {quote ? (
                          <span
                            onClick={() => navigate(`/invoices` /* or appropriate page */)}
                            className="badge badge-success cursor-pointer flex items-center gap-0.5 hover:opacity-90"
                          >
                            <CheckCircle size={10} /> Quoted
                          </span>
                        ) : (
                          <span className="badge badge-warning">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vendors own quotes list (Vendor only) */}
          {isVendor && (
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Your Submissions</h3>
              <div className="space-y-2">
                {quotes.filter(q => q.vendor?._id === user?.vendorId || q.vendor === user?.vendorId).map(q => (
                  <div key={q._id} className="p-3 border border-gray-100 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-gray-900 block">{q.quotationNumber}</span>
                      <span className="text-gray-400">Total: ₹{q.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <span className={`badge ${
                      q.status === 'awarded' ? 'badge-success' :
                      q.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {q.status}
                    </span>
                  </div>
                ))}
                {quotes.filter(q => q.vendor?._id === user?.vendorId || q.vendor === user?.vendorId).length === 0 && (
                  <p className="text-xs text-gray-400 italic">No bids submitted yet for this RFQ.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
