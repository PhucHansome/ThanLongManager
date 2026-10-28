import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from from '../../_lib/supabase.js';
import { verifyJWT, requireAdmin } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = verifyJWT(req, res);
  if (!authUser || !requireAdmin(authUser, res)) return;
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { full_name, email, phone, role, max_machines } = req.body;
    const payload: any = { updtime: new Date().toISOString() };
    if (full_name !== undefined) payload.full_name = full_name;
    if (email !== undefined) payload.email = email;
    if (phone !== undefined) payload.phone = phone;
    if (role !== undefined) payload.role = role;
    if (max_machines !== undefined) payload.max_machines = Number(max_machines);
    
    const { error } = await supabase.from('users').update(payload).eq('id', id);
    if (error) return res.status(500).json({ status: false, message: error.message });
    res.json({ status: true, message: 'Cập nhật thành công' });
  } 
  
  else if (req.method === 'DELETE') {
    const { error } = await supabase.from('users').update({ delflag: true }).eq('id', id);
    if (error) return res.status(500).json({ status: false, message: error.message });
    res.json({ status: true, message: 'Đã xoá' });
  } else {
    res.status(405).end();
  }
}