import React from 'react';
import { User } from '../types';
import { Shield, User as UserIcon, LogOut, Terminal, Layers, Globe } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  currentRole: 'user' | 'admin';
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onLogout: () => void;
  onSwitchRole?: () => void;
  onGoToLanding?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentRole,
  activeTab,
  onSelectTab,
  onLogout,
  onSwitchRole,
  onGoToLanding
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-zinc-950 shadow-md shadow-amber-500/10">
            <Terminal className="w-5 h-5 font-bold" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-zinc-100 whitespace-nowrap">
              Thần Long Mobile <span className="text-amber-400 font-semibold text-xs tracking-wider">AUTO PRO</span>
            </span>
            <span className="text-[11px] text-zinc-400">Hệ Thống Quản Lý Bản Quyền</span>
          </div>
        </div>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          {currentRole === 'admin' ? (
            <>
              <button
                onClick={() => onSelectTab?.('overview')}
                className={`whitespace-nowrap transition-colors hover:text-zinc-100 ${
                  activeTab === 'overview' ? 'text-amber-400 font-semibold' : ''
                }`}
              >
                Tổng Quan
              </button>
              <button
                onClick={() => onSelectTab?.('users')}
                className={`whitespace-nowrap transition-colors hover:text-zinc-100 ${
                  activeTab === 'users' ? 'text-amber-400 font-semibold' : ''
                }`}
              >
                Tài Khoản
              </button>
              <button
                onClick={() => onSelectTab?.('orders')}
                className={`whitespace-nowrap transition-colors hover:text-zinc-100 ${
                  activeTab === 'orders' ? 'text-amber-400 font-semibold' : ''
                }`}
              >
                Đơn Hàng
              </button>
              <button
                onClick={() => onSelectTab?.('revenue')}
                className={`whitespace-nowrap transition-colors hover:text-zinc-100 ${
                  activeTab === 'revenue' ? 'text-amber-400 font-semibold' : ''
                }`}
              >
                Sổ Cái Doanh Thu
              </button>
              <button
                onClick={() => onSelectTab?.('sql')}
                className={`whitespace-nowrap transition-colors hover:text-zinc-100 ${
                  activeTab === 'sql' ? 'text-amber-400 font-semibold' : ''
                }`}
              >
                SQL & Tích Hợp
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onSelectTab?.('dashboard')}
                className={`whitespace-nowrap transition-colors hover:text-zinc-100 ${
                  activeTab === 'dashboard' ? 'text-amber-400 font-semibold' : ''
                }`}
              >
                Bản Quyền Của Tôi
              </button>
              <button
                onClick={() => onSelectTab?.('history')}
                className={`whitespace-nowrap transition-colors hover:text-zinc-100 ${
                  activeTab === 'history' ? 'text-amber-400 font-semibold' : ''
                }`}
              >
                Lịch Sử Gia Hạn
              </button>
              <button
                onClick={() => onSelectTab?.('machines')}
                className={`whitespace-nowrap transition-colors hover:text-zinc-100 ${
                  activeTab === 'machines' ? 'text-amber-400 font-semibold' : ''
                }`}
              >
                Thiết Bị Auto
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Primary action & User profile */}
        <div className="flex items-center gap-4 shrink-0">
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
              {user.role === 'admin' ? (
                <Shield className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="font-semibold text-zinc-200">{user.username}</span>
              <span className="text-zinc-500 font-mono text-[10px] uppercase">({user.role})</span>
            </div>
          )}

          {user?.role === 'admin' && onSwitchRole && (
            <button
              onClick={onSwitchRole}
              title="Chuyển chế độ xem để test giao diện User"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors border border-zinc-700/60"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Chế độ xem: {currentRole === 'admin' ? 'Admin' : 'User'}</span>
            </button>
          )}

          {onGoToLanding && (
            <button
              onClick={onGoToLanding}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 transition-colors border border-emerald-800/60 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Trang Giới Thiệu</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/60 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
};
