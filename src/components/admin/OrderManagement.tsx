import React, { useState, useEffect } from 'react';
import { PaymentOrder } from '../../types';
import { apiAdminGetOrders, apiSimulatePayment } from '../../lib/api';
import { formatDate, formatDateTime, formatVND } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { Search, CreditCard, RefreshCw, Zap, CheckCircle2, Clock, AlertTriangle, ExternalLink } from 'lucide-react';

export const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [simulatingCode, setSimulatingCode] = useState<string | null>(null);

  const { showToast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiAdminGetOrders(statusFilter, search);
      setOrders(res);
    } catch (err: any) {
      showToast('Không thể tải danh sách đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleSimulate = async (orderCode: string) => {
    setSimulatingCode(orderCode);
    try {
      await apiSimulatePayment(orderCode);
      showToast(`Đã duyệt thanh toán thành công cho đơn ${orderCode}!`, 'success');
      fetchOrders();
    } catch (err: any) {
      showToast(err.message || 'Giả lập duyệt thất bại', 'error');
    } finally {
      setSimulatingCode(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Quản Lý Đơn Hàng Gia Hạn VietQR</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Theo dõi tất cả đơn tạo mã QR, trạng thái thanh toán và webhook từ Sepay.vn
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="px-3.5 py-2 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn (TLBB...), tài khoản hoặc mã giao dịch ngân hàng..."
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ thanh toán (Pending)</option>
            <option value="paid">Đã thanh toán (Paid)</option>
            <option value="expired">Đã quá hạn (Expired)</option>
            <option value="cancelled">Đã hủy (Cancelled)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="py-3.5 px-4 font-medium">Mã Đơn</th>
                <th className="py-3.5 px-4 font-medium">Khách Hàng</th>
                <th className="py-3.5 px-4 font-medium">Gói Cước</th>
                <th className="py-3.5 px-4 font-medium">Số Tiền</th>
                <th className="py-3.5 px-4 font-medium">Trạng Thái</th>
                <th className="py-3.5 px-4 font-medium">Mã GD Ngân Hàng</th>
                <th className="py-3.5 px-4 font-medium">Hạn Sau Khi Nạp</th>
                <th className="py-3.5 px-4 font-medium">Thời Gian Tạo</th>
                <th className="py-3.5 px-4 font-medium text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-400">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Đang tải danh sách đơn hàng...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    Không tìm thấy đơn hàng nào
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="hover:bg-zinc-800/30 transition-colors">
                    {/* Order Code */}
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {order.order_code}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200">{order.username || 'user'}</div>
                    </td>

                    {/* Months */}
                    <td className="py-3 px-4 text-zinc-300">
                      {order.months} Tháng
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 font-mono font-bold text-zinc-100">
                      {formatVND(order.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {order.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Đã nạp
                        </span>
                      ) : order.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" /> Chờ quét QR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3" /> Quá hạn
                        </span>
                      )}
                    </td>

                    {/* Bank Txn ID */}
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      {order.bank_txn_id || '—'}
                    </td>

                    {/* License After */}
                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {formatDate(order.license_after)}
                    </td>

                    {/* Created At */}
                    <td className="py-3 px-4 text-[11px] text-zinc-400">
                      <div>{formatDateTime(order.created_at)}</div>
                      {order.paid_at && (
                        <div className="text-emerald-400">TT: {formatDateTime(order.paid_at)}</div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {order.status === 'pending' ? (
                        <button
                          onClick={() => handleSimulate(order.order_code)}
                          disabled={simulatingCode === order.order_code}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 ml-auto"
                          title="Duyệt test tức thì mà không cần chuyển khoản thật"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Duyệt Test</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-mono">Hoàn tất</span>
                      )}
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
