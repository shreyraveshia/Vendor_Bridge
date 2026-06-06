import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Check, X, Clock, Calendar, HelpCircle, User, AlertTriangle, FileText, Building, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '@/components/shared/StatusBadge';

export default function ApprovalList() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [statusFilter, setStatusFilter] = useState('pending');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Review Modal state
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [remarks, setRemarks] = useState('');

  const isManager = hasRole('manager');
  const isAdmin = hasRole('admin');
  const isProcurement = hasRole('procurement_officer');

  // Role-appropriate title
  const getHeaderTitle = () => {
    if (isManager) return 'Pending My Approval';
    if (isAdmin) return 'All Approvals';
    if (isProcurement) return 'My Requested Approvals';
    return 'Approvals Queue';
  };

  const fetchApprovals = async () => {
    try {
      const res = await api.get('/approvals');
      setApprovals(res.data.approvals || res.data || []);
    } catch (err) {
      toast.error('Failed to load approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleActionSubmit = async (approvalId, actionType) => {
    if (actionType === 'reject' && !remarks.trim()) {
      toast.error('Remarks/Rejection reason is required for rejection.');
      return;
    }

    const confirmMsg = actionType === 'approve'
      ? 'Are you sure you want to sign off and approve this quotation proposal?'
      : 'Are you sure you want to reject this quotation proposal?';
      
    if (!window.confirm(confirmMsg)) return;

    const loadingToast = toast.loading(actionType === 'approve' ? 'Signing approval step...' : 'Rejecting proposal...');

    try {
      if (actionType === 'approve') {
        await api.patch(`/approvals/${approvalId}/approve`, { remarks });
        toast.success('Approval step signed off successfully.', { id: loadingToast });
      } else {
        await api.patch(`/approvals/${approvalId}/reject`, { remarks });
        toast.success('Approval request rejected.', { id: loadingToast });
      }
      setSelectedApproval(null);
      setRemarks('');
      fetchApprovals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit approval decision.', { id: loadingToast });
    }
  };

  // Date filtering logic
  const filteredApprovals = approvals.filter(app => {
    // Status filter
    const matchesStatus = statusFilter === 'all' ? true : app.status === statusFilter;
    
    // Date range filter
    let matchesDate = true;
    const appDate = new Date(app.createdAt);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && appDate >= start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && appDate <= end;
    }

    return matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling approval chains…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{getHeaderTitle()}</h1>
        <p className="text-sm text-gray-500">Sign off quotations, verify compliance parameters, and authorize Purchase Orders.</p>
      </div>

      {/* Filter Row */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input py-1.5 px-3 text-xs w-36"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input py-1.5 px-3 text-xs w-36"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input py-1.5 px-3 text-xs w-36"
            />
          </div>

          <button
            onClick={() => {
              setStatusFilter('pending');
              setStartDate('');
              setEndDate('');
            }}
            className="btn btn-secondary py-2 text-xs"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Cards List Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredApprovals.length > 0 ? (
          filteredApprovals.map(app => {
            const currentStepStep = app.approvalSteps?.find(s => s.stepNumber === app.currentStep);
            const isAssignedToMe = isManager && currentStepStep?.approver?._id === user?.id;

            return (
              <div
                key={app._id}
                className="card p-5 space-y-4 flex flex-col justify-between border-t-4 border-t-primary-600 dark:border-t-primary-500"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400">{app.approvalNumber}</span>
                    <div className="flex items-center gap-1.5">
                      {app.isOverdue && app.status === 'pending' && (
                        <span className="badge badge-danger text-[9px] font-bold py-0.5 px-2 flex items-center gap-0.5 animate-pulse">
                          <AlertTriangle size={10} /> OVERDUE
                        </span>
                      )}
                      <StatusBadge status={app.status} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1">{app.rfq?.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Vendor: <span className="font-semibold text-gray-700 dark:text-slate-300">{app.vendor?.companyName}</span>
                    </p>
                  </div>

                  {/* Financials details */}
                  <div className="flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-medium text-gray-600 dark:text-slate-400">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Quoted Amount</span>
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">₹{app.totalAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block uppercase">Requested By</span>
                      <p className="text-xs font-bold text-gray-800 dark:text-slate-300 mt-0.5">
                        {app.requestedBy?.firstName} {app.requestedBy?.lastName}
                      </p>
                    </div>
                  </div>

                  {/* Timeline progress dots */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Approval Step Progress</span>
                    <div className="space-y-1.5">
                      {app.approvalSteps?.map(step => (
                        <div key={step._id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full flex items-center justify-center text-white ${
                              step.status === 'approved' ? 'bg-green-500' :
                              step.status === 'rejected' ? 'bg-red-500' : 'bg-amber-400'
                            }`}>
                              {step.status === 'approved' && <Check size={6} />}
                              {step.status === 'rejected' && <X size={6} />}
                              {step.status === 'pending' && <Clock size={6} />}
                            </span>
                            <span className="font-semibold text-gray-850 dark:text-slate-350">
                              Step {step.stepNumber}: {step.approver?.firstName} {step.approver?.lastName}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`font-bold capitalize text-[10px] ${
                              step.status === 'approved' ? 'text-green-600' :
                              step.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                            }`}>{step.status}</span>
                            {step.remarks && <p className="text-[9px] text-gray-400 mt-0.5 italic">"{step.remarks}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-850 mt-4 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    Due Date: {new Date(app.dueDate).toLocaleDateString('en-IN')}
                  </span>
                  
                  {isAssignedToMe && app.status === 'pending' && (
                    <button
                      onClick={() => {
                        setSelectedApproval(app);
                        setRemarks('');
                      }}
                      className="btn btn-primary py-1 px-3 text-2xs uppercase tracking-wider font-extrabold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                    >
                      <UserCheck size={12} /> Review Proposal
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full card py-16 text-center text-gray-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <HelpCircle size={28} className="text-gray-300" />
              <span>No approvals found in this filter range.</span>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal for Manager */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-gray-100 dark:border-gray-850 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 rounded-lg">
                  <FileText size={18} />
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Review Sourcing Proposal</h3>
              </div>
              <span className="text-xs font-bold text-gray-400">{selectedApproval.approvalNumber}</span>
            </div>

            {/* Proposal Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* RFQ specs */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl space-y-2">
                <h4 className="font-bold text-gray-700 dark:text-slate-350 border-b border-gray-150/40 pb-1 flex items-center gap-1">
                  <FileText size={13} /> Sourcing Requirements
                </h4>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-450 uppercase block">RFQ Ref & Category</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedApproval.rfq?.rfqNumber} &bull; {selectedApproval.rfq?.category}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-455 uppercase block">Title</span>
                  <p className="font-bold text-gray-950 dark:text-white">{selectedApproval.rfq?.title}</p>
                </div>
              </div>

              {/* Quotation / Vendor specs */}
              <div className="p-3 bg-slate-50 dark:bg-slate-955/20 rounded-xl space-y-2">
                <h4 className="font-bold text-gray-700 dark:text-slate-350 border-b border-gray-150/40 pb-1 flex items-center gap-1">
                  <Building size={13} /> Bidder & Quote Details
                </h4>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-450 uppercase block">Supplier</span>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedApproval.vendor?.companyName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-455 uppercase block">Total Bid Value (GST Inc.)</span>
                  <p className="font-extrabold text-green-600 dark:text-green-400 text-sm">
                    ₹{selectedApproval.totalAmount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Sign-off Review Action Controls */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Decision Remarks / Audit Comments *
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="State signing details or rejection grounds (required for rejection)..."
                className="input text-xs"
                rows="3"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 border-t border-gray-50 dark:border-gray-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedApproval(null);
                  setRemarks('');
                }}
                className="btn btn-secondary py-2.5 px-4"
              >
                Cancel Review
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleActionSubmit(selectedApproval._id, 'reject')}
                  className="btn bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 px-4 flex items-center gap-1.5"
                >
                  <X size={14} /> Reject Proposal
                </button>
                
                <button
                  type="button"
                  onClick={() => handleActionSubmit(selectedApproval._id, 'approve')}
                  className="btn bg-green-600 hover:bg-green-700 text-white font-extrabold py-2.5 px-4 flex items-center gap-1.5"
                >
                  <Check size={14} /> Approve & Sign-Off
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
