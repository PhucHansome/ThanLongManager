import React from 'react';
import { User } from '../types';
import { Shield, User as UserIcon, LogOut, Terminal, Layers, Download, BookOpen } from 'lucide-react';

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
  onSwitchRole
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        
        {/* Zone 1: Logo & Tên Tool */}
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

        {/* Zone 2: Navigation Links (Tabs) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          {currentRole === 'admin' ? (
            <>
              <button onClick={() => onSelectTab?.('overview')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'overview' ? 'text-amber-400 font-semibold' : ''}`}>Tổng Quan</button>
              <button onClick={() => onSelectTab?.('users')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'users' ? 'text-amber-400 font-semibold' : ''}`}>Tài Khoản</button>
              <button onClick={() => onSelectTab?.('orders')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'orders' ? 'text-amber-400 font-semibold' : ''}`}>Đơn Hàng</button>
              <button onClick={() => onSelectTab?.('revenue')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'revenue' ? 'text-amber-400 font-semibold' : ''}`}>Sổ Cái Doanh Thu</button>
            </>
          ) : (
            <>
              <button onClick={() => onSelectTab?.('dashboard')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'dashboard' ? 'text-amber-400 font-semibold' : ''}`}>Bản Quyền Của Tôi</button>
              <button onClick={() => onSelectTab?.('history')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'history' ? 'text-amber-400 font-semibold' : ''}`}>Lịch Sử Gia Hạn</button>
              <button onClick={() => onSelectTab?.('machines')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'machines' ? 'text-amber-400 font-semibold' : ''}`}>Thiết Bị Auto</button>
            </>
          )}
        </nav>

        {/* Zone 3: Buttons & User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* ⭐ THÊM NÚT TẢI TOOL & HƯỚNG DẪN DÀNH CHO USER */}
          {currentRole === 'user' && (
            <div className="hidden lg:flex items-center gap-2 mr-2">
              <a 
                href="https://link-tai-tool-cua-ban.com" // Thay link tải tool thật của bạn vào đây
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                Tải Tool Ngay
              </a>
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-lg transition-all border border-zinc-700">
                <BookOpen className="w-3.5 h-3.5" />
                Hướng Dẫn
              </button>
              <div className="w-px h-5 bg-zinc-800 mx-1"></div>
            </div>
          )}

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
            <button onClick={onSwitchRole} title="Chuyển chế độ xem" className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors border border-zinc-700/60 cursor-pointer">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Chế độ: {currentRole === 'admin' ? 'Admin' : 'User'}</span>
            </button>
          )}

          <button onClick={onLogout} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/60 rounded-lg border border-zinc-800 transition-colors cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
};