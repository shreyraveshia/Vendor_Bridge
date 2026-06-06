import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Users, FileText, MessageSquare, CheckCircle,
  ShoppingCart, Receipt, BarChart2, Activity, Settings,
  Bell, LogOut, Menu, X, ChevronRight, Building2
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { to: '/dashboard',      label: 'Dashboard',       icon: LayoutDashboard, roles: null },
  { to: '/vendors',        label: 'Vendors',          icon: Building2,       roles: ['admin','procurement_officer','manager'] },
  { to: '/rfqs',           label: 'RFQs',             icon: FileText,        roles: null },
  { to: '/quotations',     label: 'Quotations',       icon: MessageSquare,   roles: null },
  { to: '/approvals',      label: 'Approvals',        icon: CheckCircle,     roles: ['admin','manager','procurement_officer'] },
  { to: '/purchase-orders',label: 'Purchase Orders',  icon: ShoppingCart,    roles: null },
  { to: '/invoices',       label: 'Invoices',         icon: Receipt,         roles: null },
  { to: '/reports',        label: 'Reports',          icon: BarChart2,       roles: ['admin','procurement_officer','manager'] },
  { to: '/activity',       label: 'Activity Logs',    icon: Activity,        roles: null },
  { to: '/admin',          label: 'Admin Panel',      icon: Settings,        roles: ['admin'] },
];

const ROLE_COLORS = {
  admin:               'bg-red-100 text-red-700',
  procurement_officer: 'bg-blue-100 text-blue-700',
  manager:             'bg-purple-100 text-purple-700',
  vendor:              'bg-yellow-100 text-yellow-700',
};

const ROLE_LABELS = {
  admin:               'Admin',
  procurement_officer: 'Procurement',
  manager:             'Manager',
  vendor:              'Vendor',
};

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const navigate = useNavigate();

  const visibleNav = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.some(r => hasRole(r))
  );

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '??';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Backdrop (mobile) ─────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 flex flex-col transition-transform duration-300 ease-in-out',
          'w-[260px]',
          'lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: '#0f172a' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-md
                            group-hover:bg-primary-500 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-base leading-none">VendorBridge</div>
              <div className="text-slate-400 text-[10px] leading-none mt-0.5">Procurement ERP</div>
            </div>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx('sidebar-link', isActive && 'active')
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800
                          transition-colors group cursor-pointer mb-1"
               onClick={() => navigate('/dashboard')}
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center
                            text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </div>
              <span className={clsx(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                ROLE_COLORS[user?.role] || 'bg-gray-700 text-gray-300'
              )}>
                {ROLE_LABELS[user?.role] || user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                       text-slate-400 hover:text-red-400 hover:bg-red-950/30
                       transition-all duration-200"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center
                           justify-between px-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden btn-ghost p-2 rounded-lg"
            >
              <Menu size={20} />
            </button>
            {/* Breadcrumb placeholder — pages can override via portal */}
            <div id="breadcrumb-portal" />
          </div>
          <div className="flex items-center gap-2">
            <button
              className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100
                         hover:text-gray-700 transition-colors"
              onClick={() => navigate('/activity')}
              title="Notifications"
            >
              <Bell size={20} />
              {/* Unread dot — hydrated by pages */}
              <span id="notif-dot"
                className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500
                           rounded-full hidden" />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-gray-500 hover:bg-red-50
                         hover:text-red-600 transition-colors"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
