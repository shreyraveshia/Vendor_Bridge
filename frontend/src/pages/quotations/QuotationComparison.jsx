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
  AlertCircle,
  Award,
  Calendar,
  Send,
  Star
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
  const [sortBy, setSortBy] = useState('price'); // 'price' or 'delivery'

  const isAdminOrProc = hasRole('admin', 'procurement_officer');

  const fetchComparison = async () => {
    try {
      const res = await api.get(`/quotations/compare/${rfqId}`);
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load comparison data.');
      navigate('/rfq');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [rfqId, navigate]);

  const handleShortlist = async (quoteId) => {
    const loadingToast = toast.loading('Shortlisting bid...');
    try {
      await api.patch(`/quotations/${quoteId}/shortlist`);
      toast.success('Quotation shortlisted successfully.', { id: loadingToast });
      fetchComparison();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to shortlist quotation.', { id: loadingToast });
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    const loadingToast = toast.loading('Rejecting bid...');
    try {
      await api.patch(`/quotations/${rejectingQuoteId}/reject`, {
        rejectionReason: rejectReason
      });
      toast.success('Quotation rejected successfully.', { id: loadingToast });
      setRejectingQuoteId(null);
      setRejectReason('');
      fetchComparison();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject quotation.', { id: loadingToast });
    }
  };

  const handleProceedToApproval = async (shortlistedQuoteId) => {
    const loadingToast = toast.loading('Creating approval request...');
    try {
      await api.post('/approvals', {
        quotationId: shortlistedQuoteId,
        rfqId: rfqId,
        priority: 'normal',
        remarks: 'Procurement-selected shortlisted quotation submitted for managerial approval.'
      });
      toast.success('Approval request created successfully!', { id: loadingToast });
      navigate('/approvals');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request approval.', { id: loadingToast });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Comparing bid specifications…</span>
      </div>
    );
  }

  if (!data) return null;

  const { rfq, quotations, comparisonSummary } = data;

  // Sorting logic (client-side)
  const sortedQuotations = [...quotations].sort((a, b) => {
    if (sortBy === 'price') {
      return a.totalAmount - b.totalAmount;
    } else {
      const getDays = (timeline, unit) => {
        let days = timeline || 0;
        if (unit === 'weeks') days *= 7;
        if (unit === 'months') days *= 30;
        return days;
      };
      return getDays(a.deliveryTimeline, a.deliveryTimelineUnit) - getDays(b.deliveryTimeline, b.deliveryTimelineUnit);
    }
  });

  // Check if at least one quotation is shortlisted
  const shortlistedQuote = quotations.find(q => q.status === 'shortlisted');

  // Compute lowest prices per item row
  const getMinPriceForItem = (itemName) => {
    let min = Infinity;
    quotations.forEach(q => {
      const qItem = q.items?.find(i => i.rfqItemName === itemName);
      if (qItem && qItem.unitPrice > 0 && qItem.unitPrice < min) {
        min = qItem.unitPrice;
      }
    });
    return min === Infinity ? 0 : min;
  };

  const itemMinPrices = {};
  rfq.items?.forEach(item => {
    itemMinPrices[item.name] = getMinPriceForItem(item.name);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-150 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/rfq/${rfqId}`)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Quotations Comparative Analysis</h1>
            <p className="text-xs text-gray-500 mt-1">
              {rfq?.rfqNumber} &bull; "{rfq?.title}" &bull; {comparisonSummary.totalQuotations} Bids Received
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setSortBy('price')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                sortBy === 'price' ? 'bg-white dark:bg-slate-900 shadow text-primary-600 font-bold' : 'text-slate-500'
              }`}
            >
              <DollarSign size={13} /> Sort by Price
            </button>
            <button
              onClick={() => setSortBy('delivery')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                sortBy === 'delivery' ? 'bg-white dark:bg-slate-900 shadow text-primary-600 font-bold' : 'text-slate-500'
              }`}
            >
              <Truck size={13} /> Sort by Delivery
            </button>
          </div>

          {/* Proceed to Approval Button */}
          {isAdminOrProc && shortlistedQuote && (
            <button
              onClick={() => handleProceedToApproval(shortlistedQuote._id)}
              className="btn bg-green-600 hover:bg-green-700 text-white font-extrabold flex items-center gap-1.5 text-xs py-2.5 px-4 shadow-md transition-transform active:scale-95"
            >
              <Send size={14} /> Proceed to Approval
            </button>
          )}
        </div>
      </div>

      {/* Summary Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Bids</span>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            {comparisonSummary.totalQuotations} Bids
          </h3>
        </div>
        <div className="card p-4 flex flex-col justify-between border-l-4 border-l-green-500">
          <span className="text-[10px] font-bold text-green-600 dark:text-green-500 uppercase tracking-wider">Lowest Bid</span>
          <h3 className="text-xl font-black text-green-600 dark:text-green-500 mt-1">
            ₹{comparisonSummary.priceRange.min.toLocaleString('en-IN')}
          </h3>
        </div>
        <div className="card p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Average Bid</span>
          <h3 className="text-xl font-black text-gray-750 dark:text-slate-350 mt-1">
            ₹{Math.round(comparisonSummary.priceRange.avg).toLocaleString('en-IN')}
          </h3>
        </div>
        <div className="card p-4 flex flex-col justify-between border-l-4 border-l-blue-500">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-wider">Fastest Delivery</span>
          <h3 className="text-xl font-black text-blue-600 dark:text-blue-500 mt-1">
            {comparisonSummary.fastestDelivery.days} Days
          </h3>
          <span className="text-[9px] text-gray-400 mt-1 truncate">({comparisonSummary.fastestDelivery.vendorName})</span>
        </div>
      </div>

      {/* Comparison Grid */}
      {sortedQuotations.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs border-spacing-0">
              <thead>
                <tr className="border-b border-gray-105 dark:border-gray-800">
                  <th className="py-4 px-4 font-bold text-gray-400 uppercase tracking-wider text-2xs min-w-[220px] bg-slate-50 dark:bg-slate-900 sticky left-0 z-20 border-r border-gray-100 dark:border-gray-800">
                    Quotations Specs
                  </th>
                  {sortedQuotations.map(q => {
                    const isLowestTotal = q._id.toString() === comparisonSummary.lowestQuotationId?.toString();
                    return (
                      <th key={q._id} className={`py-4 px-4 min-w-[240px] text-center border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 ${
                        isLowestTotal ? 'bg-green-50/10 dark:bg-green-950/10' : ''
                      }`}>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-sm font-black text-gray-900 dark:text-white block">{q.vendor?.companyName}</span>
                            {isLowestTotal && (
                              <span className="text-green-600 dark:text-green-500" title="Lowest Grand Total">
                                <Award size={15} />
                              </span>
                            )}
                          </div>
                          
                          {/* Vendor Rating Stars */}
                          <div className="flex items-center justify-center gap-0.5 text-amber-400">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                size={12}
                                fill={idx < Math.round(q.vendor?.rating || 0) ? 'currentColor' : 'none'}
                              />
                            ))}
                            <span className="text-gray-400 font-bold ml-1 text-2xs">({q.vendor?.rating?.toFixed(1) || 'N/A'})</span>
                          </div>

                          <span className="text-[10px] text-gray-400 font-semibold block">{q.quotationNumber}</span>
                          <span className="text-[9px] text-gray-400 block font-medium">Submitted: {new Date(q.createdAt).toLocaleDateString('en-IN')}</span>

                          <div className="flex justify-center gap-1.5 mt-2">
                            {isLowestTotal && (
                              <span className="badge badge-success text-[9px] font-bold py-0.5 px-2">
                                LOWEST PRICE
                              </span>
                            )}
                            <span className={`badge text-[9px] font-bold py-0.5 px-2 ${
                              q.status === 'shortlisted' ? 'badge-info' :
                              q.status === 'rejected' ? 'badge-danger' :
                              q.status === 'awarded' ? 'badge-success' : 'badge-warning'
                            }`}>
                              {q.status}
                            </span>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Grand Total Row (Prominent) */}
                <tr className="border-b border-gray-150 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-800/10 font-bold">
                  <td className="py-4 px-4 font-extrabold text-gray-800 dark:text-white bg-slate-100 dark:bg-slate-900 sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800">
                    Grand Total (Inc. GST)
                  </td>
                  {sortedQuotations.map(q => {
                    const isLowestTotal = q._id.toString() === comparisonSummary.lowestQuotationId?.toString();
                    return (
                      <td key={q._id} className={`py-4 px-4 text-center border-l border-gray-150 dark:border-gray-800 text-sm font-black ${
                        isLowestTotal ? 'text-green-600 dark:text-green-400 bg-green-50/20 dark:bg-green-950/20' : 'text-gray-950 dark:text-white'
                      }`}>
                        ₹{q.totalAmount.toLocaleString('en-IN')}
                      </td>
                    );
                  })}
                </tr>

                {/* Subtotal */}
                <tr className="border-b border-gray-50 dark:border-gray-850">
                  <td className="py-3 px-4 font-semibold text-gray-400 bg-slate-50/50 dark:bg-slate-900 sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800">
                    Subtotal (Excl. Tax)
                  </td>
                  {sortedQuotations.map(q => (
                    <td key={q._id} className="py-3 px-4 text-center border-l border-gray-50 dark:border-gray-850 text-gray-700 dark:text-gray-300 font-semibold">
                      ₹{q.subtotal.toLocaleString('en-IN')}
                    </td>
                  ))}
                </tr>

                {/* GST Tax Breakdowns */}
                <tr className="border-b border-gray-50 dark:border-gray-850">
                  <td className="py-3 px-4 font-semibold text-gray-400 bg-slate-50/50 dark:bg-slate-900 sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800">
                    GST Tax Rate & Amount
                  </td>
                  {sortedQuotations.map(q => (
                    <td key={q._id} className="py-3 px-4 text-center border-l border-gray-50 dark:border-gray-850 text-gray-650 dark:text-gray-400">
                      ₹{q.taxAmount.toLocaleString('en-IN')} <span className="text-[10px] font-semibold font-sans">({q.taxRate}%)</span>
                    </td>
                  ))}
                </tr>

                {/* Lead Timeline */}
                <tr className="border-b border-gray-50 dark:border-gray-850">
                  <td className="py-3 px-4 font-semibold text-gray-400 bg-slate-50/50 dark:bg-slate-900 sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800">
                    Delivery Lead Time
                  </td>
                  {sortedQuotations.map(q => {
                    const isFastest = q.vendor?.companyName === comparisonSummary.fastestDelivery.vendorName;
                    return (
                      <td key={q._id} className={`py-3 px-4 text-center border-l border-gray-50 dark:border-gray-850 font-bold ${
                        isFastest ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {q.deliveryTimeline} {q.deliveryTimelineUnit}
                      </td>
                    );
                  })}
                </tr>

                {/* Payment Terms */}
                <tr className="border-b border-gray-50 dark:border-gray-850">
                  <td className="py-3 px-4 font-semibold text-gray-400 bg-slate-50/50 dark:bg-slate-900 sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800">
                    Payment Terms
                  </td>
                  {sortedQuotations.map(q => (
                    <td key={q._id} className="py-3 px-4 text-center border-l border-gray-50 dark:border-gray-850 text-gray-700 dark:text-gray-300">
                      {q.paymentTerms}
                    </td>
                  ))}
                </tr>

                {/* Warranty */}
                <tr className="border-b border-gray-150 dark:border-gray-800">
                  <td className="py-3 px-4 font-semibold text-gray-400 bg-slate-50/50 dark:bg-slate-900 sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800">
                    Warranty details
                  </td>
                  {sortedQuotations.map(q => (
                    <td key={q._id} className="py-3 px-4 text-center border-l border-gray-50 dark:border-gray-850 text-gray-650 dark:text-gray-450 italic text-2xs">
                      {q.warranty || 'None declared'}
                    </td>
                  ))}
                </tr>

                {/* Line Items Pricing Rows */}
                <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold">
                  <td colSpan={sortedQuotations.length + 1} className="py-2 px-4 text-2xs text-gray-500 uppercase tracking-widest sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800">
                    Line Items Specs Comparison
                  </td>
                </tr>

                {rfq.items?.map((item) => {
                  const minPrice = itemMinPrices[item.name] || 0;
                  return (
                    <tr key={item._id} className="border-b border-gray-50 dark:border-gray-850 hover:bg-slate-50/20 dark:hover:bg-slate-800/10">
                      <td className="py-3.5 px-4 bg-slate-50/35 dark:bg-slate-900 sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800">
                        <span className="font-bold text-gray-800 dark:text-slate-200 block">{item.name}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Qty: {item.quantity} {item.unit}</span>
                      </td>
                      {sortedQuotations.map(q => {
                        const qItem = q.items?.find(i => i.rfqItemName === item.name);
                        const isLowest = qItem && qItem.unitPrice > 0 && qItem.unitPrice === minPrice;
                        return (
                          <td key={q._id} className={`py-3.5 px-4 text-center border-l border-gray-50 dark:border-gray-850 ${
                            isLowest ? 'bg-green-50 dark:bg-green-950/25 text-green-700 dark:text-green-400 font-extrabold' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {qItem ? (
                              <div>
                                <span className="block font-bold">₹{qItem.unitPrice.toLocaleString('en-IN')}</span>
                                <span className="text-[10px] text-gray-400 block mt-0.5">Total: ₹{qItem.totalPrice.toLocaleString('en-IN')}</span>
                                {(qItem.brand || qItem.specifications) && (
                                  <span className="text-[9px] text-gray-400 block italic mt-0.5 truncate max-w-[180px] mx-auto">
                                    {qItem.brand ? `[${qItem.brand}] ` : ''}{qItem.specifications || ''}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-450 italic text-2xs">Not Quoted</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Actions Footer */}
                {isAdminOrProc && (
                  <tr className="bg-slate-50/30 dark:bg-slate-900/10">
                    <td className="py-4 px-4 font-bold text-gray-650 bg-slate-100 dark:bg-slate-900 sticky left-0 z-10 border-r border-gray-100 dark:border-gray-800">
                      Decisions & Controls
                    </td>
                    {sortedQuotations.map(q => (
                      <td key={q._id} className="py-4 px-4 text-center border-l border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col gap-2 items-center">
                          {q.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => handleShortlist(q._id)}
                                className="btn btn-outline py-1.5 px-3 text-2xs w-36 flex items-center justify-center gap-1 text-primary-600 border-primary-200 hover:bg-primary-50"
                              >
                                <CheckCircle size={13} /> Shortlist Bid
                              </button>
                              <button
                                onClick={() => setRejectingQuoteId(q._id)}
                                className="btn btn-outline py-1.5 px-3 text-2xs w-36 flex items-center justify-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <XCircle size={13} /> Reject Bid
                              </button>
                            </>
                          )}
                          {q.status === 'shortlisted' && (
                            <span className="badge badge-info text-2xs font-extrabold flex items-center gap-0.5 py-1 px-3">
                              <CheckCircle size={12} /> Shortlisted
                            </span>
                          )}
                          {q.status === 'rejected' && (
                            <div className="text-center">
                              <span className="text-2xs text-red-500 font-bold block">Rejected</span>
                              {q.rejectionReason && (
                                <span className="text-[10px] text-gray-400 block mt-0.5 truncate max-w-[160px]" title={q.rejectionReason}>
                                  "{q.rejectionReason}"
                                </span>
                              )}
                            </div>
                          )}
                          {q.status === 'awarded' && (
                            <span className="badge badge-success text-2xs font-extrabold flex items-center gap-0.5 py-1 px-3">
                              <Award size={12} /> Awarded Contract
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card py-16 text-center text-gray-400 italic">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle size={28} className="text-gray-300" />
            <span>No proposals submitted yet to run a comparison matrix.</span>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingQuoteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Enter Rejection Reason</h3>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State technical, capacity, or pricing mismatch details..."
                className="input text-xs"
                rows="4"
                required
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingQuoteId(null);
                    setRejectReason('');
                  }}
                  className="btn btn-secondary py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary bg-red-650 hover:bg-red-700 text-white py-2"
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
