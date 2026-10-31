import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { verifyJWT, requireAdmin } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = verifyJWT(req, res);
  if (!authUser || !requireAdmin(authUser, res)) return;

  // ⭐ Lấy dữ liệu đơn hàng + Join với bảng users để lấy username
  let query = supabase
    .from('payment_orders')
    .select(`
      *,
      users (
        username,
        full_name
      )
    `)
    .order('created_at', { ascending: false });

  // Xử lý bộ lọc trạng thái (Chuyển từ chữ sang số cho khớp Database)
  if (req.query.status && req.query.status !== 'all') {
    if (req.query.status === 'pending') query = query.eq('status', 0);
    else if (req.query.status === 'paid') query = query.eq('status', 1);
    else if (req.query.status === 'expired') query = query.eq('status', 2); // Giả sử 2 là quá hạn/huỷ
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ status: false, message: error.message });

  // Làm phẳng dữ liệu (gộp username ra ngoài để Frontend dễ đọc)
  const orders = (data || []).map(o => {
    const userObj = Array.isArray(o.users) ? o.users[0] : o.users;
    return {
      ...o,
      username: userObj?.username || o.user_id,
      full_name: userObj?.full_name || ''
    };
  });

  res.json({ status: true, orders });
}