import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Shield, User as UserIcon, LogOut, Terminal, Layers, Download, BookOpen } from 'lucide-react';
import { apiGetAppVersion } from '../lib/api';

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
  const [showGuide, setShowGuide] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('https://drive.google.com/file/d/1hLtyBcm8edK4vgmg3OcwdL1m-nJFD-EA/view?usp=sharing');

  // Tự động lấy link tải mới nhất từ DB
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const res = await apiGetAppVersion();
        if (res.update_url) {
          setDownloadUrl(res.update_url);
        }
      } catch (err) {
        console.error("Lỗi lấy link tải:", err);
      }
    };
    fetchVersion();
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-6 py-3.5 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        
        {/* Zone 1: Logo & Tên Tool (Dùng chung cho cả Admin và User) */}
        <div className="flex items-center gap-3 shrink-0">
          <img src="/icon.ico" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" />
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-zinc-100 whitespace-nowrap">
              Thần Long Mobile <span className="text-amber-400 font-semibold text-xs tracking-wider">AUTO PRO</span>
            </span>
            <span className="text-[11px] text-zinc-400">Hệ Thống Quản Lý Bản Quyền</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (CHỈ DÀNH CHO ADMIN) */}
        {currentRole === 'admin' && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <button onClick={() => onSelectTab?.('overview')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'overview' ? 'text-amber-400 font-semibold' : ''}`}>Tổng Quan</button>
            <button onClick={() => onSelectTab?.('users')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'users' ? 'text-amber-400 font-semibold' : ''}`}>Tài Khoản</button>
            <button onClick={() => onSelectTab?.('orders')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'orders' ? 'text-amber-400 font-semibold' : ''}`}>Đơn Hàng</button>
            <button onClick={() => onSelectTab?.('revenue')} className={`whitespace-nowrap transition-colors hover:text-zinc-100 cursor-pointer ${activeTab === 'revenue' ? 'text-amber-400 font-semibold' : ''}`}>Sổ Cái Doanh Thu</button>
          </nav>
        )}

        {/* Zone 3: Buttons & User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Nút Tải Tool & Hướng Dẫn (CHỈ DÀNH CHO USER) */}
          {currentRole === 'user' && (
            <div className="hidden lg:flex items-center gap-2 mr-2">
              <a 
                href={downloadUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                Tải Tool Ngay
              </a>
              <button 
                onClick={() => setShowGuide(!showGuide)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 font-medium text-xs rounded-lg transition-all border ${
                  showGuide 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                {showGuide ? 'Đóng Hướng Dẫn' : 'Hướng Dẫn'}
              </button>
              <div className="w-px h-5 bg-zinc-800 mx-1"></div>
            </div>
          )}

          {/* User Info */}
          {user && (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
              {user.role === 'admin' ? (
                <Shield className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="font-semibold text-zinc-100">{user.username}</span>
              <span className="text-zinc-500 font-mono text-[10px] uppercase">({user.role})</span>
            </div>
          )}

          {/* Nút chuyển chế độ dành cho Admin */}
          {user?.role === 'admin' && onSwitchRole && (
            <button onClick={onSwitchRole} title="Chuyển chế độ xem" className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors border border-zinc-700/60 cursor-pointer">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Chế độ: {currentRole === 'admin' ? 'Admin' : 'User'}</span>
            </button>
          )}

          {/* Nút Đăng xuất */}
          <button onClick={onLogout} className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/60 rounded-lg border border-zinc-800 transition-colors cursor-pointer">
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Popup Hướng dẫn sử dụng (Chỉ áp dụng cho User) */}
      {currentRole === 'user' && showGuide && (
        <div className="absolute top-full right-6 mt-2 w-full max-w-sm p-4 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 z-50">
          <h3 className="text-amber-500 font-bold mb-2 text-sm">📖 Hướng dẫn sử dụng Tool</h3>
          <div className="text-xs text-zinc-300 space-y-2">
            <p><strong>Bước 1:</strong> Tải Tool bằng nút phía trên và giải nén.</p>
            <p><strong>Bước 2:</strong> Chạy file <code className="bg-zinc-800 px-1 rounded text-amber-400">ThanLongAuto.exe</code> với quyền Administrator.</p>
            <p><strong>Bước 3:</strong> Đăng nhập bằng tài khoản bạn vừa tạo trên Website.</p>
            <p><strong>Lưu ý:</strong> Có file hướng dẫn chi tiết ở trong folder nén <span className="font-semibold text-zinc-200">HƯỚNG DẪN SỬ DỤNG TOOL.docx</span></p>
            <p className="text-amber-200/80 italic mt-2 border-t border-zinc-800 pt-2">*Tài khoản cần được Gia hạn License để có thể sử dụng Tool.</p>
          </div>
        </div>
      )}
    </header>
  );
};