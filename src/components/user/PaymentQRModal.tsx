import React, { useState, useEffect } from 'react';
import { PaymentOrder } from '../../types';
import { apiCheckOrderStatus } from '../../lib/api';
import { formatVND, formatDate, formatCountdown } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import confetti from 'canvas-confetti';
import { X, Copy, Check, Clock, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PaymentQRModalProps {
  order: PaymentOrder & { bank_code?: string; bank_account?: string; bank_name?: string };
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (order: PaymentOrder) => void;
}

export const PaymentQRModal: React.FC<PaymentQRModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 mins
  const [status, setStatus] = useState<string>(order.status);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { showToast } = useToast();

  const bankCode = order.bank_code || 'VIETINBANK';
  const bankAccount = order.bank_account || '107872473033';
  const bankName = order.bank_name || 'NGUYEN VAN PHUC';

  // 15-min countdown timer
  useEffect(() => {
    if (!isOpen || status === 'paid') return;

    // Calculate remaining seconds based on expires_at
    const expTime = new Date(order.expires_at).getTime();
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setStatus('expired');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isOpen, order.expires_at, status]);

  // Polling every 5 seconds
  useEffect(() => {
    if (!isOpen || status === 'paid' || status === 'expired') return;

    const pollStatus = async () => {
      try {
        const updated = await apiCheckOrderStatus(order.order_code);
        if (updated.status === 'paid') {
          setStatus('paid');
          triggerSuccess(updated);
        }
      } catch (err) {
        // silent fail on network hiccups
      }
    };

    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [isOpen, order.order_code, status]);

  const triggerSuccess = (paidOrder: PaymentOrder) => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    showToast(`Thanh toán thành công! License đã được gia hạn đến ngày ${formatDate(paidOrder.license_after)}`, 'success');
    onPaymentSuccess(paidOrder);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast(`Đã sao chép ${field}: ${text}`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 relative overflow-hidden">
        {/* Top bar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {status === 'paid' ? (
          /* Success Screen */
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Thanh Toán Thành Công!</h3>
            <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">
              Hệ thống đã nhận được tiền và tự động gia hạn bản quyền cho tài khoản của bạn.
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 max-w-sm mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Mã đơn hàng:</span>
                <span className="font-mono font-semibold text-zinc-200">{order.order_code}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Số tiền thanh toán:</span>
                <span className="font-mono font-semibold text-emerald-400">{formatVND(order.amount)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Hạn dùng mới:</span>
                <span className="font-semibold text-amber-400">{formatDate(order.license_after)}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-7 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20"
            >
              Hoàn Tất & Quay Về Bảng Điều Khiển
            </button>
          </div>
        ) : status === 'expired' ? (
          /* Expired Screen */
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Đơn Hàng Đã Quá Hạn</h3>
            <p className="text-sm text-zinc-400 mt-2">
              Thời gian chuyển khoản 15 phút đã kết thúc. Vui lòng bấm hủy và tạo lại đơn mới.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Đóng & Tạo Lại Đơn Mới
            </button>
          </div>
        ) : (
          /* Active Payment QR Screen */
          <div>
            {/* Header with Countdown */}
            <div className="flex items-center justify-between mb-5 pr-8">
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Quét Mã VietQR Chuyển Khoản</h3>
                <p className="text-xs text-zinc-400">Tự động kích hoạt sau 3-5 giây nhận tiền</p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatCountdown(timeLeft)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* QR Image Box */}
              <div className="flex flex-col items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <div className="relative w-48 h-48 bg-white p-2 rounded-xl shadow-inner flex items-center justify-center">
                  <img
                    src={order.qr_url}
                    alt="VietQR Payment Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-center mt-3">
                  <div className="text-[11px] text-zinc-400">Mở app Ngân hàng để quét QR</div>
                  <div className="text-xs font-bold text-amber-400 font-mono mt-0.5">
                    {formatVND(order.amount)}
                  </div>
                </div>
              </div>

              {/* Transfer Details Form */}
              <div className="space-y-3 text-xs">
                {/* Bank */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <div className="text-[11px] text-zinc-500">Ngân Hàng Thụ Hưởng</div>
                  <div className="font-semibold text-zinc-200 flex justify-between items-center mt-0.5">
                    <span>{bankCode}</span>
                    <span className="text-[10px] text-zinc-500">{bankName}</span>
                  </div>
                </div>

                {/* Account Number */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-zinc-500">Số Tài Khoản</div>
                    <div className="font-mono font-bold text-zinc-100 text-sm mt-0.5">{bankAccount}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(bankAccount, 'Số tài khoản')}
                    className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Sao chép số tài khoản"
                  >
                    {copiedField === 'Số tài khoản' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Amount */}
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-zinc-500">Số Tiền Chuyển Khoản</div>
                    <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">{formatVND(order.amount)}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(order.amount.toString(), 'Số tiền')}
                    className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Sao chép số tiền"
                  >
                    {copiedField === 'Số tiền' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Transfer Content (CRITICAL) */}
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-amber-400">Nội Dung Chuyển Khoản (BẮT BUỘC)</div>
                    <div className="font-mono font-black text-amber-300 text-base mt-0.5 tracking-wider">
                      {order.order_code}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(order.order_code, 'Nội dung CK')}
                    className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors"
                    title="Sao chép mã đơn"
                  >
                    {copiedField === 'Nội dung CK' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Status Info */}
            <div className="mt-6 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-zinc-300 font-medium">Hệ thống đang chờ nhận tiền chuyển khoản...</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Tự động kích hoạt sau 3-5 giây nhận tiền</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
