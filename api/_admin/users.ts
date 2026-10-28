import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { verifyJWT, requireAdmin } from '../_lib/auth.js';
import { calculateDaysLeft } from '../_lib/utils.js';

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
    // 1. Bổ sung thêm email vào destructuring
    const { username, password, full_name, email, role, initial_months } = req.body;
    if (!username || !password) return res.status(400).json({ status: false, message: 'Thiếu thông tin' });
    
    try {
      const { data, error } = await supabase.rpc('fn_create_account', {
        p_username: username,
        p_password: password,
        p_full_name: full_name,
        p_email: email, // Đã có biến email
        p_role: role,
        p_months: initial_months, // Truyền thẳng 0 nếu là 0
      });
      
      if (error) return res.status(500).json({ status: false, message: error.message });
      
      if (full_name || role) {
        await supabase.from('users').update({ full_name: full_name || username, role: role || 'user' }).eq('username', username);
      }

      // 2. ĐÃ XÓA ĐOẠN GỌI fn_extend_license Ở ĐÂY VÌ KHÔNG CẦN THIẾT

      res.json({ status: true, message: 'Tạo thành công' });
    } catch (err: any) { res.status(500).json({ status: false, message: err.message }); }
  } else {
    res.status(405).end();
  }
}