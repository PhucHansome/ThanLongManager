import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { verifyJWT } from '../_lib/auth';
import { ADMIN_BANK_CODE, ADMIN_BANK_ACCOUNT, ADMIN_BANK_NAME, DEFAULT_PRICING, mapFrontendStatusToDb } from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  const authUser = verifyJWT(req, res);
  if (!authUser) return;

  const numMonths = Number(req.body?.months) || 1;
  try {
    let price = 70000;
    const { data: dbPlans } = await supabase.from('pricing').select('*').eq('months', numMonths).maybeSingle();
    if (dbPlans && dbPlans.price) {
      price = Number(dbPlans.price);
    } else {
      const fallback = DEFAULT_PRICING.find(p => p.months === numMonths);
      if (fallback) price = fallback.price;
    }

    // Lấy hạn dùng hiện tại của user
    let endDateStr: string | null = null;
    const rpc1 = await supabase.rpc('fn_get_my_license', { p_user_id: authUser.userId });
    if (!rpc1.error && rpc1.data?.license?.end_date) {
      endDateStr = rpc1.data.license.end_date;
    } else {
      const rpc2 = await supabase.rpc('fn_get_my_license', { p_username: authUser.username });
      if (!rpc2.error && rpc2.data?.end_date) {
        endDateStr = rpc2.data.end_date;
      } else {
        const { data: lic } = await supabase
          .from('licenses')
          .select('end_date')
          .eq('user_id', authUser.userId)
          .eq('delflag', false)
          .order('end_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lic?.end_date) endDateStr = lic.end_date;
      }
    }

    let licenseBefore = new Date().toISOString();
    let licenseAfter = new Date();

    if (endDateStr && new Date(endDateStr).getTime() >= Date.now()) {
      licenseBefore = endDateStr;
      const base = new Date(endDateStr);
      base.setMonth(base.getMonth() + numMonths);
      licenseAfter = base;
    } else {
      const base = new Date();
      base.setMonth(base.getMonth() + numMonths);
      licenseAfter = base;
    }

    const orderCode = 'TLBB' + Math.floor(100000 + Math.random() * 900000);
    const qrUrl = `https://img.vietqr.io/image/${ADMIN_BANK_CODE}-${ADMIN_BANK_ACCOUNT}-compact2.png?amount=${price}&addInfo=${orderCode}&accountName=${encodeURIComponent(ADMIN_BANK_NAME)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const dbOrderObj = {
      order_code: orderCode,
      user_id: authUser.userId,
      months: numMonths,
      amount: price,
      status: mapFrontendStatusToDb('pending'), // 0 trong database
      qr_url: qrUrl,
      license_before: licenseBefore,
      license_after: licenseAfter.toISOString(),
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };

    const { error: insErr } = await supabase.from('payment_orders').insert(dbOrderObj);
    if (insErr) {
      return res.status(500).json({ status: false, message: 'Lỗi tạo đơn hàng: ' + insErr.message });
    }

    return res.json({
      status: true,
      order: {
        ...dbOrderObj,
        status: 'pending',
        bank_code: ADMIN_BANK_CODE,
        bank_account: ADMIN_BANK_ACCOUNT,
        bank_name: ADMIN_BANK_NAME
      }
    });
  } catch (err: any) {
    return res.status(500).json({ status: false, message: err.message });
  }
}
