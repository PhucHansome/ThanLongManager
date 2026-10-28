import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { verifyJWT, requireAdmin } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = verifyJWT(req, res);
  if (!authUser || !requireAdmin(authUser, res)) return;

  let query = supabase.from('payment_orders').select('*').order('created_at', { ascending: false });
  if (req.query.status && req.query.status !== 'all') query = query.eq('status', req.query.status);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ status: false, message: error.message });
  res.json({ status: true, orders: data });
}