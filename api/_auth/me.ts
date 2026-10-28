import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { verifyJWT } from '../_lib/auth.js';
import { calculateDaysLeft } from '../_lib/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  const authUser = verifyJWT(req, res);
  if (!authUser) return;

  try {
    const { data: dbUser } = await supabase.from('users').select('*').eq('username', authUser.username).maybeSingle();
    const { data: licRes } = await supabase.rpc('fn_get_my_license', { p_username: authUser.username });
    
    let license = null;
    if (licRes && licRes.end_date) {
      const isExpired = new Date(licRes.end_date).getTime() < Date.now();
      license = { id: licRes.license_id || 'lic-' + authUser.userId, start_date: licRes.start_date, end_date: licRes.end_date, days_left: licRes.days_left || calculateDaysLeft(licRes.end_date), is_expired: isExpired };
    }

    const { data: rpcMachines } = await supabase.rpc('fn_admin_list_machines', { p_username: authUser.username });

    res.json({
      status: true,
      user: { id: dbUser?.id || authUser.userId, username: authUser.username, full_name: dbUser?.full_name || authUser.username, email: dbUser?.email || '', role: dbUser?.role || authUser.role },
      license,
      machines: rpcMachines?.machines || []
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
}