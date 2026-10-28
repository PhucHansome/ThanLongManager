import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  try {
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;

    // Lấy dữ liệu từ bảng revenue_ledger
    let query = supabase.from('revenue_ledger').select('*').order('created_at', { ascending: false });

    if (month) query = query.eq('month', month);
    if (year) query = query.eq('year', year);

    const { data: items, error } = await query;
    if (error) throw error;

    // Tính toán số liệu tổng hợp (summary)
    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;

    items?.forEach((item) => {
      totalGross += item.gross_amount || 0;
      totalCommission += item.commission_amt || 0;
      totalNet += item.net_amount || 0;
    });

    // Trả về đúng cấu trúc Frontend cần
    return res.json({
      summary: {
        totalGross,
        totalCommission,
        totalNet,
        count: items?.length || 0,
      },
      items: items || [],
    });
  } catch (err: any) {
    return res.status(500).json({ status: false, message: err.message });
  }
}