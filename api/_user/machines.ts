import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { verifyJWT } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = verifyJWT(req, res);
  if (!authUser) return;

  try {
    const { data: rpcRes, error } = await supabase.rpc('fn_admin_list_machines', {
      p_username: authUser.username
    });
    if (!error && rpcRes?.machines) {
      return res.json({ status: true, machines: rpcRes.machines });
    }

    const { data: dbMachines } = await supabase
      .from('user_machine_mappings')
      .select('*')
      .eq('user_id', authUser.userId)
      .order('last_active_at', { ascending: false });

    return res.json({ status: true, machines: dbMachines || [] });
  } catch (err: any) {
    return res.status(500).json({ status: false, message: err.message });
  }
}
