import React, { useState, useEffect } from 'react';
import { DashboardStats } from '../../types';
import { apiAdminGetStats } from '../../lib/api';
import { formatVND } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import {
  TrendingUp,
  Users,
  CreditCard,
  Calendar,
  Award,
  RefreshCw
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await apiAdminGetStats();
      setStats(data);
    } catch (err: any) {
      showToast('Không thể tải dữ liệu thống kê quản trị', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="py-24 flex flex-col justify-center items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-400">Đang tải số liệu thống kê...</span>
      </div>
    );
  }

  // Safe fallback properties
  const revenueThisMonth = stats.revenue_this_month ?? 0;
  const grossThisMonth = stats.gross_this_month ?? 0;
  const commissionThisMonth = stats.commission_this_month ?? 0;
  const revenueThisYear = stats.revenue_this_year ?? 0;
  const usersCount = stats.users_count ?? { total: 0, active: 0, locked: 0, expired: 0 };
  const ordersCount = stats.orders_count ?? { paid_this_month: 0, pending_this_month: 0, total_this_month: 0 };
  const monthlyRevenue12m = stats.monthly_revenue_12m ?? [];
  const top10Spenders = stats.top_10_spenders ?? [];

  // Max value for 12m chart scaling
  const maxMonthlyRevenue = Math.max(1, ...monthlyRevenue12m.map(m => m.net || 0));

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Bảng Điều Khiển Quản Trị</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Thống kê doanh thu thực tế, bản quyền người dùng và hiệu năng vận hành hệ thống
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="px-3.5 py-2 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* KPI 4 Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Doanh thu tháng này */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Doanh Thu Tháng Này (Net)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono font-bold text-2xl text-emerald-400">
            {formatVND(revenueThisMonth)}
          </div>
          <div className="text-[11px] text-zinc-500">
            Gộp: {formatVND(grossThisMonth)} · Hoa hồng: {formatVND(commissionThisMonth)}
          </div>
        </div>

        {/* KPI 2: Doanh thu năm nay */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Doanh Thu Năm Nay (Net)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono font-bold text-2xl text-amber-400">
            {formatVND(revenueThisYear)}
          </div>
          <div className="text-[11px] text-zinc-500">Đã khấu trừ 100% phí đối tác thứ 3</div>
        </div>

        {/* KPI 3: Thống kê User */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Tài Khoản Hoạt Động</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono font-bold text-2xl text-zinc-100">
            {usersCount.active} <span className="text-sm font-normal text-zinc-500">/ {usersCount.total} user</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Hết hạn: <span className="text-rose-400 font-semibold">{usersCount.expired}</span> · Đang khoá:{' '}
            <span className="text-amber-400 font-semibold">{usersCount.locked}</span>
          </div>
        </div>

        {/* KPI 4: Đơn hàng tháng này */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Đơn Hàng Tháng Này</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono font-bold text-2xl text-zinc-100">
            {ordersCount.paid_this_month} <span className="text-sm font-normal text-emerald-400">đã nạp</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Chờ quét QR: <span className="text-amber-400 font-semibold">{ordersCount.pending_this_month}</span> · Tổng:{' '}
            {ordersCount.total_this_month}
          </div>
        </div>
      </div>

      {/* 12-Month Revenue Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Biểu Đồ Doanh Thu 12 Tháng Gần Nhất</h2>
            <p className="text-xs text-zinc-400">Thu nhập ròng (Net Amount) sau khi trừ chiết khấu gateway</p>
          </div>
          <div className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
            Đơn vị: VNĐ
          </div>
        </div>

        <div className="h-56 flex items-end gap-2 sm:gap-4 pt-6 pb-2 border-b border-zinc-800">
          {monthlyRevenue12m.map((m, idx) => {
            const heightPct = Math.max(8, ((m.net || 0) / maxMonthlyRevenue) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on hover */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 border border-zinc-700 text-zinc-200 text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-lg">
                  <div className="font-bold text-amber-400">{formatVND(m.net || 0)}</div>
                  <div className="text-zinc-500">{m.order_count || 0} đơn hàng</div>
                </div>

                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-amber-600/70 to-amber-400 hover:to-amber-300 transition-all cursor-pointer"
                  style={{ height: `${heightPct}%` }}
                />

                <span className="text-[10px] text-zinc-400 mt-2 font-mono whitespace-nowrap">
                  {m.month_label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 10 Spenders Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Bảng Xếp Hạng Top 10 Khách Hàng Chi Nhiều Nhất</h2>
              <p className="text-xs text-zinc-400">Xếp hạng theo tổng giá trị các đơn hàng đã thanh toán thành công</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-3 font-medium w-16">Hạng</th>
                <th className="pb-3 font-medium">Tài Khoản</th>
                <th className="pb-3 font-medium">Họ Và Tên</th>
                <th className="pb-3 font-medium text-center">Số Lần Gia Hạn</th>
                <th className="pb-3 font-medium text-right">Tổng Tiền Nạp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {top10Spenders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-500">
                    Chưa có giao dịch nào được ghi nhận
                  </td>
                </tr>
              ) : (
                top10Spenders.map((spender, idx) => (
                  <tr key={spender.user_id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 font-mono font-bold">
                      {idx === 0 ? (
                        <span className="text-amber-400">#1 👑</span>
                      ) : idx === 1 ? (
                        <span className="text-zinc-300">#2 🥈</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600">#3 🥉</span>
                      ) : (
                        <span className="text-zinc-500">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 font-semibold text-zinc-200">{spender.username}</td>
                    <td className="py-3 text-zinc-400">{spender.full_name}</td>
                    <td className="py-3 text-center font-mono text-zinc-300">{spender.orders_count} đơn</td>
                    <td className="py-3 text-right font-mono font-bold text-amber-400">
                      {formatVND(spender.total_spent)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
