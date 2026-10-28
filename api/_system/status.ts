import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { ADMIN_BANK_CODE, ADMIN_BANK_ACCOUNT, ADMIN_BANK_NAME } from '../_lib/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    res.json({
      connected: true,
      real_users_count: usersCount || 0,
      bank: { code: ADMIN_BANK_CODE, account: ADMIN_BANK_ACCOUNT, name: ADMIN_BANK_NAME }
    });
  } catch (err: any) {
    res.json({ connected: false, error: err.message });
  }
}