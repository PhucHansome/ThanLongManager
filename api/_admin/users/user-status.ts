import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from from '../../_lib/supabase.js'; // Thêm 1 dấu ../ nữa
import { verifyJWT, requireAdmin } from '../../_lib/auth';    // Thêm 1 dấu ../ nữa

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') return res.status(405).end();
  const authUser = verifyJWT(req, res);
  if (!authUser || !requireAdmin(authUser, res)) return;

  const { id } = req.query;
  const { status, locked_reason } = req.body;

  const { error } = await supabase.from('users').update({ status: Number(status), locked_reason: status === 0 ? locked_reason : null }).eq('id', id);
  if (error) return res.status(500).json({ status: false, message: error.message });
  res.json({ status: true, message: 'Thành công' });
}