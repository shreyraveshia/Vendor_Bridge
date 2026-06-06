import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* ── Sidebar (Fixed Left) ─────────────────────────────── */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Backdrop (Mobile overlay) ───────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Viewport area ────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-0">
        {/* Top Navbar */}
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Render Toast notifications in context */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: '600',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            background: '#ffffff',
            color: '#1e293b'
          },
          success: {
            iconTheme: {
              primary: '#16a34a',
              secondary: '#ffffff'
            }
          },
          error: {
            iconTheme: {
              primary: '#dc2626',
              secondary: '#ffffff'
            }
          }
        }}
      />
    </div>
  );
}
