import React, { useState, useEffect } from 'react';
import { apiLogin, apiRegister, apiGetSystemStatus } from '../lib/api';
import { AuthSession } from '../types';
import { useToast } from './ui/Toast';
import { apiGetAppVersion } from '../../lib/api';
import {
  Terminal,
  Lock,
  User as UserIcon,
  ArrowRight,
  Database,
  CheckCircle2,
  Mail,
  Phone,
  UserPlus,
  LogIn,
  AlertCircle,
  Youtube
} from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (session: AuthSession) => void;
  initialMode?: 'login' | 'register';
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onLoginSuccess,
  initialMode = 'login',
  onClose
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showGuide, setShowGuide] = useState(false);
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // System status
  const [sysStatus, setSysStatus] = useState<{
    connected: boolean;
    supabase_url?: string | null;
    real_users_count?: number;
    message?: string;
  } | null>(null);

  const [downloadUrl, setDownloadUrl] = useState('https://drive.google.com/file/d/1hLtyBcm8edK4vgmg3OcwdL1m-nJFD-EA/view?usp=sharing');

  const { showToast } = useToast();

  useEffect(() => {
    apiGetSystemStatus()
      .then(res => setSysStatus(res))
      .catch(() => setSysStatus({ connected: false }));
  }, []);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      showToast('Vui lòng nhập tài khoản và mật khẩu', 'error');
      return;
    }

    setLoginLoading(true);
    try {
      const session = await apiLogin(loginUsername, loginPassword);
      if (session.user) {
        showToast(`Đăng nhập thành công! Xin chào ${session.user.full_name || session.user.username}`, 'success');
        onLoginSuccess(session);
      }
    } catch (err: any) {
      const msg = err.message || 'Đăng nhập không thành công';
      showToast(msg, 'error');
    } finally {
      setLoginLoading(false);
    }
  };

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

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client Validation
    const cleanUser = regUsername.trim();
    if (!cleanUser) {
      showToast('Vui lòng nhập tên đăng nhập', 'error');
      return;
    }

    // username >= 3 ký tự, không dấu, không khoảng trắng
    if (!/^[a-zA-Z0-9_]{3,}$/.test(cleanUser)) {
      showToast('Tên đăng nhập phải từ 3 ký tự trở lên, không chứa dấu tiếng Việt và không có khoảng trắng', 'error');
      return;
    }

    if (regPassword.length < 6) {
      showToast('Mật khẩu phải từ 6 ký tự.', 'error');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    if (regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      showToast('Định dạng email không hợp lệ', 'error');
      return;
    }

    setRegLoading(true);
    try {
      const res = await apiRegister({
        username: cleanUser,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        full_name: regFullName.trim() || undefined,
        email: regEmail.trim() || undefined,
        phone: regPhone.trim() || undefined
      });

      showToast(res.message || 'Đăng ký thành công! Vui lòng đăng nhập.', 'success');
      // Tự động chuyển qua tab Đăng nhập và điền sẵn username
      setLoginUsername(cleanUser);
      setLoginPassword('');
      setMode('login');
    } catch (err: any) {
      showToast(err.message || 'Đăng ký thất bại', 'error');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Top Action Bar: Nút Tải Xuống & Hướng Dẫn */}
        <div className="flex items-center justify-center gap-3 mb-4">
          {/* Nút Tải Xuống - Thay link href bằng link thực tế của bạn */}
          <a 
            href={downloadUrl} // <-- Thay link tĩnh bằng biến downloadUrl
            target="_blank" 
            rel="noopener noreferrer"
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Tải Tool Ngay
          </a>

          {/* Nút Bung Hướng Dẫn */}
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl border border-zinc-700 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {showGuide ? 'Đóng Hướng Dẫn' : 'Hướng Dẫn Sử Dụng'}
          </button>
        </div>

        {/* Khu vực bung Hướng Dẫn */}
        {showGuide && (
          <div className="w-full max-w-md mx-auto mb-4 p-4 bg-zinc-900/90 border border-zinc-700 rounded-2xl animate-in fade-in slide-in-from-top-4 text-left">
            <h3 className="text-amber-500 font-bold mb-2 text-xs">📖 Hướng dẫn sử dụng Tool</h3>
            <div className="text-[11px] text-zinc-300 space-y-2">
              <p><strong>Bước 1:</strong> Tải Tool bằng nút phía trên và giải nén.</p>
              <p><strong>Bước 2:</strong> Chạy file <code className="bg-zinc-800 px-1 rounded">ThanLongAuto.exe</code> với quyền Administrator.</p>
              <p><strong>Bước 3:</strong> Đăng nhập bằng tài khoản bạn vừa tạo trên Website.</p>
              <p className="text-amber-200/80 italic mt-1">*Lưu ý: Tài khoản cần được Gia hạn License để có thể sử dụng Tool.</p>
            </div>
          </div>
        )}
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-zinc-950 shadow-xl shadow-amber-500/15 mb-3">
            <Terminal className="w-8 h-8 font-black" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Thần Long Mobile <span className="text-amber-400">Auto Pro</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Cổng Quản Lý Bản Quyền Tool & Tự Động Gia Hạn VietQR</p>
        </div>

        {/* Main Card with Tabs */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
          {/* Tabs: Đăng nhập / Đăng ký */}
          <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng Ký</span>
            </button>
          </div>

          {mode === 'login' ? (
            /* ================= FORM ĐĂNG NHẬP ================= */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-zinc-100">Đăng Nhập Quản Lý</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Xác thực trực tiếp bằng hàm RPC <code className="font-mono text-amber-400">fn_web_login</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Tên Đăng Nhập</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    placeholder="Nhập username"
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Mật Khẩu</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loginLoading ? (
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Đăng Nhập Hệ Thống</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-zinc-400">Chưa có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-xs text-amber-400 font-semibold hover:underline"
                >
                  Đăng ký ngay
                </button>
              </div>
            </form>
          ) : (
            /* ================= FORM ĐĂNG KÝ ================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="mb-3">
                <h2 className="text-base font-semibold text-zinc-100">Đăng Ký Tài Khoản Mới</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tạo tài khoản và giấy phép bản quyền qua <code className="font-mono text-amber-400">fn_web_register</code>
                </p>
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Tên Đăng Nhập <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    placeholder="Ít nhất 3 ký tự (không dấu, không khoảng trắng)"
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Họ Và Tên</label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={e => setRegFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Email & Phone grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Số Điện Thoại</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      placeholder="0987654321"
                      className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Mật Khẩu <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Xác Nhận Mật Khẩu <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Notice trial days */}
              <div className="text-[11px] text-zinc-400 bg-zinc-950/60 border border-zinc-800 rounded-xl p-2.5 leading-relaxed">
                <span className="text-amber-400 font-semibold">Lưu ý:</span> Tài khoản mới đăng ký mặc định chưa có ngày dùng (0 ngày). Sau khi đăng nhập, vui lòng bấm <span className="text-zinc-200 font-medium">"Gia Hạn License"</span> để kích hoạt bằng VietQR.
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {regLoading ? (
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Đăng Ký Tài Khoản</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <span className="text-xs text-zinc-400">Đã có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-amber-400 font-semibold hover:underline"
                >
                  Đăng nhập
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security badge footer */}
        <div className="text-center text-xs text-zinc-500 mt-6">
          <span>Tự động nhận diện IPv4 · Tương thích hoàn toàn Tool Automation PyQt5</span>
        </div>
      </div>
    </div>
  );
};
