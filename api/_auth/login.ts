import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { supabase } from '../_lib/supabase.js';
import { createJWT } from '../_lib/auth.js';
import { extractIPv4, calculateDaysLeft } from '../_lib/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method Not Allowed' });

  const { username, password } = req.body || {};
  const ipv4 = extractIPv4(req);
  if (!username || !password) return res.status(400).json({ status: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });

  const cleanUser = String(username).trim();

  try {
    let { data: rpcRes, error: rpcErr } = await supabase.rpc('fn_web_login', {
      p_username: cleanUser, p_password: String(password), p_ip: ipv4
    });

    if ((rpcRes && rpcRes.code === 0) || rpcErr) {
      const md5Pass = crypto.createHash('md5').update(password).digest('hex');
      const { data: md5Res } = await supabase.rpc('fn_web_login', { p_username: cleanUser, p_password: md5Pass, p_ip: ipv4 });
      if (md5Res && (md5Res.code === 1 || md5Res.code === 3)) { rpcRes = md5Res; rpcErr = null; }
      else {
        const { data: v2Res } = await supabase.rpc('fn_login_v2', { p_username: cleanUser, p_password: password, p_ip: ipv4, p_machine_id: null, p_user_agent: 'Web_Portal' });
        if (v2Res && (v2Res.code === 1 || v2Res.success === true)) {
          rpcRes = { code: 1, user_id: v2Res.user_id, role: v2Res.role || 'user', username: cleanUser, full_name: v2Res.full_name || cleanUser, email: v2Res.email || '', end_date: v2Res.end_date, days_left: v2Res.days_left };
          rpcErr = null;
        }
      }
    }

    if (rpcErr && !rpcRes) return res.status(500).json({ status: false, message: `Lỗi Supabase: ${rpcErr.message}` });
    if (!rpcRes) return res.status(400).json({ status: false, message: 'Sai tài khoản hoặc mật khẩu' });
    if (rpcRes.code === 0) return res.status(400).json({ status: false, code: 0, message: 'Sai tài khoản hoặc mật khẩu' });
    if (rpcRes.code === 2) return res.status(403).json({ status: false, code: 2, message: 'Tài khoản đã bị khóa' });

    const userId = rpcRes.user_id || 'u-' + cleanUser;
    const isExpired = rpcRes.code === 3 || (rpcRes.end_date ? new Date(rpcRes.end_date).getTime() < Date.now() : true);
    const daysLeft = rpcRes.days_left !== undefined ? Number(rpcRes.days_left) : calculateDaysLeft(rpcRes.end_date);
    const token = createJWT({ userId, username: rpcRes.username || cleanUser, role: rpcRes.role || 'user' });

    res.json({
      status: true, code: rpcRes.code, message: rpcRes.code === 3 ? 'Tài khoản đã hết hạn' : 'Đăng nhập thành công', token,
      user: { id: userId, username: rpcRes.username || cleanUser, full_name: rpcRes.full_name || cleanUser, email: rpcRes.email || '', role: rpcRes.role || 'user', last_login_ip: ipv4 },
      license: { end_date: rpcRes.end_date || new Date().toISOString(), days_left: daysLeft, is_expired: isExpired }
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
}