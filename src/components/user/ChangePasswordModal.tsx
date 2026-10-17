import React, { useState } from 'react';
import { apiChangePassword } from '../../lib/api';
import { useToast } from '../ui/Toast';
import { X, Lock, Check, AlertCircle } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ các trường thông tin');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp nhau');
      return;
    }

    setLoading(true);
    try {
      await apiChangePassword(oldPassword, newPassword, confirmPassword);
      showToast('Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới.', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      const errMsg = err.message || 'Đổi mật khẩu thất bại';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Đổi Mật Khẩu Tài Khoản</h3>
            <p className="text-xs text-zinc-400">Cập nhật mật khẩu đăng nhập tool và web</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Mật Khẩu Cũ</label>
            <input
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Mật Khẩu Mới (Tối thiểu 6 ký tự)</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Xác Nhận Mật Khẩu Mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Lưu Mật Khẩu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
