import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase.js';
import { verifyJWT, requireAdmin } from '../../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const authUser = verifyJWT(req, res);
  if (!authUser || !requireAdmin(authUser, res)) return;

  const { id } = req.query;
  const { months, days } = req.body; // Nhận cả months và days

  const { data: u } = await supabase
    .from('users')
    .select('username')
    .eq('id', id)
    .maybeSingle();

  if (!u) return res.status(404).json({ status: false, message: 'User not found' });

  let error;
  let message = '';

  if (days) {
    // Nếu có truyền days -> Gọi hàm RPC gia hạn theo ngày
    const { error: err } = await supabase.rpc('fn_extend_license_days', {
      p_username: u.username,
      p_days: Number(days)
    });
    error = err;
    message = `Đã gia hạn Test ${days} ngày cho ${u.username}`;
  } else {
    // Nếu không -> Gia hạn theo tháng như cũ
    const { error: err } = await supabase.rpc('fn_extend_license', {
      p_username: u.username,
      p_months: Number(months)
    });
    error = err;
    message = `Đã gia hạn ${months} tháng cho ${u.username}`;
  }

  if (error) return res.status(500).json({ status: false, message: error.message });

  res.json({ status: true, message });
}