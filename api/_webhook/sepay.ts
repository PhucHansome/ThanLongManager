import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js'; // ⭐ THÊM DÒNG NÀY

const SEPAY_API_KEY = (process.env.SEPAY_API_KEY || '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  // 1. XÁC THỰC API KEY
  if (SEPAY_API_KEY) {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader ? authHeader.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim() : '';
    
    if (apiKey !== SEPAY_API_KEY) {
      return res.status(401).json({ status: false, message: 'Sai API Key xác thực SePay' });
    }
  }

  // 2. Trích xuất thông tin giao dịch
  const bank_txn_id = req.body?.id || req.body?.bank_txn_id || `TXN-${Date.now()}`;
  const amount = Number(req.body?.transferAmount ?? req.body?.amount ?? 0);
  const transferType = req.body?.transferType; 
  const content = String(req.body?.content || req.body?.description || '');

  if (transferType === 'out') {
    return res.json({ status: true, message: 'Bỏ qua giao dịch chuyển tiền ra' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ status: false, message: 'Thiếu dữ liệu số tiền' });
  }

  try {
    // 3. CHỐNG TRÙNG LẶP
    const { data: existingTxn } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('bank_txn_id', String(bank_txn_id))
      .maybeSingle();

    if (existingTxn) {
      return res.json({ status: true, message: 'Giao dịch đã xử lý' });
    }

    // 4. Trích xuất mã đơn
    const match = content.toUpperCase().match(/\b(TLBB[A-Z0-9]{4,12})\b/);
    const extractedOrderCode = match ? match[1] : null;

    if (!extractedOrderCode) {
      await supabase.from('bank_transactions').insert({
        bank_txn_id: String(bank_txn_id),
        amount: amount,
        description: `${content} [KHÔNG TÌM THẤY MÃ ĐƠN]`,
        raw_payload: req.body
      });
      return res.json({ status: true, message: 'Ghi nhận nhưng không có mã đơn' });
    }

    // 5. Xử lý đơn hàng
    const { data: order } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_code', extractedOrderCode)
      .maybeSingle();

    if (!order) {
      await supabase.from('bank_transactions').insert({
        bank_txn_id: String(bank_txn_id),
        amount: amount,
        description: `${content} [ĐƠN KHÔNG TỒN TẠI: ${extractedOrderCode}]`,
        raw_payload: req.body
      });
      return res.status(404).json({ status: false, message: `Không thấy đơn ${extractedOrderCode}` });
    }

    if (order.status === 1 || order.status === 'paid') {
      return res.json({ status: true, message: 'Đơn đã thanh toán' });
    }

    if (amount < Number(order.amount)) {
      await supabase.from('bank_transactions').insert({
        bank_txn_id: String(bank_txn_id),
        amount: amount,
        description: `${content} [THIẾU TIỀN]`,
        raw_payload: req.body
      });
      return res.status(400).json({ status: false, message: 'Chuyển thiếu tiền' });
    }

    // 6. Ghi nhận và cập nhật
    await supabase.from('bank_transactions').insert({
      bank_txn_id: String(bank_txn_id),
      amount: amount,
      description: content,
      raw_payload: req.body
    });

    await supabase.from('payment_orders').update({
        status: 1,
        paid_at: new Date().toISOString(),
        bank_txn_id: String(bank_txn_id)
      }).eq('id', order.id);

    // 7. Gia hạn License
    const { data: u } = await supabase.from('users').select('username').eq('id', order.user_id).maybeSingle();
    const targetUsername = u?.username || 'user';

    const rpc1 = await supabase.rpc('fn_extend_license', { p_user_id: order.user_id, p_months: Number(order.months) });
    if (rpc1.error) {
      await supabase.rpc('fn_extend_license', { p_username: targetUsername, p_months: Number(order.months) });
    }

    // 8. Sổ cái doanh thu
    const now = new Date();
    await supabase.from('revenue_ledger').insert({
      order_id: order.id,
      gross: amount,
      commission_pct: 0,
      commission_amt: 0,
      net_amount: amount,
      month: now.getMonth() + 1,
      year: now.getFullYear()
    });

    return res.json({ status: true, message: 'Thanh toán và gia hạn thành công!' });
  } catch (err: any) {
    console.error("Lỗi xử lý webhook SePay:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
}