import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';

// ── Auth pages ─────────────────────────────────────────────────────────────
import Login    from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// ── App pages (stubs — implemented progressively) ──────────────────────────
import Dashboard          from '@/pages/Dashboard';
import VendorList         from '@/pages/vendors/VendorList';
import VendorForm         from '@/pages/vendors/VendorForm';
import VendorDetail       from '@/pages/vendors/VendorDetail';
import RFQList            from '@/pages/rfqs/RFQList';
import RFQForm            from '@/pages/rfqs/RFQForm';
import RFQDetail          from '@/pages/rfqs/RFQDetail';
import QuotationList      from '@/pages/quotations/QuotationList';
import QuotationForm      from '@/pages/quotations/QuotationForm';
import QuotationComparison from '@/pages/quotations/QuotationComparison';
import ApprovalList       from '@/pages/approvals/ApprovalList';
import POList             from '@/pages/purchaseOrders/POList';
import PODetail           from '@/pages/purchaseOrders/PODetail';
import InvoiceList        from '@/pages/invoices/InvoiceList';
import InvoiceDetail      from '@/pages/invoices/InvoiceDetail';
import Reports            from '@/pages/Reports';
import ActivityLogs       from '@/pages/ActivityLogs';
import AdminPanel         from '@/pages/AdminPanel';
import NotFound           from '@/pages/NotFound';

// ── Query Client ───────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  }
});

// ── Protected Route ────────────────────────────────────────────────────────
function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  // Show full-screen spinner while session is being restored
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 z-50">
        <div className="w-10 h-10 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading VendorBridge…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.some(r => hasRole(r))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout><div /></Layout>;
}

// Simplified wrapper: renders <Layout> with <Outlet> internally
function ProtectedLayout({ allowedRoles }) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 z-50">
        <div className="w-10 h-10 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading VendorBridge…</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.some(r => hasRole(r))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout />;
}

// ── Root redirect ──────────────────────────────────────────────────────────
function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              },
              success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
            }}
          />

          <Routes>
            {/* Public routes */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/"         element={<RootRedirect />} />

            {/* Protected — all authenticated users */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard"      element={<Dashboard />} />
              <Route path="/rfqs"           element={<RFQList />} />
              <Route path="/rfqs/:id"       element={<RFQDetail />} />
              <Route path="/quotations"     element={<QuotationList />} />
              <Route path="/quotations/compare/:rfqId" element={<QuotationComparison />} />
              <Route path="/purchase-orders"    element={<POList />} />
              <Route path="/purchase-orders/:id" element={<PODetail />} />
              <Route path="/invoices"       element={<InvoiceList />} />
              <Route path="/invoices/:id"   element={<InvoiceDetail />} />
              <Route path="/activity"       element={<ActivityLogs />} />
              <Route path="/vendors/:id"    element={<VendorDetail />} />
            </Route>

            {/* Protected — vendor role only */}
            <Route element={<ProtectedLayout allowedRoles={['vendor']} />}>
              <Route path="/quotations/:rfqId/submit" element={<QuotationForm />} />
            </Route>

            {/* Protected — admin + procurement_officer */}
            <Route element={<ProtectedLayout allowedRoles={['admin','procurement_officer']} />}>
              <Route path="/vendors/new"      element={<VendorForm />} />
              <Route path="/vendors/:id/edit" element={<VendorForm />} />
              <Route path="/rfqs/new"         element={<RFQForm />} />
            </Route>

            {/* Protected — admin + procurement_officer + manager */}
            <Route element={<ProtectedLayout allowedRoles={['admin','procurement_officer','manager']} />}>
              <Route path="/vendors"    element={<VendorList />} />
              <Route path="/approvals"  element={<ApprovalList />} />
              <Route path="/reports"    element={<Reports />} />
            </Route>

            {/* Protected — admin only */}
            <Route element={<ProtectedLayout allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminPanel />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
