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
import { Youtube } from 'lucide-react';

function MainApp() {
  const [session, setSession] = useState<{ user: User; license: License | null } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentRoleView, setCurrentRoleView] = useState<'user' | 'admin'>('user');
  const [activeAdminTab, setActiveAdminTab] = useState<string>('overview');
  const [activeUserTab, setActiveUserTab] = useState<string>('dashboard');

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

  // ⭐ BẮT ĐẦU: CHẶN F12 VÀ CÁC PHÍM TẮT XEM MÃ NGUỒN
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Chặn phím F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }

      // 2. Chặn tổ hợp Ctrl + Shift + I / J / C (Mở DevTools)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)
      ) {
        e.preventDefault();
        return false;
      }

      // 3. Chặn Ctrl + U (Xem mã nguồn trang)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
        return false;
      }
    };

    // 4. Chặn chuột phải (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);
  // ⭐ KẾT THÚC: CHẶN F12

  const handleLoginSuccess = (newSession: AuthSession) => {
    setSession({ user: newSession.user, license: newSession.license });
    setCurrentRoleView(newSession.user.role);
    showToast(`Xin chào, ${newSession.user.full_name || newSession.user.username}!`, 'success');
  };

  const handleLogout = () => {
    clearStoredToken();
    setSession(null);
    showToast('Đã đăng xuất khỏi tài khoản', 'info');
  };

  const handleSwitchRole = () => {
    setCurrentRoleView(prev => (prev === 'admin' ? 'user' : 'admin'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-400 font-medium">Đang tải Thần Long Mobile Auto Pro...</span>
      </div>
    );
  }

  // 1. CHƯA ĐĂNG NHẬP: Hiển thị trực tiếp form Đăng nhập / Đăng ký
  if (!session) {
    return (
      <LoginModal
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // 2. ĐÃ ĐĂNG NHẬP: Khu vực quản lý (Admin / User)
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

      {/* Footer gọn gàng với link YouTube hướng dẫn */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © 2026 Thần Long Mobile Auto Pro · Tất cả quyền được bảo lưu
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Youtube className="w-4 h-4 text-rose-500" />
              <span>Xem Video Hướng Dẫn Về Tool Trên YouTube</span>
            </a>
            <span aria-hidden="true">·</span>
            <span className="text-[11px] text-zinc-600 font-mono">
              VietQR · SePay Webhook Auto
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