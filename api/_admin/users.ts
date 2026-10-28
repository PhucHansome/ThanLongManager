import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { verifyJWT, requireAdmin } from '../_lib/auth';
import { calculateDaysLeft } from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = verifyJWT(req, res);
  if (!authUser || !requireAdmin(authUser, res)) return;

  if (req.method === 'GET') {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = 20;
      const { data: users, error } = await supabase.from('users').select('*').eq('delflag', false).order('created_at', { ascending: false });
      if (error) return res.status(500).json({ status: false, message: error.message });

      const { data: licenses } = await supabase.from('licenses').select('*').eq('delflag', false);
      const licMap = new Map(licenses?.map(l => [l.user_id, l]));
      
      const enriched = (users || []).map(u => ({
        ...u, license: licMap.has(u.id) ? { end_date: licMap.get(u.id).end_date, days_left: calculateDaysLeft(licMap.get(u.id).end_date) } : null
      }));

      res.json({ status: true, total: enriched.length, page, users: enriched.slice((page - 1) * limit, page * limit) });
    } catch (err: any) { res.status(500).json({ status: false, message: err.message }); }
  } 
  
  else if (req.method === 'POST') {
    const { username, password, full_name, role, initial_months } = req.body;
    if (!username || !password) return res.status(400).json({ status: false, message: 'Thiếu thông tin' });
    try {
      const { data, error } = await supabase.rpc('fn_create_account', { p_username: username, p_password: password });
      if (error) return res.status(500).json({ status: false, message: error.message });
      
      if (full_name || role) {
        await supabase.from('users').update({ full_name: full_name || username, role: role || 'user' }).eq('username', username);
      }
      if (initial_months > 0) {
        await supabase.rpc('fn_extend_license', { p_username: username, p_months: initial_months });
      }
      res.json({ status: true, message: 'Tạo thành công' });
    } catch (err: any) { res.status(500).json({ status: false, message: err.message }); }
  } else {
    res.status(405).end();
  }
}