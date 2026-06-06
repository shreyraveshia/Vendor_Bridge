import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Search, Plus, Calendar, AlertTriangle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { id: '', label: 'All RFQs' },
  { id: 'draft', label: 'Drafts' },
  { id: 'published', label: 'Published' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'awarded', label: 'Awarded' },
  { id: 'closed', label: 'Closed' }
];

const PRIORITY_BADGES = {
  low:     'bg-slate-100 text-slate-700',
  medium:  'bg-blue-100 text-blue-700',
  high:    'bg-orange-100 text-orange-700',
  urgent:  'bg-red-100 text-red-700',
};

export default function RFQList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [rfqs, setRFQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const canCreate = hasRole('admin', 'procurement_officer');

  useEffect(() => {
    const fetchRFQs = async () => {
      try {
        const res = await api.get('/rfqs');
        setRFQs(res.data.rfqs || res.data);
      } catch (err) {
        toast.error('Failed to load RFQs.');
      } finally {
        setLoading(false);
      }
    };
    fetchRFQs();
  }, []);

  const filteredRFQs = rfqs.filter(r => {
    const matchesSearch = r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.rfqNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = activeTab ? r.status === activeTab : true;
    const matchesPriority = priorityFilter ? r.priority === priorityFilter : true;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getRemainingDays = (deadlineDate) => {
    const diff = new Date(deadlineDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Expired';
    if (days === 0) return 'Closes Today';
    return `${days} days left`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Loading quotations index…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Requests for Quotations (RFQs)</h1>
          <p className="text-sm text-gray-500">Create, monitor, and award sourcing bids.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/rfqs/new')}
            className="btn btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus size={16} />
            Create RFQ
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white rounded-t-xl px-4 pt-1 shadow-sm overflow-x-auto scrollbar-none">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-4 rounded-t-none">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by RFQ number or title…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRFQs.length > 0 ? (
          filteredRFQs.map(rfq => {
            const remText = getRemainingDays(rfq.deadline);
            const isExpired = remText === 'Expired';
            return (
              <div
                key={rfq._id}
                onClick={() => navigate(`/rfqs/${rfq._id}`)}
                className="card p-5 hover:border-primary-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between border-l-4 border-l-primary-500"
                style={{ borderLeftColor: rfq.priority === 'urgent' ? '#dc2626' : rfq.priority === 'high' ? '#ea580c' : '#16a34a' }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-400">{rfq.rfqNumber}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGES[rfq.priority]}`}>
                      {rfq.priority}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1">{rfq.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">{rfq.category}</p>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{rfq.description}</p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-50 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                    <Calendar size={14} />
                    <span className={isExpired ? 'text-red-500 font-bold' : ''}>
                      {isExpired ? 'Expired' : `Closes: ${new Date(rfq.deadline).toLocaleDateString('en-IN')}`}
                    </span>
                    {!isExpired && <span className="text-gray-300">|</span>}
                    {!isExpired && <span className="text-primary-600 font-semibold">{remText}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-600">
                      {rfq.quotationsReceived || 0} bids
                    </span>
                    <span className={`badge ${
                      rfq.status === 'published' ? 'badge-success' :
                      rfq.status === 'under_review' ? 'badge-info' :
                      rfq.status === 'awarded' ? 'badge-success' : 'badge-warning'
                    }`}>
                      {rfq.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full card py-12 text-center text-gray-400">
            <div className="flex flex-col items-center gap-2">
              <AlertTriangle size={24} className="text-gray-300" />
              <span>No RFQs found matching these filters.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
