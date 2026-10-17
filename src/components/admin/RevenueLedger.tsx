import React, { useState, useEffect } from 'react';
import { RevenueLedgerItem } from '../../types';
import { apiAdminGetRevenue, getStoredToken } from '../../lib/api';
import { formatDateTime, formatVND } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { FileSpreadsheet, Download, RefreshCw, DollarSign, Percent, Wallet } from 'lucide-react';

export const RevenueLedger: React.FC = () => {
  const [items, setItems] = useState<RevenueLedgerItem[]>([]);
  const [summary, setSummary] = useState({ totalGross: 0, totalCommission: 0, totalNet: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [selectedYear, setSelectedYear] = useState<number | ''>(currentYear);

  const { showToast } = useToast();

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const res = await apiAdminGetRevenue(
        selectedMonth !== '' ? Number(selectedMonth) : undefined,
        selectedYear !== '' ? Number(selectedYear) : undefined
      );
      setItems(res.items);
      setSummary(res.summary);
    } catch (err: any) {
      showToast('Không thể tải sổ cái doanh thu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, [selectedMonth, selectedYear]);

  const handleExportCSV = () => {
    const token = getStoredToken();
    const url = `/api/admin/revenue/export?token=${token || ''}`;

    // Trigger download via anchor
    const a = document.createElement('a');
    a.href = url;
    a.download = `thanlong_revenue_ledger_${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Đang tải xuống tệp thanlong_revenue_ledger.csv', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Sổ Cái Doanh Thu (Revenue Ledger)</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ghi nhận chi tiết từng dòng doanh thu gộp, phí hoa hồng Sepay/gateway và thực nhận
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Tệp CSV</span>
          </button>

          <button
            onClick={fetchRevenue}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
            title="Tải lại"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Tổng Doanh Thu Gộp (Gross)</span>
            <DollarSign className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="font-mono font-bold text-xl text-zinc-200">
            {formatVND(summary.totalGross)}
          </div>
          <div className="text-[11px] text-zinc-500">Trước khi khấu trừ phí bên thứ 3</div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Phí Hoa Hồng Cổng Thanh Toán</span>
            <Percent className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-mono font-bold text-xl text-rose-400">
            {formatVND(summary.totalCommission)}
          </div>
          <div className="text-[11px] text-zinc-500">Chi phí dịch vụ Sepay / Ngân hàng</div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Doanh Thu Thực Nhận (Net)</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono font-bold text-xl text-emerald-400">
            {formatVND(summary.totalNet)}
          </div>
          <div className="text-[11px] text-zinc-500">Số tiền thực tế vào tài khoản của bạn</div>
        </div>
      </div>

      {/* Month / Year Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          <span>Bộ lọc thời gian:</span>
        </div>

        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value === '' ? '' : Number(e.target.value))}
          className="bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
        >
          <option value="">Tất cả các tháng</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>Tháng {m}</option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value === '' ? '' : Number(e.target.value))}
          className="bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
        >
          <option value="">Tất cả các năm</option>
          <option value={2026}>Năm 2026</option>
          <option value={2025}>Năm 2025</option>
        </select>

        <div className="text-xs text-zinc-500 ml-auto font-mono">
          Tổng cộng: {summary.count} bản ghi sổ cái
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
                <th className="py-3.5 px-4 font-medium text-right">Doanh Thu Gộp</th>
                <th className="py-3.5 px-4 font-medium text-right">Hoa Hồng (% / VND)</th>
                <th className="py-3.5 px-4 font-medium text-right">Thực Nhận (Net)</th>
                <th className="py-3.5 px-4 font-medium text-center">Kỳ Hạch Toán</th>
                <th className="py-3.5 px-4 font-medium">Thời Gian Ghi Sổ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Đang tải dữ liệu sổ cái...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Không có bản ghi doanh thu nào trong khoảng thời gian đã chọn
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {item.order_code || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-200">
                      {item.username || 'user'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-300">
                      {formatVND(item.gross)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-400">
                      -{formatVND(item.commission_amt)} ({item.commission_pct}%)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatVND(item.net_amount)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-zinc-400">
                      T{item.month}/{item.year}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {formatDateTime(item.created_at)}
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
