import React, { useState, useEffect } from 'react';
import { User, License, AuthSession } from './types';
import { apiGetMe, clearStoredToken, getStoredToken } from './lib/api';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { UserDashboard } from './components/user/UserDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserManagement } from './components/admin/UserManagement';
import { OrderManagement } from './components/admin/OrderManagement';
import { RevenueLedger } from './components/admin/RevenueLedger';
import { SqlSetupGuide } from './components/admin/SqlSetupGuide';
import { LandingPage } from './components/landing/LandingPage';

function MainApp() {
  const [session, setSession] = useState<{ user: User; license: License | null } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentRoleView, setCurrentRoleView] = useState<'user' | 'admin'>('user');
  const [activeAdminTab, setActiveAdminTab] = useState<string>('overview');
  const [activeUserTab, setActiveUserTab] = useState<string>('dashboard');

  // Navigation view: 'landing' (public) or 'portal' (authenticated 2-role management)
  const [currentView, setCurrentView] = useState<'landing' | 'portal'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'portal' || window.location.hash === '#portal') {
        return 'portal';
      }
    }
    return 'landing';
  });

  // Auth modal state for landing page triggers
  const [authModalState, setAuthModalState] = useState<{ isOpen: boolean; mode: 'login' | 'register' }>({
    isOpen: false,
    mode: 'login'
  });

  const { showToast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiGetMe();
        setSession({ user: res.user, license: res.license });
        setCurrentRoleView(res.user.role);
      } catch (err) {
        clearStoredToken();
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession({ user: newSession.user, license: newSession.license });
    setCurrentRoleView(newSession.user.role);
    setAuthModalState({ isOpen: false, mode: 'login' });
    setCurrentView('portal');
  };

  const handleLogout = () => {
    clearStoredToken();
    setSession(null);
    showToast('Đã đăng xuất khỏi tài khoản', 'info');
    setCurrentView('landing');
  };

  const handleSwitchRole = () => {
    setCurrentRoleView(prev => (prev === 'admin' ? 'user' : 'admin'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-400 font-medium">Đang tải Thần Long Mobile Auto Pro...</span>
      </div>
    );
  }

  // 1. PUBLIC LANDING PAGE (NO AUTH REQUIRED)
  if (currentView === 'landing') {
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => setAuthModalState({ isOpen: true, mode })}
          onGoToPortal={() => {
            if (session) {
              setCurrentView('portal');
            } else {
              setAuthModalState({ isOpen: true, mode: 'login' });
            }
          }}
          isLoggedIn={!!session}
          userName={session?.user.full_name || session?.user.username}
          userRole={session?.user.role}
        />

        {/* Auth modal overlay when opened from landing page */}
        {authModalState.isOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg my-8">
              <LoginModal
                initialMode={authModalState.mode}
                onLoginSuccess={handleLoginSuccess}
                onClose={() => setAuthModalState({ isOpen: false, mode: 'login' })}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. PORTAL: REQUIRE LOGIN
  if (!session) {
    return (
      <LoginModal
        onLoginSuccess={handleLoginSuccess}
        onClose={() => setCurrentView('landing')}
      />
    );
  }

  // 3. AUTHENTICATED MANAGEMENT PORTAL (2-ROLE)
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      <Navbar
        user={session.user}
        currentRole={currentRoleView}
        activeTab={currentRoleView === 'admin' ? activeAdminTab : activeUserTab}
        onSelectTab={tab => {
          if (currentRoleView === 'admin') setActiveAdminTab(tab);
          else setActiveUserTab(tab);
        }}
        onLogout={handleLogout}
        onSwitchRole={session.user.role === 'admin' ? handleSwitchRole : undefined}
        onGoToLanding={() => setCurrentView('landing')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentRoleView === 'admin' ? (
          /* Admin View */
          <div>
            {activeAdminTab === 'overview' && <AdminDashboard />}
            {activeAdminTab === 'users' && <UserManagement />}
            {activeAdminTab === 'orders' && <OrderManagement />}
            {activeAdminTab === 'revenue' && <RevenueLedger />}
            {activeAdminTab === 'sql' && <SqlSetupGuide />}
          </div>
        ) : (
          /* User View */
          <UserDashboard
            initialUser={session.user}
            initialLicense={session.license}
          />
        )}
      </main>

      {/* Quiet, clean footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © 2026 Thần Long Mobile Auto Pro · Tất cả quyền được bảo lưu
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('landing')}
              className="text-emerald-400 hover:underline cursor-pointer"
            >
              🌐 Xem Trang Giới Thiệu Landing Page
            </button>
            <span aria-hidden="true">·</span>
            <span className="text-[11px] text-zinc-600 font-mono">
              Supabase Postgres · VietQR API · Sepay.vn Webhook
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
