import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { extractIPv4 } from '../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method Not Allowed' });

  const { username, password, confirmPassword, full_name, email, phone } = req.body || {};
  const ipv4 = extractIPv4(req);

  if (!username || !password) return res.status(400).json({ status: false, message: 'Vui lòng điền tên đăng nhập và mật khẩu' });
  
  const cleanUser = String(username).trim();
  if (!/^[a-zA-Z0-9_]{3,}$/.test(cleanUser)) return res.status(400).json({ status: false, message: 'Tên đăng nhập không hợp lệ' });
  if (String(password).length < 6) return res.status(400).json({ status: false, message: 'Mật khẩu phải từ 6 ký tự.' });
  if (confirmPassword && confirmPassword !== password) return res.status(400).json({ status: false, message: 'Xác nhận mật khẩu không khớp' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) return res.status(400).json({ status: false, message: 'Định dạng email không hợp lệ' });

  try {
    const { data: regRes, error: regErr } = await supabase.rpc('fn_web_register', {
      p_username: cleanUser,
      p_password: String(password),
      p_full_name: full_name ? String(full_name).trim() : cleanUser,
      p_email: email ? String(email).trim() : null,
      p_phone: phone ? String(phone).trim() : null,
      p_trial_days: 0
    });

    if (regErr) return res.status(500).json({ status: false, message: `Lỗi đăng ký: ${regErr.message}` });
    if (regRes && regRes.success === false) {
      if (regRes.code === 'USERNAME_EXISTS') return res.status(400).json({ status: false, message: 'Tên đăng nhập đã tồn tại.' });
      return res.status(400).json({ status: false, message: regRes.message || 'Đăng ký không thành công' });
    }

    res.json({ status: true, message: 'Đăng ký thành công!', user_id: regRes?.user_id, username: regRes?.username || cleanUser });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
}