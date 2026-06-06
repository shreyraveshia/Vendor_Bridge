import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import { Search, Calendar, FileText, ArrowRight, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuotationList() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isVendor = hasRole('vendor');

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        const res = await api.get('/quotations');
        setQuotes(res.data.quotations || res.data);
      } catch (err) {
        toast.error('Failed to load quotations.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuotations();
  }, []);

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.quotationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.rfq?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          q.vendor?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? q.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Assembling bidding index…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quotations & Proposals</h1>
        <p className="text-sm text-gray-500">
          {isVendor ? 'Track your submitted bids and awards history.' : 'Monitor vendor submissions, comparative costs, and shortlists.'}
        </p>
      </div>

      {/* Filters card */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by quote number, vendor, or RFQ title…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
            <option value="awarded">Awarded</option>
          </select>
        </div>
      </div>

      {/* List Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="table">
            <thead>
              <tr>
                <th>Quotation No</th>
                <th>RFQ Sourcing Reference</th>
                {!isVendor && <th>Vendor Name</th>}
                <th className="text-right">Total Amount</th>
                <th>Delivery timeline</th>
                <th>Submission Date</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map(quote => (
                  <tr key={quote._id} className="hover:bg-gray-50/50">
                    <td className="font-semibold text-gray-900">{quote.quotationNumber}</td>
                    <td>
                      <Link to={`/rfq/${quote.rfq?._id || quote.rfq}`} className="text-primary-600 font-medium hover:underline">
                        {quote.rfq?.title || 'View RFQ details'}
                      </Link>
                    </td>
                    {!isVendor && (
                      <td>
                        <span className="font-semibold text-gray-800">{quote.vendor?.companyName}</span>
                      </td>
                    )}
                    <td className="text-right font-bold text-gray-900">
                      ₹{quote.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="text-gray-600 font-medium">
                      {quote.deliveryTimeline} {quote.deliveryTimelineUnit}
                    </td>
                    <td className="text-gray-600">
                      {new Date(quote.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${
                        quote.status === 'awarded' ? 'badge-success' :
                        quote.status === 'rejected' ? 'badge-danger' :
                        quote.status === 'shortlisted' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {quote.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-center">
                        <button
                          onClick={() => navigate(`/rfq/${quote.rfq?._id || quote.rfq}`)}
                          className="btn-ghost p-1.5 rounded hover:bg-slate-100 text-gray-600 hover:text-gray-900 flex items-center gap-1 text-xs"
                        >
                          Details <ArrowRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isVendor ? '7' : '8'} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert size={24} className="text-gray-300" />
                      <span>No quotations found matching parameters.</span>
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
