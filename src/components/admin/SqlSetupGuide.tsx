import React, { useState } from 'react';
import { useToast } from '../ui/Toast';
import { Database, Copy, Check, Terminal, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

const SQL_SCRIPT_PREVIEW = `-- THẦN LONG MOBILE AUTO PRO - SUPABASE RPC FUNCTIONS
-- Copy toàn bộ đoạn script này dán vào Supabase SQL Editor và nhấn Run!

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Bảng payment_orders (Đơn gia hạn VietQR)
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    months INT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    qr_url TEXT,
    bank_txn_id VARCHAR(100),
    license_before TIMESTAMPTZ NOT NULL,
    license_after TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- RPC: fn_create_renewal_order
CREATE OR REPLACE FUNCTION public.fn_create_renewal_order(
    p_user_id UUID,
    p_months INT,
    p_bank_code TEXT DEFAULT 'MBBank',
    p_bank_account TEXT DEFAULT '0987654321',
    p_bank_name TEXT DEFAULT 'NGUYEN VAN ADMIN'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
... (Xem chi tiết file supabase_schema_and_rpc.sql ở thư mục gốc)
$$;

-- RPC: fn_confirm_payment (Chống Race Condition bằng SELECT ... FOR UPDATE)
CREATE OR REPLACE FUNCTION public.fn_confirm_payment(
    p_order_code TEXT,
    p_bank_txn_id TEXT,
    p_amount NUMERIC,
    p_description TEXT DEFAULT '',
    p_raw_payload JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
... (Xem chi tiết file supabase_schema_and_rpc.sql ở thư mục gốc)
$$;`;

export const SqlSetupGuide: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = () => {
    // Copy the full content of supabase_schema_and_rpc.sql
    fetch('/supabase_schema_and_rpc.sql')
      .then(res => res.text())
      .then(text => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        showToast('Đã sao chép toàn bộ mã nguồn SQL vào Clipboard!', 'success');
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        navigator.clipboard.writeText(SQL_SCRIPT_PREVIEW);
        setCopied(true);
        showToast('Đã sao chép SQL vào Clipboard!', 'success');
        setTimeout(() => setCopied(false), 2500);
      });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">SQL Schema & Hướng Dẫn Tích Hợp Supabase / Sepay</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Tài liệu kết nối hạ tầng thực tế giữa Supabase PostgreSQL, Cổng Sepay.vn và Webhook tự động
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: SQL Script */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Mã SQL Supabase Hoàn Chỉnh</h3>
                <p className="text-xs text-zinc-400">File: supabase_schema_and_rpc.sql</p>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã Sao Chép' : 'Copy Toàn Bộ SQL'}</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Script này chứa đầy đủ các bảng dữ liệu gốc, các chỉ mục (indexes), các hàm bảo mật:
            <code className="text-amber-400 bg-zinc-950 px-1 py-0.5 rounded mx-1">fn_login_v2</code>,
            <code className="text-amber-400 bg-zinc-950 px-1 py-0.5 rounded mx-1">fn_change_password</code>,
            <code className="text-amber-400 bg-zinc-950 px-1 py-0.5 rounded mx-1">fn_create_renewal_order</code>, và
            <code className="text-amber-400 bg-zinc-950 px-1 py-0.5 rounded mx-1">fn_confirm_payment</code>.
          </p>

          <div className="relative">
            <pre className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-72 leading-relaxed">
              {SQL_SCRIPT_PREVIEW}
            </pre>
          </div>
        </div>

        {/* Card 2: Sepay Webhook Configuration */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">Cấu Hình Webhook Sepay.vn</h3>
              <p className="text-xs text-zinc-400">Thiết lập nhận thông báo biến động số dư tự động</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="text-[11px] font-medium text-zinc-500">1. URL Nhận Webhook</div>
              <div className="font-mono text-amber-400 font-semibold select-all break-all">
                https://your-domain.com/api/webhook/sepay
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="text-[11px] font-medium text-zinc-500">2. Phương Thức & Định Dạng</div>
              <div className="text-zinc-200">
                Phương thức: <span className="font-mono font-bold text-emerald-400">POST</span> · Content-Type: <span className="font-mono text-sky-400">application/json</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="text-[11px] font-medium text-zinc-500">3. Header Xác Thực (Authentication)</div>
              <div className="font-mono text-zinc-300">
                Authorization: Apikey {'<SEPAY_API_KEY>'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
              <div className="text-[11px] font-medium text-zinc-500">4. Quy Tắc Nhận Diện Mã Đơn Hàng</div>
              <div className="text-zinc-400 text-[11px]">
                Hệ thống tự động dùng Regex <code className="font-mono text-amber-400">\b(TLBB[A-Z0-9]{'{4,10}'})\b</code> để bóc tách mã đơn trong nội dung chuyển khoản của khách.
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>
              Hệ thống đã tích hợp sẵn cơ chế chống Race condition và chống Replay attack bằng cách kiểm tra trùng lặp khóa chính <code className="font-mono text-emerald-300">bank_txn_id</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
