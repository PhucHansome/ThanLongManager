import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });
  
  const orderCode = req.query.orderCode as string; 
  if (!orderCode) return res.status(400).json({ status: false, message: 'Thiếu mã đơn hàng' });

  try {
    const { data: order, error } = await supabase.from('payment_orders').select('*').eq('order_code', orderCode).single();
    if (error || !order) return res.status(404).json({ status: false, message: 'Không tìm thấy đơn hàng' });
    return res.json({ status: true, order });
  } catch (err: any) {
    return res.status(500).json({ status: false, message: err.message });
  }
}