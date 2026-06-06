import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Check, X, Clock, Calendar, HelpCircle, User, Award, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApprovalList() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'

  const isManagerOrAdmin = hasRole('manager', 'admin');

  const fetchApprovals = async () => {
    try {
      const res = await api.get('/approvals');
      setApprovals(res.data.approvals || res.data);
    } catch (err) {
      toast.error('Failed to load approvals workflow.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleActionClick = (approval, type) => {
    setSelectedApproval(approval);
    setActionType(type);
    setRemarks('');
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      toast.error('Remarks are required for audit trail.');
      return;
    }

    try {
      if (actionType === 'approve') {
        await api.patch(`/approvals/${selectedApproval._id}/approve`, { remarks });
        toast.success('Approval step signed off.');
      } else {
        await api.patch(`/approvals/${selectedApproval._id}/reject`, { remarks });
        toast.success('Approval request rejected.');
      }
      setSelectedApproval(null);
      setActionType(null);
      fetchApprovals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sign off approval.');
    }
  };

  const filteredApprovals = approvals.filter(app => {
    if (activeTab === 'pending') {
      return app.status === 'pending';
    } else {
      return app.status !== 'pending';
    }
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling approval chains…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Approval Workflows</h1>
        <p className="text-sm text-gray-500">Sign off quotations, verify spend compliance, and authorize Purchase Orders.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white rounded-t-xl px-4 pt-1 shadow-sm">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'pending' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Clock size={16} /> Pending Actions
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'history' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Check size={16} /> Closed Decisions
        </button>
      </div>

      {/* Grid of Workflows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-t-none">
        {filteredApprovals.length > 0 ? (
          filteredApprovals.map(app => {
            const currentStep = app.approvalSteps?.find(s => s.stepNumber === app.currentStep);
            const isAssignedToMe = isManagerOrAdmin && currentStep?.approver?._id === user?.id;

            return (
              <div key={app._id} className="card p-5 space-y-4 flex flex-col justify-between border-t-4 border-t-primary-600">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400">{app.approvalNumber}</span>
                    <span className={`badge ${
                      app.status === 'approved' ? 'badge-success' :
                      app.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1">{app.rfq?.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Vendor: <span className="font-semibold">{app.vendor?.companyName}</span></p>
                  </div>

                  {/* Financials details */}
                  <div className="flex items-center gap-6 py-2 px-3 bg-slate-50 rounded-lg text-xs font-medium text-gray-600">
                    <div>
                      <span>Quotations value</span>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">₹{app.totalAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <span>Requested By</span>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{app.requestedBy?.firstName} {app.requestedBy?.lastName}</p>
                    </div>
                  </div>

                  {/* Approval steps visualizer */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Approval Progress</span>
                    <div className="space-y-2">
                      {app.approvalSteps?.map(step => (
                        <div key={step._id} className="flex items-start justify-between text-xs p-2 rounded bg-slate-50/50 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              step.status === 'approved' ? 'bg-green-500' :
                              step.status === 'rejected' ? 'bg-red-500' : 'bg-amber-400'
                            }`} />
                            <span className="font-semibold text-gray-800">
                              Step {step.stepNumber}: {step.approver?.firstName} {step.approver?.lastName}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-500 font-medium capitalize">{step.status}</span>
                            {step.remarks && <p className="text-[10px] text-gray-400 mt-0.5 italic">"{step.remarks}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Manager pending actions */}
                {app.status === 'pending' && isAssignedToMe && (
                  <div className="flex gap-2 pt-4 border-t border-gray-50 mt-4">
                    <button
                      onClick={() => handleActionClick(app, 'reject')}
                      className="btn btn-outline flex-1 py-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 flex items-center justify-center gap-1"
                    >
                      <X size={14} /> Reject Ticket
                    </button>
                    <button
                      onClick={() => handleActionClick(app, 'approve')}
                      className="btn btn-primary flex-1 py-1.5 text-xs flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> Approve Step
                    </button>
                  </div>
                )}

                {/* General overdue date display */}
                {app.status === 'pending' && !isAssignedToMe && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 pt-3 border-t border-gray-50 mt-3 font-medium">
                    <Calendar size={12} />
                    <span>Due for sign-off by: {new Date(app.dueDate).toLocaleDateString('en-IN')}</span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full card py-12 text-center text-gray-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <HelpCircle size={24} className="text-gray-300" />
              <span>No approvals found in this bucket.</span>
            </div>
          </div>
        )}
      </div>

      {/* Decision Remarks Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-lg ${
                actionType === 'approve' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                {actionType === 'approve' ? <Check size={20} /> : <X size={20} />}
              </span>
              <h3 className="text-lg font-bold text-gray-900">
                {actionType === 'approve' ? 'Approve Sourcing Ticket' : 'Reject Sourcing Ticket'}
              </h3>
            </div>
            <p className="text-xs text-gray-400">
              Provide signing remarks for approval number <span className="font-semibold">{selectedApproval.approvalNumber}</span>.
            </p>
            <form onSubmit={handleActionSubmit} className="space-y-4">
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={actionType === 'approve' ? 'Remarks (e.g. quote matches budget, delivery terms look fine)' : 'Enter rejection comments...'}
                className="input text-sm"
                rows="4"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedApproval(null);
                    setActionType(null);
                    setRemarks('');
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${
                    actionType === 'approve' ? 'btn-primary' : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
