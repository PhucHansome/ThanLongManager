import React, { useState, useEffect } from 'react';
import { User, License, PaymentOrder } from '../../types';
import { apiGetMe } from '../../lib/api';
import { formatDate, formatDateTime, formatVND } from '../../lib/utils';
import { ChangePasswordModal } from './ChangePasswordModal';
import { RenewalModal } from './RenewalModal';
import { PaymentQRModal } from './PaymentQRModal';
import { useToast } from '../ui/Toast';
import {
  ShieldCheck,
  KeyRound,
  Calendar,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  History,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Cpu
} from 'lucide-react';

interface UserDashboardProps {
  initialUser: User;
  initialLicense: License | null;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ initialUser, initialLicense }) => {
  const [user, setUser] = useState<User>(initialUser);
  const [license, setLicense] = useState<License | null>(initialLicense);
  const [machines, setMachines] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<PaymentOrder | null>(null);

  const { showToast } = useToast();

  const fetchLatestData = async () => {
    setRefreshing(true);
    try {
      const data = await apiGetMe();
      setUser(data.user);
      setLicense(data.license);
      setMachines(data.machines || []);
    } catch (err: any) {
      showToast('Không thể làm mới dữ liệu', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLatestData();
  }, []);

  const isExpired = !license || new Date(license.end_date).getTime() < Date.now();
  const daysLeft = license ? license.days_left : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Xin chào, {user.full_name || user.username}
            </h1>
            <span className="text-[11px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md">
              {user.role}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Quản lý giấy phép sử dụng Thần Long Mobile Auto Pro và gia hạn trực tiếp qua VietQR
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 w-full md:w-auto">
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-300 bg-zinc-800/90 hover:bg-zinc-700/90 hover:text-zinc-100 border border-zinc-700/70 transition-all flex items-center justify-center gap-2"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Đổi Mật Khẩu</span>
          </button>

          <button
            onClick={() => setIsRenewalModalOpen(true)}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gia Hạn License</span>
          </button>
        </div>
      </div>

      {/* Main Grid: License Card + Account Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 & 2: License Status (2 columns wide) */}
        <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">Thông Tin Bản Quyền Tool</h2>
                <div className="text-xs text-zinc-400">Trạng thái khóa bảo vệ máy khách</div>
              </div>
            </div>

            <button
              onClick={fetchLatestData}
              disabled={refreshing}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
              title="Làm mới trạng thái"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Metric Hero */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-400 font-medium">Trạng Thái</div>
              <div className="mt-1 flex items-center gap-1.5">
                {user.status === 0 ? (
                  <span className="text-sm font-bold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Đang bị khóa
                  </span>
                ) : isExpired ? (
                  <span className="text-sm font-bold text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Đã hết hạn
                  </span>
                ) : (
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Đang hoạt động
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-400 font-medium">Thời Gian Còn Lại</div>
              <div className="mt-1 font-mono font-bold text-2xl text-amber-400">
                {daysLeft} <span className="text-xs font-sans text-zinc-400 font-normal">ngày</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-400 font-medium">Ngày Hết Hạn</div>
              <div className="mt-1 font-mono font-semibold text-sm text-zinc-100">
                {license ? formatDate(license.end_date) : 'Chưa có license'}
              </div>
            </div>
          </div>

          {/* Days Left Bar */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Tiến trình hiệu lực bản quyền</span>
              <span className="font-mono text-zinc-300">
                {daysLeft > 0 ? `${daysLeft} ngày còn hiệu lực` : 'Hết hạn sử dụng'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  daysLeft > 10 ? 'bg-amber-400' : daysLeft > 3 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, (daysLeft / 30) * 100)}%` }}
              />
            </div>
          </div>

          {/* Quick CTA inside card */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
            <div className="text-xs text-zinc-400">
              {isExpired ? 'Gia hạn ngay để tiếp tục treo máy auto phụ bản và train quái' : 'Có thể cộng dồn thêm hạn sử dụng bất cứ lúc nào'}
            </div>
            <button
              onClick={() => setIsRenewalModalOpen(true)}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <span>Gia hạn ngay</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 3: Account Details Profile */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <Cpu className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Thông Tin Tài Khoản</h2>
              <div className="text-xs text-zinc-400">Hồ sơ đăng ký hệ thống</div>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-500">Tên Tài Khoản</div>
              <div className="font-semibold text-zinc-200 mt-0.5">{user.username}</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-500">Họ Và Tên</div>
              <div className="font-semibold text-zinc-200 mt-0.5">{user.full_name || 'Chưa cập nhật'}</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-500">Email & Số Điện Thoại</div>
              <div className="font-semibold text-zinc-200 mt-0.5">{user.email || 'Chưa cập nhật'}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">SĐT: {user.phone || 'Chưa cập nhật'}</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-500">Số Máy Đăng Ký (HWID)</div>
              <div className="font-mono font-bold text-amber-400 mt-0.5">
                {machines.length} / {user.max_machines || 1} máy tối đa
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <div className="text-[11px] text-zinc-500">Đăng Nhập Lần Cuối</div>
              <div className="font-mono text-zinc-300 mt-0.5">{formatDateTime(user.last_login_at)}</div>
              <div className="text-[11px] text-zinc-500 font-mono mt-0.5">IP: {user.last_login_ip || '127.0.0.1'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Machine Mappings Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
              <Laptop className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Thiết Bị Auto Đã Kết Nối (HWID Machine)</h2>
              <div className="text-xs text-zinc-400">Danh sách các máy tính chạy tool Windows PyQt5 đã xác thực bản quyền</div>
            </div>
          </div>

          <span className="text-xs font-mono text-zinc-400">
            {machines.length} thiết bị
          </span>
        </div>

        {machines.length === 0 ? (
          <div className="py-8 text-center bg-zinc-950 rounded-2xl border border-zinc-800/80">
            <Laptop className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <div className="text-xs text-zinc-400">Chưa ghi nhận thiết bị nào kết nối</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Đăng nhập tài khoản trên tool desktop để tự động ghi nhận máy
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machines.map((m, idx) => (
              <div
                key={m.id || idx}
                className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-200">{m.note || `Máy Tính #${idx + 1}`}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      Đã ghép nối
                    </span>
                  </div>
                  <div className="font-mono text-xs text-amber-400 font-semibold">{m.machine_id}</div>
                  <div className="text-[11px] text-zinc-500">
                    IP: {m.ip_address} · Hoạt động: {formatDateTime(m.last_active_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <RenewalModal
        isOpen={isRenewalModalOpen}
        license={license}
        onClose={() => setIsRenewalModalOpen(false)}
        onOrderCreated={(order) => {
          setActivePaymentOrder(order);
        }}
      />

      {activePaymentOrder && (
        <PaymentQRModal
          order={activePaymentOrder}
          isOpen={!!activePaymentOrder}
          onClose={() => {
            setActivePaymentOrder(null);
            fetchLatestData();
          }}
          onPaymentSuccess={() => {
            fetchLatestData();
          }}
        />
      )}
    </div>
  );
};
