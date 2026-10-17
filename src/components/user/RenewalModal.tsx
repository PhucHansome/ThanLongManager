import React, { useState, useEffect } from 'react';
import { License, PaymentOrder, PricingPlan } from '../../types';
import { apiGetPricing, apiCreateRenewalOrder } from '../../lib/api';
import { formatVND, formatDate } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import { X, Calendar, Check, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface RenewalModalProps {
  isOpen: boolean;
  license: License | null;
  onClose: () => void;
  onOrderCreated: (order: PaymentOrder & { bank_code?: string; bank_account?: string; bank_name?: string }) => void;
}

export const RenewalModal: React.FC<RenewalModalProps> = ({
  isOpen,
  license,
  onClose,
  onOrderCreated
}) => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const fetchPricing = async () => {
      setLoading(true);
      try {
        const fetched = await apiGetPricing();
        setPlans(fetched);
        if (fetched.length > 0) {
          setSelectedMonths(fetched[0].months);
        }
      } catch (err: any) {
        showToast('Không thể tải bảng giá gia hạn', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchPricing();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlan = plans.find(p => p.months === selectedMonths);
  const isLicenseActive = license && new Date(license.end_date).getTime() >= Date.now();

  // Logic tính ngày hết hạn MỚI dự kiến:
  // CASE 1: license CÒN HẠN (end_date >= hôm nay) -> new_end = end_date + months
  // CASE 2: license ĐÃ HẾT HẠN (end_date < hôm nay) -> new_end = hôm nay + months
  const computeNewEndDate = (months: number): Date => {
    const base = isLicenseActive && license ? new Date(license.end_date) : new Date();
    const result = new Date(base);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  const newEstimatedDate = computeNewEndDate(selectedMonths);

  const handleStartRenewal = () => {
    if (!currentPlan) return;
    setShowConfirm(true);
  };

  const handleConfirmOrder = async () => {
    if (!currentPlan) return;
    setCreating(true);
    try {
      const order = await apiCreateRenewalOrder(selectedMonths);
      setShowConfirm(false);
      onClose();
      onOrderCreated(order);
    } catch (err: any) {
      showToast(err.message || 'Không thể tạo đơn hàng gia hạn', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {showConfirm ? (
          /* Step 2: Confirm Dialog */
          <div className="py-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100">Xác Nhận Tạo Đơn Gia Hạn</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Bạn có chắc muốn gia hạn <span className="font-semibold text-zinc-200">{selectedMonths} tháng</span> với giá{' '}
              <span className="font-semibold text-amber-400 font-mono">{formatVND(currentPlan?.price || 0)}</span> không?
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Gói dịch vụ:</span>
                <span className="font-medium text-zinc-200">{currentPlan?.label}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Tình trạng hiện tại:</span>
                <span className={isLicenseActive ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                  {isLicenseActive ? 'Đang còn hạn' : 'Đã hết hạn'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Hạn dùng mới dự kiến:</span>
                <span className="font-bold text-amber-400">{formatDate(newEstimatedDate.toISOString())}</span>
              </div>
              <div className="flex justify-between text-zinc-400 pt-2 border-t border-zinc-800">
                <span>Tổng thanh toán:</span>
                <span className="font-mono font-bold text-base text-zinc-100">{formatVND(currentPlan?.price || 0)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={creating}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                {creating ? (
                  <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Xác Nhận & Lấy Mã QR</span>
              </button>
            </div>
          </div>
        ) : (
          /* Step 1: Select Plan */
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Gia Hạn Bản Quyền Tool</h3>
                <p className="text-xs text-zinc-400">Chọn gói thời gian bạn muốn gia hạn</p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map(plan => {
                  const isSelected = selectedMonths === plan.months;
                  const estimatedForPlan = computeNewEndDate(plan.months);

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedMonths(plan.months)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/5'
                          : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected ? 'border-amber-400 bg-amber-400' : 'border-zinc-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-zinc-200">{plan.label}</span>
                            {plan.discount_pct > 0 && (
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                Tiết kiệm {plan.discount_pct}%
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            Hạn mới đến:{' '}
                            <span className="font-medium text-zinc-300">{formatDate(estimatedForPlan.toISOString())}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-zinc-100">{formatVND(plan.price)}</div>
                        <div className="text-[10px] text-zinc-500">
                          ~{formatVND(Math.round(plan.price / plan.months))}/tháng
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Preview Banner */}
            <div className="mt-5 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="text-zinc-400">
                <div>Quy tắc tính ngày:</div>
                <div className="text-[11px] text-zinc-500">
                  {isLicenseActive ? '• Còn hạn: Cộng dồn tiếp từ ngày kết thúc' : '• Đã hết hạn: Tính từ ngày hôm nay'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-zinc-500 text-[11px]">Hạn dùng mới:</div>
                <div className="font-bold text-amber-400">{formatDate(newEstimatedDate.toISOString())}</div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleStartRenewal}
                disabled={loading || !currentPlan}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Tiếp Tục & Xác Nhận</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
