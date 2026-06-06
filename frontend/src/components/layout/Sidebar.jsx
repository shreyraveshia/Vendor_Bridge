import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  CheckCircle,
  Building2,
  ShoppingCart,
  Receipt,
  BarChart2,
  Activity,
  Settings,
  LogOut,
  X,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';

const GROUPS = [
  {
    title: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null }
    ]
  },
  {
    title: 'Procurement',
    items: [
      { to: '/rfqs', label: 'RFQs', icon: FileText, roles: null },
      { to: '/quotations', label: 'Quotations', icon: MessageSquare, roles: null },
      { to: '/approvals', label: 'Approvals', icon: CheckCircle, roles: ['admin', 'manager', 'procurement_officer'] }
    ]
  },
  {
    title: 'Management',
    items: [
      { to: '/vendors', label: 'Vendors', icon: Building2, roles: ['admin', 'procurement_officer', 'manager'] },
      { to: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, roles: null },
      { to: '/invoices', label: 'Invoices', icon: Receipt, roles: null }
    ]
  },
  {
    title: 'Analytics',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart2, roles: ['admin', 'procurement_officer', 'manager'] },
      { to: '/activity', label: 'Activity Logs', icon: Activity, roles: null }
    ]
  },
  {
    title: 'System',
    items: [
      { to: '/admin', label: 'Admin Panel', icon: Settings, roles: ['admin'] }
    ]
  }
];

const ROLE_COLORS = {
  admin: 'bg-red-500/20 text-red-400 border border-red-500/30',
  procurement_officer: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  manager: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  vendor: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
};

const ROLE_LABELS = {
  admin: 'Admin',
  procurement_officer: 'Procurement',
  manager: 'Manager',
  vendor: 'Vendor',
};

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleItemClick = (to) => {
    navigate(to);
    onClose(); // Auto close on mobile
  };

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '??';

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800',
        'lg:translate-x-0 lg:static lg:z-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
      style={{ backgroundColor: '#0f172a' }} // Dark Slate
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-md
                          group-hover:bg-green-500 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight leading-none">VendorBridge</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-slate-400 text-[10px] leading-none">ERP Portal</span>
              <span className="bg-green-500/20 text-green-400 text-[8px] font-bold px-1 rounded">PRO</span>
            </div>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
        {GROUPS.map((group) => {
          // Filter items based on roles
          const visibleItems = group.items.filter(
            (item) => !item.roles || item.roles.some((r) => hasRole(r))
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block mb-1">
                {group.title}
              </span>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    location.pathname === item.to ||
                    (item.to !== '/dashboard' && location.pathname.startsWith(item.to));

                  return (
                    <button
                      key={item.to}
                      onClick={() => handleItemClick(item.to)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 group text-left border-l-2',
                        isActive
                          ? 'border-green-500 text-white bg-green-950/20 font-bold'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      )}
                    >
                      <item.icon
                        size={16}
                        className={clsx(
                          'flex-shrink-0 transition-colors',
                          isActive ? 'text-green-400' : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
                      <span className="flex-grow truncate">{item.label}</span>
                      <ChevronRight
                        size={12}
                        className={clsx(
                          'opacity-0 group-hover:opacity-100 transition-opacity',
                          isActive ? 'text-white' : 'text-slate-400'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/40 transition-colors mb-2">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-inner">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white text-xs font-bold truncate leading-snug">
              {user?.firstName} {user?.lastName}
            </h4>
            <span className={clsx('text-[8px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block capitalize', ROLE_COLORS[user?.role])}>
              {ROLE_LABELS[user?.role] || user?.role}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-950/20 transition-all duration-150"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
