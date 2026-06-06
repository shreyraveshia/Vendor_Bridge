import { useEffect, useState } from 'react';
import api from '@/api/axios';
import {
  Settings,
  Activity,
  UserCheck,
  Cpu,
  RefreshCw,
  Copy,
  Check,
  Server,
  ShieldCheck,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';

const DEMO_USERS = [
  { role: 'Admin', email: 'admin@vendorbridge.com', pass: 'Admin@123', desc: 'Manage system settings, users, and full compliance trail.' },
  { role: 'Procurement Officer', email: 'procurement@vendorbridge.com', pass: 'Proc@1234', desc: 'Onboard vendors, release RFQs, issue POs and verify invoices.' },
  { role: 'Manager / Approver', email: 'manager@vendorbridge.com', pass: 'Mgr@12345', desc: 'Authorize shortlists and sign off multi-stage purchase requests.' },
  { role: 'Vendor (TechCorp Solutions)', email: 'vendor1@techcorp.com', pass: 'Vend@1234', desc: 'A major IT hardware supplier from Mumbai.' },
  { role: 'Vendor (Infra Supply Co)', email: 'vendor2@infrasupply.com', pass: 'Vend@1234', desc: 'Reliable construction materials vendor from Bangalore.' },
  { role: 'Vendor (OfficeZone India)', email: 'vendor3@officezone.com', pass: 'Vend@1234', desc: 'Lowest price office supplier from Mumbai.' }
];

export default function AdminPanel() {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState(null);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await api.get('/health');
      setHealth(res.data);
    } catch (err) {
      toast.error('Failed to load system health checks.');
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    toast.success(`Copied ${type} details.`);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Console & Administration</h1>
          <p className="text-sm text-gray-500">Monitor health status, verified test credentials, and parameters.</p>
        </div>
        <button
          onClick={fetchHealth}
          className="btn btn-outline py-1.5 px-3 text-xs flex items-center gap-1"
        >
          <RefreshCw size={14} className={loadingHealth ? 'animate-spin' : ''} /> Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-5 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-2">
              <Server size={18} className="text-primary-600" />
              API Server Health
            </h3>

            {loadingHealth ? (
              <p className="text-xs text-gray-400 italic">Verifying connection...</p>
            ) : health ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Connection Status</span>
                  <span className="text-green-600 font-bold flex items-center gap-1">
                    <ShieldCheck size={14} /> Operational
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Environment Mode</span>
                  <span className="font-semibold text-gray-700 capitalize">{health.environment || 'development'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Server Uptime</span>
                  <span className="font-semibold text-gray-700">{formatUptime(health.uptime)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-400">Timestamp</span>
                  <span className="font-semibold text-gray-600">{new Date(health.timestamp).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                <AlertCircle size={14} /> Connection Failed
              </p>
            )}
          </div>

          {/* Database Info */}
          <div className="card p-5 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-2">
              <Database size={18} className="text-primary-600" />
              Database Status
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-400">Storage Engine</span>
                <span className="font-semibold text-gray-700">MongoDB Atlas</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-400">Data Seeding</span>
                <span className="font-semibold text-green-600">Active (eb56c79)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <UserCheck size={18} className="text-primary-600" />
                Demo Credentials Directory
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Use these pre-populated credentials to sign in and test role-restricted user flows.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_USERS.map(u => (
                <div key={u.email} className="p-4 border border-gray-100 rounded-xl space-y-2 bg-slate-50/20 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">{u.role}</span>
                    <span className="text-[10px] text-gray-400">Password: <span className="font-bold font-mono text-gray-700">{u.pass}</span></span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed min-h-[32px]">{u.desc}</p>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs font-medium">
                    <span className="font-mono text-gray-600 truncate mr-2" title={u.email}>{u.email}</span>
                    <button
                      onClick={() => handleCopy(u.email, u.role)}
                      className="p-1 rounded hover:bg-slate-200 text-gray-400 hover:text-gray-700 transition-all flex-shrink-0"
                      title="Copy Email"
                    >
                      {copiedEmail === u.email ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
