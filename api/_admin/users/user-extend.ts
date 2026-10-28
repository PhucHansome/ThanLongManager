import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase.js';
import { verifyJWT, requireAdmin } from '../../_lib/auth.js';    // Thêm 1 dấu ../ nữa

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const authUser = verifyJWT(req, res);
  if (!authUser || !requireAdmin(authUser, res)) return;

  const { id } = req.query;
  const { months } = req.body;

  const { data: u } = await supabase.from('users').select('username').eq('id', id).maybeSingle();
  const { error } = await supabase.rpc('fn_extend_license', { p_username: u?.username || id, p_months: Number(months) });
  if (error) return res.status(500).json({ status: false, message: error.message });
  res.json({ status: true, message: `Đã gia hạn ${months} tháng` });
}