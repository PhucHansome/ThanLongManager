import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { verifyJWT, requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = verifyJWT(req, res);
  if (!authUser || !requireAdmin(authUser, res)) return;

  try {
    const { data: ledgers } = await supabase.from('revenue_ledger').select('*');
    const { data: users } = await supabase.from('users').select('id, status, delflag').eq('delflag', false);
    const { data: orders } = await supabase.from('payment_orders').select('*');

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const allLedgers = ledgers || [];
    const thisMonthLedgers = allLedgers.filter(r => r.month === currentMonth && r.year === currentYear);

    const monthlyRevenue12m = Array.from({ length: 12 }).map((_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
      const m = d.getMonth() + 1; const y = d.getFullYear();
      const items = allLedgers.filter(r => r.month === m && r.year === y);
      return { month_label: `T${m}/${y}`, gross: items.reduce((a, c) => a + Number(c.gross), 0), net: items.reduce((a, c) => a + Number(c.net_amount), 0) };
    });

    res.json({
      status: true,
      stats: {
        revenue_this_month: thisMonthLedgers.reduce((a, c) => a + Number(c.net_amount), 0),
        users_count: { total: users?.length || 0, active: users?.filter(u => u.status === 1).length || 0 },
        monthly_revenue_12m: monthlyRevenue12m
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
}