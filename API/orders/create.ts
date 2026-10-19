import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { verifyJWT } from '../_lib/auth';
import { ADMIN_BANK_CODE, ADMIN_BANK_ACCOUNT, ADMIN_BANK_NAME, DEFAULT_PRICING } from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  const authUser = verifyJWT(req, res);
  if (!authUser) return;

  const numMonths = Number(req.body.months) || 1;
  try {
    let price = 100000;
    const { data: dbPlans } = await supabase.from('pricing').select('*').eq('months', numMonths).maybeSingle();
    if (dbPlans) price = Number(dbPlans.price);
    else {
      const fallback = DEFAULT_PRICING.find(p => p.months === numMonths);
      if (fallback) price = fallback.price;
    }

    const { data: licRes } = await supabase.rpc('fn_get_my_license', { p_username: authUser.username });
    let licenseBefore = new Date().toISOString();
    let licenseAfter = new Date();
    
    if (licRes?.end_date && new Date(licRes.end_date).getTime() >= Date.now()) {
      licenseBefore = licRes.end_date;
      const base = new Date(licRes.end_date);
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

    const orderObj = {
      order_code: orderCode, user_id: authUser.userId, months: numMonths, amount: price, status: 'pending',
      qr_url: qrUrl, license_before: licenseBefore, license_after: licenseAfter.toISOString(), expires_at: expiresAt, created_at: new Date().toISOString()
    };

    await supabase.from('payment_orders').insert(orderObj);
    res.json({ status: true, order: { ...orderObj, bank_code: ADMIN_BANK_CODE, bank_account: ADMIN_BANK_ACCOUNT, bank_name: ADMIN_BANK_NAME } });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
}