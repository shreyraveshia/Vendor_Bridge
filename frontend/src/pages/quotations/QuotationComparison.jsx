import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  ArrowLeft,
  DollarSign,
  Truck,
  CheckCircle,
  XCircle,
  HelpCircle,
  Award,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuotationComparison() {
  const { rfqId } = useParams();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectingQuoteId, setRejectingQuoteId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const isAdminOrProc = hasRole('admin', 'procurement_officer');

  const fetchComparison = async () => {
    try {
      const res = await api.get(`/quotations/compare/${rfqId}`);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load comparison data.');
      navigate('/rfqs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [rfqId, navigate]);

  const handleShortlist = async (quoteId) => {
    try {
      await api.patch(`/quotations/${quoteId}/shortlist`);
      toast.success('Quotation shortlisted successfully.');
      fetchComparison();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to shortlist quotation.');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    try {
      await api.patch(`/quotations/${rejectingQuoteId}/reject`, {
        rejectionReason: rejectReason
      });
      toast.success('Quotation rejected.');
      setRejectingQuoteId(null);
      setRejectReason('');
      fetchComparison();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject quotation.');
    }
  };

  const handleRequestApproval = async (quoteId) => {
    try {
      await api.post('/approvals', { quotation: quoteId });
      toast.success('Approval request sent to managers.');
      navigate('/approvals');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate approval.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Analyzing quotation items…</span>
      </div>
    );
  }

  if (!data) return null;

  const { rfq, quotations, comparisonSummary } = data;
  const { min, max, avg } = comparisonSummary.priceRange;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/rfqs/${rfqId}`)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quotations Comparative Analysis</h1>
          <p className="text-sm text-gray-500">Compare pricing, delivery schedules, and compliance parameters for "{rfq?.title}".</p>
        </div>
      </div>

      {/* Summary Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total bids received</span>
          <h3 className="text-xl font-bold text-gray-900 mt-1">{comparisonSummary.totalQuotations} Bids</h3>
        </div>
        <div className="card p-4 flex flex-col justify-between border-l-4 border-l-green-500">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lowest Bid</span>
          <h3 className="text-xl font-bold text-green-600 mt-1">₹{min.toLocaleString('en-IN')}</h3>
        </div>
        <div className="card p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Bid</span>
          <h3 className="text-xl font-bold text-gray-700 mt-1">₹{Math.round(avg).toLocaleString('en-IN')}</h3>
        </div>
        <div className="card p-4 flex flex-col justify-between border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fastest Delivery</span>
          <h3 className="text-xl font-bold text-blue-600 mt-1">{comparisonSummary.fastestDelivery.days} Days</h3>
          <span className="text-[10px] text-gray-400 mt-1 truncate">({comparisonSummary.fastestDelivery.vendorName})</span>
        </div>
      </div>

      {/* Comparison Grid */}
      {quotations.length > 0 ? (
        <div className="card overflow-x-auto scrollbar-thin p-6">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 pr-6 font-semibold text-gray-400 uppercase tracking-wider text-xs min-w-[200px]">Quotations Profile</th>
                {quotations.map(q => (
                  <th key={q._id} className="py-3 px-4 font-semibold text-gray-900 min-w-[220px] text-center border-l border-gray-100">
                    <div className="space-y-1">
                      <span className="text-sm font-bold block">{q.vendor?.companyName}</span>
                      <span className="text-[10px] text-gray-400 font-medium block">{q.quotationNumber}</span>
                      <span className={`badge mx-auto block w-max mt-1 ${
                        q.status === 'shortlisted' ? 'badge-info' :
                        q.status === 'rejected' ? 'badge-danger' :
                        q.status === 'awarded' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {q.status}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Financial values */}
              <tr className="border-b border-gray-50 bg-slate-50/20">
                <td className="py-4 pr-6 font-bold text-gray-700">Grand Total (Inc. GST)</td>
                {quotations.map(q => (
                  <td key={q._id} className="py-4 px-4 text-center border-l border-gray-100 font-extrabold text-base text-gray-900">
                    <div className="space-y-1">
                      <span>₹{q.totalAmount.toLocaleString('en-IN')}</span>
                      {q.isLowestPrice && (
                        <span className="badge badge-success mx-auto flex items-center justify-center gap-0.5 text-[10px] font-bold w-max">
                          <Award size={10} /> Lowest Price
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Subtotal */}
              <tr className="border-b border-gray-50">
                <td className="py-3 pr-6 font-semibold text-gray-500">Subtotal</td>
                {quotations.map(q => (
                  <td key={q._id} className="py-3 px-4 text-center border-l border-gray-100 text-gray-700">
                    ₹{q.subtotal.toLocaleString('en-IN')}
                  </td>
                ))}
              </tr>

              {/* GST rate / amount */}
              <tr className="border-b border-gray-50">
                <td className="py-3 pr-6 font-semibold text-gray-500">GST ({quotations[0]?.taxRate || 18}%)</td>
                {quotations.map(q => (
                  <td key={q._id} className="py-3 px-4 text-center border-l border-gray-100 text-gray-600">
                    ₹{q.taxAmount.toLocaleString('en-IN')}
                  </td>
                ))}
              </tr>

              {/* Lead Timeline */}
              <tr className="border-b border-gray-50">
                <td className="py-3 pr-6 font-semibold text-gray-500">Delivery Lead Time</td>
                {quotations.map(q => (
                  <td key={q._id} className="py-3 px-4 text-center border-l border-gray-100 text-gray-700 font-medium">
                    {q.deliveryTimeline} {q.deliveryTimelineUnit}
                  </td>
                ))}
              </tr>

              {/* Warranty */}
              <tr className="border-b border-gray-50">
                <td className="py-3 pr-6 font-semibold text-gray-500">Warranty details</td>
                {quotations.map(q => (
                  <td key={q._id} className="py-3 px-4 text-center border-l border-gray-100 text-gray-600 text-xs italic">
                    {q.warranty || 'No warranty details declared'}
                  </td>
                ))}
              </tr>

              {/* Payment Terms */}
              <tr className="border-b border-gray-50">
                <td className="py-3 pr-6 font-semibold text-gray-500">Payment Terms</td>
                {quotations.map(q => (
                  <td key={q._id} className="py-3 px-4 text-center border-l border-gray-100 text-gray-700">
                    {q.paymentTerms}
                  </td>
                ))}
              </tr>

              {/* Specific Items Unit comparison */}
              <tr className="bg-slate-100/50">
                <td colSpan={quotations.length + 1} className="py-2 px-3 font-bold text-xs text-gray-500 uppercase tracking-wider">
                  Line Items Price Comparison
                </td>
              </tr>
              {rfq.items?.map((item, idx) => (
                <tr key={item._id} className="border-b border-gray-50">
                  <td className="py-3 pr-6 text-gray-700">
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-xs text-gray-400 block">Qty: {item.quantity} {item.unit}</span>
                  </td>
                  {quotations.map(q => {
                    const qItem = q.items?.find(i => i.rfqItemName === item.name);
                    return (
                      <td key={q._id} className="py-3 px-4 text-center border-l border-gray-100 text-gray-700">
                        {qItem ? (
                          <div>
                            <span className="font-bold">₹{qItem.unitPrice.toLocaleString('en-IN')}</span>
                            <span className="text-xs text-gray-400 block">Total: ₹{qItem.totalPrice.toLocaleString('en-IN')}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not Quoted</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Actions Footer */}
              {isAdminOrProc && (
                <tr className="bg-slate-50/10">
                  <td className="py-4 pr-6 font-semibold text-gray-700">Action Controls</td>
                  {quotations.map(q => (
                    <td key={q._id} className="py-4 px-4 text-center border-l border-gray-100">
                      <div className="flex flex-col gap-2 items-center">
                        {q.status === 'submitted' && (
                          <>
                            <button
                              onClick={() => handleShortlist(q._id)}
                              className="btn btn-outline py-1.5 px-3 text-xs w-36 flex items-center justify-center gap-1 text-primary-600 border-primary-200 hover:bg-primary-50"
                            >
                              <CheckCircle size={14} /> Shortlist Bid
                            </button>
                            <button
                              onClick={() => setRejectingQuoteId(q._id)}
                              className="btn btn-outline py-1.5 px-3 text-xs w-36 flex items-center justify-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle size={14} /> Reject Bid
                            </button>
                          </>
                        )}
                        {q.status === 'shortlisted' && (
                          <button
                            onClick={() => handleRequestApproval(q._id)}
                            className="btn btn-primary py-1.5 px-3 text-xs w-40 flex items-center justify-center gap-1"
                          >
                            <Send size={14} /> Request Approval
                          </button>
                        )}
                        {q.status === 'rejected' && (
                          <span className="text-xs text-gray-400 italic">Rejected</span>
                        )}
                        {q.status === 'awarded' && (
                          <span className="text-xs text-green-600 font-bold">Awarded</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card py-12 text-center text-gray-400">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle size={24} className="text-gray-300" />
            <span>No proposals submitted yet to run a comparison matrix.</span>
          </div>
        </div>
      )}

      {/* Rejection Modal/Popup */}
      {rejectingQuoteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Enter Rejection Reason</h3>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State technical or price mismatches..."
                className="input"
                rows="4"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingQuoteId(null);
                    setRejectReason('');
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
