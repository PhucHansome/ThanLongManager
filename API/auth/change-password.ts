import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { verifyJWT } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  const authUser = verifyJWT(req, res);
  if (!authUser) return;

  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ status: false, message: 'Vui lòng điền đầy đủ' });
  if (newPassword !== confirmPassword) return res.status(400).json({ status: false, message: 'Xác nhận mật khẩu không khớp' });
  if (newPassword.length < 6) return res.status(400).json({ status: false, message: 'Mật khẩu từ 6 ký tự' });

  try {
    const { data, error } = await supabase.rpc('fn_change_password', { p_username: authUser.username, p_old_password: oldPassword, p_new_password: newPassword });
    if (error) return res.status(500).json({ status: false, message: error.message });
    if (data && (data.code === 0 || data.success === false)) return res.status(400).json({ status: false, message: data.message || 'Lỗi đổi mật khẩu' });
    res.json({ status: true, message: 'Đổi mật khẩu thành công' });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
}