import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';
import {
  Users,
  Settings,
  Database,
  UserPlus,
  ShieldCheck,
  Server,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Play,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/formatters';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'procurement_officer', label: 'Procurement Officer' },
  { value: 'manager', label: 'Manager' },
  { value: 'vendor', label: 'Vendor' }
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const queryClient = useQueryClient();

  // New User Form State
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'procurement_officer',
    company: '',
    phone: ''
  });

  // Query: Get All Users
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.users || [];
    }
  });

  // Query: Get DB Stats
  const { data: dbStats, isLoading: loadingDbStats } = useQuery({
    queryKey: ['admin', 'db-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/db-stats');
      return res.data.stats;
    }
  });

  // Query: Get API Health Status
  const { data: health, isLoading: loadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => {
      const res = await api.get('/health');
      return res.data;
    }
  });

  // Mutation: Create User
  const createUserMutation = useMutation({
    mutationFn: async (userData) => {
      return api.post('/admin/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowAddUserModal(false);
      setNewUser({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'procurement_officer',
        company: '',
        phone: ''
      });
      toast.success('System user onboarded successfully.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create user.');
    }
  });

  // Mutation: Change Role
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      return api.patch(`/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User authorization role updated.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update user role.');
    }
  });

  // Mutation: Toggle Status
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId) => {
      return api.patch(`/admin/users/${userId}/status`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(res.data.message || 'User login permission updated.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to change user status.');
    }
  });

  // Mutation: Clear Activity Logs
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      return api.post('/admin/clear-logs');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'db-stats'] });
      toast.success('Activity logs purged successfully.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to clear logs.');
    }
  });

  // Mutation: Run Seed Data
  const runSeedMutation = useMutation({
    mutationFn: async () => {
      return api.post('/seed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'db-stats'] });
      toast.success('Database seeded and reset to default demo dataset.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to seed database.');
    }
  });

  // Form submit handler
  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
      toast.error('Please fill in all required fields.');
      return;
    }
    createUserMutation.mutate(newUser);
  };

  // Convert uptime seconds to human-readable format
  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Admin Management Console</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Control system parameters, onboard staff, monitor health checks, and seed data.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-t-xl px-4 pt-1 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'users' ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-500' : 'border-transparent text-slate-500'
          }`}
        >
          <Users size={16} /> User Directory
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'system' ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-500' : 'border-transparent text-slate-500'
          }`}
        >
          <Settings size={16} /> System Audits
        </button>
        <button
          onClick={() => setActiveTab('seed')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'seed' ? 'border-green-600 text-green-600 dark:border-green-500 dark:text-green-500' : 'border-transparent text-slate-500'
          }`}
        >
          <Database size={16} /> Demo Seed Data
        </button>
      </div>

      {/* 1. USERS TAB */}
      {activeTab === 'users' && (
        <div className="card bg-white dark:bg-slate-900 overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Active System Users</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure roles, deactivate inactive accounts, or register new employees.</p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
            >
              <UserPlus size={14} /> Add New User
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
            <table className="table text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950">
                  <th className="font-bold text-slate-700 dark:text-slate-400">Full Name</th>
                  <th className="font-bold text-slate-700 dark:text-slate-400">Email Address</th>
                  <th className="font-bold text-slate-700 dark:text-slate-400">Company & Phone</th>
                  <th className="font-bold text-slate-700 dark:text-slate-400">Role</th>
                  <th className="text-center font-bold text-slate-700 dark:text-slate-400">Status</th>
                  <th className="font-bold text-slate-700 dark:text-slate-400">Last Session Login</th>
                  <th className="text-right font-bold text-slate-700 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersData?.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/35">
                    <td className="font-bold text-slate-900 dark:text-white">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="text-slate-600 dark:text-slate-300 font-medium">{u.email}</td>
                    <td>
                      <div className="text-[10px] text-slate-400">
                        <span className="font-bold block text-slate-500">{u.company || '—'}</span>
                        <span>{u.phone || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => changeRoleMutation.mutate({ userId: u._id, role: e.target.value })}
                        className="input py-1 px-2 text-[10px] font-bold w-36 capitalize"
                      >
                        {ROLE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                        u.isActive
                          ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/30'
                          : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/30'
                      }`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-slate-400 dark:text-slate-500 font-semibold font-mono text-[10px]">
                      {u.lastLogin ? formatDate(u.lastLogin) : 'Never Logged In'}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to ${u.isActive ? 'deactivate' : 'activate'} this user account?`)) {
                            toggleStatusMutation.mutate(u._id);
                          }
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                          u.isActive
                            ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/25'
                            : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/25'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SYSTEM TAB */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <div className="card p-5 bg-white dark:bg-slate-900 space-y-4 shadow-sm h-fit">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Server className="text-green-600" size={16} /> API Environment Health
              </h3>
              <button
                onClick={() => refetchHealth()}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Refresh Health Check"
              >
                <RefreshCw size={14} className={loadingHealth ? 'animate-spin' : ''} />
              </button>
            </div>
            
            {health ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400 font-medium">Gateway Connection</span>
                  <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                    <ShieldCheck size={14} /> Operational
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400 font-medium">Environment Mode</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{health.environment}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400 font-medium">Uptime Running</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatUptime(health.uptime)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400 font-medium">Heartbeat Stamp</span>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                    {new Date(health.timestamp).toLocaleTimeString('en-IN')}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-500 italic">API connection offline.</p>
            )}
          </div>

          {/* Database stats */}
          <div className="lg:col-span-2 card p-5 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Database Storage Registers
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {dbStats && Object.entries(dbStats).map(([collection, count]) => (
                <div key={collection} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1 bg-slate-50/30 dark:bg-slate-950/20">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{collection}</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">{count} <span className="text-xs text-slate-400 font-normal">records</span></h4>
                </div>
              ))}
            </div>

            {/* Clear audit logs section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 mt-4 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-300">Wipe System Audit Logs</h4>
                <p className="text-[10px] text-slate-400">Purge all entries in the audit logs collection. This action is irreversible.</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('CAUTION: You are about to clear ALL audit logs. This cannot be undone. Do you wish to proceed?')) {
                    clearLogsMutation.mutate();
                  }
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400"
              >
                <Trash2 size={14} /> Clear Activity Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEED DATA TAB */}
      {activeTab === 'seed' && (
        <div className="card p-5 bg-white dark:bg-slate-900 space-y-6 shadow-sm max-w-3xl">
          <div className="flex gap-4 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 text-amber-800 dark:text-amber-400">
            <AlertTriangle size={24} className="flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider">Destructive Operation Warning</h4>
              <p className="text-xs leading-relaxed font-semibold">
                Executing the Database Seeder will **DELETE** all documents across all 9 collections in the database.
                It will populate the database with a clean, realistic set of demo data.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Seed Dataset Specifications:</h3>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-disc pl-5 font-semibold">
              <li>**6 System Users**: 1 Admin, 1 Procurement Officer, 1 Manager, 3 Vendors.</li>
              <li>**5 Vendors**: Profiles configured for tax locations (Mumbai intra-state, Bangalore inter-state).</li>
              <li>**3 RFQs**: Sourcing laptops, infrastructure upgrades, and office furniture.</li>
              <li>**3 quotations**: Fully submitted for comparison.</li>
              <li>**1 Approved Request**: Authorized by the manager.</li>
              <li>**1 PO & 1 Invoice**: Mapped correctly for Mumbai (CGST+SGST).</li>
              <li>**10 Activity logs & 5 Notification messages** to populate tables instantly.</li>
            </ul>
          </div>

          <button
            onClick={() => {
              if (confirm('CRITICAL WARNING: This will drop all database collections! Are you sure you want to run the database seeder?')) {
                runSeedMutation.mutate();
              }
            }}
            disabled={runSeedMutation.isPending}
            className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={14} /> {runSeedMutation.isPending ? 'Seeding Database...' : 'Run Seed Data Process'}
          </button>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Register System User</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="p-5 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 block">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    className="input py-1.5"
                    placeholder="Rahul"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    className="input py-1.5"
                    placeholder="Sharma"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="input py-1.5"
                  placeholder="name@vendorbridge.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block">Account Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="input py-1.5"
                  placeholder="Min 8 characters"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500 block">Assigned Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="input py-1.5"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 block">Phone Number</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                    className="input py-1.5"
                    placeholder="10-digit number"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 block">Company Name</label>
                <input
                  type="text"
                  value={newUser.company}
                  onChange={(e) => setNewUser(prev => ({ ...prev, company: e.target.value }))}
                  className="input py-1.5"
                  placeholder="e.g. VendorBridge Pvt Ltd"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="btn btn-outline px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="btn-primary px-4 py-2 text-xs font-bold"
                >
                  {createUserMutation.isPending ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
