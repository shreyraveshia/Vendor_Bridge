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
  BarChart4,
  DollarSign,
  Briefcase,
  Users,
  Clock,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '@/components/shared/StatusBadge';

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

      // Fetch quotations for this RFQ (backend automatically restricts if user is a vendor)
      const qRes = await api.get(`/quotations?rfq=${id}`);
      setQuotes(qRes.data.quotations || qRes.data || []);
    } catch (err) {
      toast.error('Failed to load RFQ details.');
      navigate('/rfq');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQData();
  }, [id, navigate]);

  const handlePublish = async () => {
    const loadingToast = toast.loading('Publishing RFQ...');
    try {
      await api.patch(`/rfqs/${id}/publish`);
      toast.success('RFQ published successfully.', { id: loadingToast });
      fetchRFQData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish RFQ.', { id: loadingToast });
    }
  };

  const handleClose = async () => {
    const loadingToast = toast.loading('Closing RFQ...');
    try {
      await api.patch(`/rfqs/${id}/close`);
      toast.success('RFQ closed for bidding.', { id: loadingToast });
      fetchRFQData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close RFQ.', { id: loadingToast });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this draft RFQ?')) return;
    const loadingToast = toast.loading('Deleting RFQ...');
    try {
      await api.delete(`/rfqs/${id}`);
      toast.success('RFQ deleted successfully.', { id: loadingToast });
      navigate('/rfq');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete RFQ.', { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium animate-pulse">Assembling sourcing context…</span>
      </div>
    );
  }

  if (!rfq) return null;

  // Determine if vendor is invited/assigned
  const currentVendorId = user?.vendorId;
  const isAssigned = rfq.assignedVendors?.some(v => v._id === currentVendorId || v === currentVendorId);
  // Check if current vendor user already submitted quote
  const hasSubmittedQuote = quotes.some(q => q.vendor?._id === currentVendorId || q.vendor === currentVendorId);
  const vendorQuote = quotes.find(q => q.vendor?._id === currentVendorId || q.vendor === currentVendorId);

  // Compute stats for line items
  const totalEstimatedAmount = rfq.items?.reduce((acc, item) => acc + (item.estimatedUnitPrice * item.quantity), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header breadcrumb & actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/rfq')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{rfq.title}</h1>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                rfq.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                rfq.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {rfq.priority}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300">{rfq.rfqNumber}</span> &bull; {rfq.category}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {isAdminOrProc && (
            <>
              {rfq.status === 'draft' && (
                <>
                  <button
                    onClick={handlePublish}
                    className="btn btn-primary flex items-center gap-2 text-xs"
                  >
                    <Send size={14} />
                    Publish RFQ
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50 text-xs py-2 px-3"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              {rfq.status === 'published' && (
                <button
                  onClick={handleClose}
                  className="btn btn-outline border-orange-200 text-orange-600 hover:bg-orange-50 flex items-center gap-2 text-xs"
                >
                  <AlertCircle size={14} />
                  Close Bidding
                </button>
              )}
              {rfq.status !== 'draft' && quotes.length > 0 && (
                <button
                  onClick={() => navigate(`/quotations/compare/${rfq._id}`)}
                  className="btn btn-primary flex items-center gap-2 text-xs"
                >
                  <BarChart4 size={14} />
                  Compare Quotations
                </button>
              )}
            </>
          )}

          {isVendor && rfq.status === 'published' && isAssigned && !hasSubmittedQuote && (
            <Link
              to={`/quotations/${rfq._id}/submit`}
              className="btn btn-primary flex items-center gap-2 text-xs"
            >
              <Send size={14} />
              Submit Quotation
            </Link>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: specs & line items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sourcing Timeline Info */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">RFQ Specifications</h3>
              <StatusBadge status={rfq.status} />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{rfq.description}</p>
            {rfq.notes && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Additional Instructions / Notes</span>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{rfq.notes}</p>
              </div>
            )}
          </div>

          {/* Line items table */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Required Line Items</h3>
              {!isVendor && (
                <span className="text-xs font-semibold text-gray-500">
                  Est. Sourcing Budget: <span className="text-gray-900 dark:text-white font-extrabold">₹{totalEstimatedAmount.toLocaleString('en-IN')}</span>
                </span>
              )}
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th className="w-10">#</th>
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
                      <td className="font-bold text-gray-900 dark:text-white">{item.name}</td>
                      <td className="text-gray-500 max-w-xs truncate">{item.description}</td>
                      <td className="text-right font-bold text-gray-900 dark:text-white">{item.quantity}</td>
                      <td className="text-gray-500">{item.unit}</td>
                      {!isVendor && <td className="text-right text-gray-600">₹{item.estimatedUnitPrice.toLocaleString('en-IN')}</td>}
                      {!isVendor && (
                        <td className="text-right font-bold text-gray-900 dark:text-white">
                          ₹{(item.estimatedUnitPrice * item.quantity).toLocaleString('en-IN')}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bids/Quotations List (Procurement view) */}
          {isAdminOrProc && rfq.status !== 'draft' && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Received Quotations</h3>
                <span className="text-xs text-gray-400 font-semibold">{quotes.length} total bids</span>
              </div>
              {quotes.length > 0 ? (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="table text-xs">
                    <thead>
                      <tr>
                        <th>Quote #</th>
                        <th>Supplier</th>
                        <th className="text-right">Subtotal</th>
                        <th className="text-right">Tax (GST)</th>
                        <th className="text-right">Total Bid</th>
                        <th>Lead Time</th>
                        <th>Status</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map(q => (
                        <tr key={q._id}>
                          <td className="font-bold text-primary-600">{q.quotationNumber}</td>
                          <td className="font-semibold text-gray-800 dark:text-slate-200">
                            {q.vendor?.companyName || 'Unknown Supplier'}
                          </td>
                          <td className="text-right text-gray-600">₹{q.subtotal.toLocaleString('en-IN')}</td>
                          <td className="text-right text-gray-500">₹{q.taxAmount.toLocaleString('en-IN')} ({q.taxRate}%)</td>
                          <td className="text-right font-extrabold text-gray-900 dark:text-white">
                            ₹{q.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="text-gray-700">
                            {q.deliveryTimeline} {q.deliveryTimelineUnit}
                          </td>
                          <td>
                            <span className={`badge ${
                              q.status === 'shortlisted' ? 'badge-info' :
                              q.status === 'rejected' ? 'badge-danger' :
                              q.status === 'awarded' ? 'badge-success' : 'badge-warning'
                            }`}>
                              {q.status}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => navigate(`/quotations/compare/${rfq._id}`)}
                              className="text-gray-400 hover:text-primary-600"
                              title="Compare/Inspect Bids"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 italic">
                  No bids have been submitted yet for this RFQ.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: metadata panels */}
        <div className="space-y-6">
          {/* Bidding Timeline */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bidding Context</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <Calendar size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-semibold">Bidding Deadline</span>
                  <span className="font-bold text-gray-800 dark:text-slate-200">
                    {new Date(rfq.deadline).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <User size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-semibold">Initiated By</span>
                  <span className="font-bold text-gray-800 dark:text-slate-200">
                    {rfq.createdBy?.firstName} {rfq.createdBy?.lastName}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">{rfq.createdBy?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invited Suppliers (Procurement View) */}
          {isAdminOrProc && (
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Invited Suppliers</h3>
                <span className="badge badge-secondary text-[10px]">{rfq.assignedVendors?.length || 0}</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-60 overflow-y-auto pr-1 scrollbar-thin space-y-2">
                {rfq.assignedVendors?.map(vendor => {
                  const quote = quotes.find(q => q.vendor?._id === vendor._id || q.vendor === vendor._id);
                  return (
                    <div key={vendor._id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-gray-800 dark:text-slate-250 block truncate max-w-[155px]">
                          {vendor.companyName}
                        </span>
                        <span className="text-[10px] text-gray-400">{vendor.contactPerson}</span>
                      </div>
                      <div>
                        {quote ? (
                          <span
                            onClick={() => navigate(`/quotations/compare/${rfq._id}`)}
                            className="badge badge-success cursor-pointer flex items-center gap-0.5 hover:opacity-90 text-[9px]"
                          >
                            <CheckCircle size={10} /> Quoted
                          </span>
                        ) : (
                          <span className="badge badge-warning text-[9px]">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {rfq.assignedVendors?.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-2">No suppliers invited to this RFQ.</p>
                )}
              </div>
            </div>
          )}

          {/* Vendor's Submission status (Vendor View) */}
          {isVendor && (
            <div className="card p-5 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-gray-800 pb-2">Your Sourcing Status</h3>
              {isAssigned ? (
                <div className="space-y-4 text-xs">
                  {hasSubmittedQuote ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold">
                          <CheckCircle size={16} />
                          <span>Bid Submitted</span>
                        </div>
                        <p className="text-[10px] text-green-600 dark:text-green-400">
                          Your proposal has been logged securely under quotation reference <span className="font-bold">{vendorQuote.quotationNumber}</span>.
                        </p>
                      </div>

                      <div className="border border-gray-150 dark:border-gray-800 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-semibold">Total Quote Price:</span>
                          <span className="font-extrabold text-gray-900 dark:text-white">₹{vendorQuote.totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-semibold">Submission Date:</span>
                          <span className="text-gray-700 dark:text-gray-300">{new Date(vendorQuote.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-semibold">Proposal Status:</span>
                          <span className={`badge capitalize ${
                            vendorQuote.status === 'shortlisted' ? 'badge-info' :
                            vendorQuote.status === 'rejected' ? 'badge-danger' :
                            vendorQuote.status === 'awarded' ? 'badge-success' : 'badge-warning'
                          }`}>
                            {vendorQuote.status}
                          </span>
                        </div>
                      </div>

                      {vendorQuote.status === 'draft' && (
                        <Link
                          to={`/quotations/${rfq._id}/submit`}
                          className="btn btn-primary w-full text-center flex items-center justify-center gap-1.5 py-2"
                        >
                          <Send size={14} /> Update / Submit Bid
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl space-y-1 text-amber-700 dark:text-amber-400">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertCircle size={16} />
                          <span>Awaiting Your Bid</span>
                        </div>
                        <p className="text-[10px]">
                          You have been assigned to participate in this sourcing event. Please review specifications and submit your rates.
                        </p>
                      </div>
                      <Link
                        to={`/quotations/${rfq._id}/submit`}
                        className="btn btn-primary w-full text-center flex items-center justify-center gap-1.5 py-2"
                      >
                        <Send size={14} /> Start Quotation
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center text-xs text-gray-400 italic">
                  You are not invited to participate in this RFQ sourcing.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
