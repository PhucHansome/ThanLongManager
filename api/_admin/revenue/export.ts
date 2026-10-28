import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase.js';
import { verifyJWT, requireAdmin } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = verifyJWT(req, res);
  if (!authUser || !requireAdmin(authUser, res)) return;

  const { data } = await supabase.from('revenue_ledger').select('*').order('created_at', { ascending: false });
  let csv = 'ID,Doanh Thu,Hoa Hồng,Thực Nhận,Tháng,Năm\n';
  (data || []).forEach(item => { csv += `"${item.id}",${item.gross},${item.commission_amt},${item.net_amount},${item.month},${item.year}\n`; });
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=thanlong_revenue.csv');
  res.send('\uFEFF' + csv);
}