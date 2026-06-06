import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  Plus,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Search,
  Users,
  MessageSquare,
  ArrowRight,
  Clock,
  Eye
} from 'lucide-react';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import StatusBadge from '@/components/shared/StatusBadge';
import toast from 'react-hot-toast';

const PRIORITY_CLASSES = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700 border border-red-200'
};

const CATEGORIES = ['IT & Technology', 'Construction', 'Office Supplies', 'Logistics', 'Electrical', 'Human Resources', 'Marketing', 'Consulting'];

export default function RFQList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const [rfqs, setRFQs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const canCreate = hasRole('admin', 'procurement_officer');

  const fetchRFQs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rfqs');
      setRFQs(res.data.rfqs || res.data || []);
    } catch (err) {
      toast.error('Failed to load RFQs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRFQs();
  }, []);

  // Compute stats on-the-fly from the full list
  const totalCount = rfqs.length;
  const draftCount = rfqs.filter(r => r.status === 'draft').length;
  const publishedCount = rfqs.filter(r => r.status === 'published').length;
  const underReviewCount = rfqs.filter(r => r.status === 'under_review').length;
  const awardedCount = rfqs.filter(r => r.status === 'awarded').length;

  const filteredRFQs = rfqs.filter(r => {
    const matchesSearch = r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.rfqNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? r.status === statusFilter : true;
    const matchesPriority = priorityFilter ? r.priority === priorityFilter : true;
    const matchesCategory = categoryFilter ? r.category === categoryFilter : true;

    // Date range filters
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(r.deadline) >= new Date(startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(r.deadline) <= new Date(endDate);
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesDate;
  });

  const getDeadlineInfo = (deadlineStr) => {
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Overdue / Closed', isOverdue: true, warning: false };
    }
    if (diffDays === 0) {
      return { text: 'Closes today!', isOverdue: false, warning: true };
    }
    if (diffDays < 7) {
      return { text: `${diffDays} days remaining`, isOverdue: false, warning: true };
    }
    return { text: `${diffDays} days remaining`, isOverdue: false, warning: false };
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Requests for Quotations (RFQs)</h1>
          <p className="text-sm text-gray-500">Draft sourcing requirements, publish requests, and evaluate quotes.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/rfq/new')}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus size={16} /> Create RFQ
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card p-4 text-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Total RFQs</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{loading ? '...' : totalCount}</h3>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-amber-400">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Drafts</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{loading ? '...' : draftCount}</h3>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-blue-500">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Published</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{loading ? '...' : publishedCount}</h3>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-indigo-500">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Under Review</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{loading ? '...' : underReviewCount}</h3>
        </div>
        <div className="card p-4 text-center border-t-4 border-t-green-500">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Awarded</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{loading ? '...' : awardedCount}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by RFQ number or title…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input text-xs w-full md:w-36">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="under_review">Under Review</option>
              <option value="awarded">Awarded</option>
              <option value="closed">Closed</option>
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input text-xs w-full md:w-36">
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input text-xs w-full md:w-40">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleClearFilters} className="btn btn-secondary py-2 text-xs">
              Clear
            </button>
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-50 dark:border-gray-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">From Deadline:</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input py-1.5 px-3 text-xs w-36" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">To Deadline:</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input py-1.5 px-3 text-xs w-36" />
          </div>
        </div>
      </div>

      {/* Grid List layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => <SkeletonCard key={idx} height="180px" />)}
        </div>
      ) : filteredRFQs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRFQs.map(rfq => {
            const dl = getDeadlineInfo(rfq.deadline);
            return (
              <div
                key={rfq._id}
                onClick={() => navigate(`/rfq/${rfq._id}`)}
                className="card p-5 hover:shadow-md cursor-pointer transition-shadow flex flex-col justify-between border-l-4"
                style={{ borderLeftColor: rfq.priority === 'urgent' ? '#dc2626' : rfq.priority === 'high' ? '#ea580c' : '#3b82f6' }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400">{rfq.rfqNumber}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${PRIORITY_CLASSES[rfq.priority]}`}>
                      {rfq.priority}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-1">{rfq.title}</h4>
                    <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">{rfq.category}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-800 pt-4 mt-4 text-[10px] font-semibold text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock size={12} className={dl.isOverdue || dl.warning ? 'text-red-500' : 'text-gray-400'} />
                    <span className={dl.isOverdue || dl.warning ? 'text-red-500 font-bold' : ''}>
                      {dl.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} /> {rfq.quotationsReceived || 0} quotes
                    </span>
                    {!isVendor && (
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {rfq.assignedVendors?.length || 0} invited
                      </span>
                    )}
                    <StatusBadge status={rfq.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card py-16 flex flex-col items-center justify-center text-center gap-2">
          <FolderOpen size={32} className="text-gray-300 dark:text-gray-700" />
          <h4 className="text-xs font-bold text-gray-800 dark:text-slate-300">No RFQs found</h4>
          <p className="text-[10px] text-gray-400">Try adjusting your filters or search keywords.</p>
        </div>
      )}
    </div>
  );
}
