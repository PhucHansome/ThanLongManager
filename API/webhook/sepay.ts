import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

const SEPAY_API_KEY = process.env.SEPAY_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method Not Allowed' });

  const authHeader = req.headers.authorization;
  const apiKey = authHeader ? authHeader.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim() : '';
  if (SEPAY_API_KEY && apiKey !== SEPAY_API_KEY) return res.status(401).json({ status: false, message: 'Sai API Key' });

  const { id: bank_txn_id, amount, description } = req.body;
  if (!bank_txn_id || !amount) return res.status(400).json({ status: false, message: 'Thiếu dữ liệu' });

  const match = (description || '').toUpperCase().match(/\b(TLBB[A-Z0-9]{4,10})\b/);
  const extractedOrderCode = match ? match[1] : null;

  if (!extractedOrderCode) {
    await supabase.from('bank_transactions').insert({ bank_txn_id: String(bank_txn_id), amount: Number(amount), description: `${description || ''} [NO ORDER CODE]`, raw_payload: req.body });
    return res.json({ status: true, message: 'Không tìm thấy mã đơn' });
  }

  try {
    const { data: order } = await supabase.from('payment_orders').select('*').eq('order_code', extractedOrderCode).maybeSingle();
    if (!order) return res.status(404).json({ status: false, message: 'Không tìm thấy đơn ' + extractedOrderCode });
    if (order.status === 'paid') return res.json({ status: true, message: 'Đã thanh toán trước đó' });

    await supabase.from('bank_transactions').insert({ bank_txn_id: String(bank_txn_id), amount: Number(amount), description: String(description || ''), raw_payload: req.body });
    await supabase.from('payment_orders').update({ status: 'paid', paid_at: new Date().toISOString(), bank_txn_id: String(bank_txn_id) }).eq('id', order.id);

    const { data: u } = await supabase.from('users').select('username').eq('id', order.user_id).maybeSingle();
    await supabase.rpc('fn_extend_license', { p_username: u?.username || 'user', p_months: Number(order.months) });
    await supabase.from('revenue_ledger').insert({ order_id: order.id, gross: Number(amount), commission_pct: 0, commission_amt: 0, net_amount: Number(amount), month: new Date().getMonth() + 1, year: new Date().getFullYear() });

    res.json({ status: true, message: 'Xác nhận thanh toán và gia hạn thành công!' });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
}