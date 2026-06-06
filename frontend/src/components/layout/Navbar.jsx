import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/axios';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  User,
  LogOut,
  CheckCircle,
  FileText,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  Key,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const NOTIF_ICONS = {
  rfq: FileText,
  quotation: MessageSquare,
  approval: CheckCircle,
  invoice: AlertCircle,
  system: ShieldCheck
};

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Poll Notifications
  const fetchNotifications = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications?limit=5'),
        api.get('/notifications/unread-count')
      ]);
      setNotifications(listRes.data.notifications || []);
      setUnreadCount(countRes.data.count || 0);
    } catch (err) {
      // swallow background polling errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  // Mark single as read
  const handleMarkAsRead = async (notifId, link) => {
    try {
      await api.patch(`/notifications/${notifId}/read`);
      fetchNotifications();
      setShowNotifDropdown(false);
      if (link) navigate(link);
    } catch (err) {
      toast.error('Failed to mark notification as read.');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      toast.success('All notifications marked as read.');
      fetchNotifications();
      setShowNotifDropdown(false);
    } catch (err) {
      toast.error('Failed to update notifications.');
    }
  };

  // Dynamic Route Title & Breadcrumb mapping
  const getRouteDetails = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return { title: 'Overview', crumb: 'Home / Dashboard' };
    if (path.startsWith('/vendors/new')) return { title: 'Onboard Vendor', crumb: 'Home / Vendors / Onboard' };
    if (path.startsWith('/vendors/') && path.endsWith('/edit')) return { title: 'Edit Vendor Profile', crumb: 'Home / Vendors / Edit' };
    if (path.startsWith('/vendors/')) return { title: 'Vendor Profile', crumb: 'Home / Vendors / Detail' };
    if (path.startsWith('/vendors')) return { title: 'Vendor Directory', crumb: 'Home / Vendors' };
    if (path.startsWith('/rfqs/new')) return { title: 'Create RFQ', crumb: 'Home / RFQs / Create' };
    if (path.startsWith('/rfqs/')) return { title: 'RFQ Requirements', crumb: 'Home / RFQs / Detail' };
    if (path.startsWith('/rfqs')) return { title: 'RFQ Sourcing', crumb: 'Home / RFQs' };
    if (path.startsWith('/quotations/compare/')) return { title: 'Bids Comparison', crumb: 'Home / RFQs / Comparison' };
    if (path.startsWith('/quotations/')) return { title: 'Submit Proposal', crumb: 'Home / Quotations / Submit' };
    if (path.startsWith('/quotations')) return { title: 'Quotations & Bids', crumb: 'Home / Quotations' };
    if (path.startsWith('/approvals')) return { title: 'Approvals Queue', crumb: 'Home / Approvals' };
    if (path.startsWith('/purchase-orders/')) return { title: 'Purchase Order Details', crumb: 'Home / Purchase Orders / Detail' };
    if (path.startsWith('/purchase-orders')) return { title: 'Purchase Orders', crumb: 'Home / Purchase Orders' };
    if (path.startsWith('/invoices/')) return { title: 'GST Tax Invoice', crumb: 'Home / Invoices / Detail' };
    if (path.startsWith('/invoices')) return { title: 'Invoices Ledger', crumb: 'Home / Invoices' };
    if (path.startsWith('/reports')) return { title: 'Procurement Reports', crumb: 'Home / Reports' };
    if (path.startsWith('/activity')) return { title: 'Audit Logs', crumb: 'Home / Activity' };
    if (path.startsWith('/admin')) return { title: 'System Console', crumb: 'Home / Admin' };
    return { title: 'VendorBridge ERP', crumb: 'Home' };
  };

  const { title, crumb } = getRouteDetails();

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '??';

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 flex-shrink-0 shadow-sm transition-colors duration-200">
      {/* Left: Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:block">
          <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
            {crumb}
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mt-1 leading-none">
            {title}
          </h1>
        </div>
      </div>

      {/* Right Tools section */}
      <div className="flex items-center gap-3">
        {/* Dark mode */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Toggle Theme"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 dark:text-white">Recent Updates</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-72 overflow-y-auto scrollbar-thin">
                {notifications.length > 0 ? (
                  notifications.map((notif) => {
                    const NotifIcon = NOTIF_ICONS[notif.type] || Bell;
                    return (
                      <div
                        key={notif._id}
                        onClick={() => handleMarkAsRead(notif._id, notif.link)}
                        className={`p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-850 cursor-pointer transition-colors ${
                          !notif.isRead ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                          !notif.isRead ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}>
                          <NotifIcon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-xs truncate ${!notif.isRead ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-600 dark:text-slate-400'}`}>
                            {notif.title}
                          </h4>
                          <p className="text-[10px] text-gray-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {notif.message}
                          </p>
                          <span className="text-[9px] text-gray-400 block mt-1">
                            {new Date(notif.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400 dark:text-slate-500">
                    No new notifications.
                  </div>
                )}
              </div>
              <Link
                to="/activity"
                onClick={() => setShowNotifDropdown(false)}
                className="block text-center py-2.5 bg-gray-50 dark:bg-gray-800 text-[10px] font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-800"
              >
                View Audit Log
              </Link>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-100 dark:bg-gray-800" />

        {/* User profile dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-black shadow-inner">
              {initials}
            </div>
            <span className="hidden md:flex items-center text-xs font-bold text-gray-700 dark:text-gray-300 gap-1">
              {user?.firstName}
              <ChevronDown size={14} className="text-gray-400" />
            </span>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 mt-1 leading-none truncate">
                  {user?.email}
                </p>
              </div>
              <div className="p-1">
                <Link
                  to="/dashboard"
                  onClick={() => setShowUserDropdown(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <User size={14} /> My Profile
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setShowUserDropdown(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Key size={14} /> Change Password
                </Link>
              </div>
              <div className="p-1 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors text-left"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
