process.env.DISABLE_HMR = 'true';

import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'thanlong_jwt_secret_2026_secured';
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || '';
const ADMIN_BANK_CODE = process.env.ADMIN_BANK_CODE || 'VIETINBANK';
const ADMIN_BANK_ACCOUNT = process.env.ADMIN_BANK_ACCOUNT || '107872473033';
const ADMIN_BANK_NAME = process.env.ADMIN_BANK_NAME || 'NGUYEN VAN A';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ujcmnkhjqeohtyorvusy.supabase.co';
const rawSupabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
const isSupabaseConfigured = rawSupabaseKey.length > 10;
// Use a placeholder key to avoid crashing Node process if SUPABASE_KEY is missing from environment
const SUPABASE_KEY = isSupabaseConfigured ? rawSupabaseKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

app.use(express.json());

// =====================================================================
// SUPABASE CLIENT (KẾT NỐI DATABASE CỦA BẠN KHI CÓ KEY TRONG .ENV)
// =====================================================================

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

if (!isSupabaseConfigured) {
  console.warn('⚠️  [CHÚ Ý] Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY hoặc SUPABASE_ANON_KEY trong file .env');
}

// Default pricing fallback if table pricing is empty
const DEFAULT_PRICING = [
  { id: 'p-1', months: 1, price: 100000, discount_pct: 0, label: 'Gói 1 Tháng', is_active: true },
  { id: 'p-3', months: 3, price: 270000, discount_pct: 10, label: 'Gói 3 Tháng (-10%)', is_active: true },
  { id: 'p-6', months: 6, price: 480000, discount_pct: 20, label: 'Gói 6 Tháng (-20%)', is_active: true },
  { id: 'p-12', months: 12, price: 840000, discount_pct: 30, label: 'Gói 1 Năm (-30%)', is_active: true }
];

// Helper to calculate days left
function calculateDaysLeft(endDateStr: string | null | undefined): number {
  if (!endDateStr) return 0;
  const end = new Date(endDateStr).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// =====================================================================
// JWT AUTH HELPERS
// =====================================================================

function createJWT(payload: { userId: string; username: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 86400 })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token: string): { userId: string; username: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: false, message: 'Vui lòng đăng nhập để tiếp tục' });
    return;
  }
  const token = authHeader.substring(7);
  const decoded = verifyJWT(token);
  if (!decoded) {
    res.status(401).json({ status: false, message: 'Phiên đăng nhập đã hết hạn' });
    return;
  }
  (req as any).user = decoded;
  next();
}

function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ status: false, message: 'Bạn không có quyền truy cập trang quản trị' });
    return;
  }
  next();
}

// =====================================================================
// SYSTEM HEALTH & SUPABASE STATUS ENDPOINT
// =====================================================================

app.get('/api/system/status', async (_req: Request, res: Response) => {
  try {
    const { count: usersCount, error: userErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    res.json({
      connected: true,
      supabase_url: SUPABASE_URL,
      real_users_count: usersCount || 0,
      bank: {
        code: ADMIN_BANK_CODE,
        account: ADMIN_BANK_ACCOUNT,
        name: ADMIN_BANK_NAME
      }
    });
  } catch (err: any) {
    res.json({
      connected: false,
      error: err.message
    });
  }
});

// =====================================================================
// AUTH ENDPOINTS (GỌI TRỰC TIẾP SUPABASE RPC THẬT CỦA BẠN)
// =====================================================================

/**
 * Trích xuất địa chỉ IP luôn luôn ở định dạng chuẩn IPv4 (ví dụ: "14.162.20.15" hoặc "127.0.0.1", tối đa 15 ký tự).
 * Lọc sạch toàn bộ IPv6 hoặc chuỗi proxy dài, đảm bảo 100% đúng chuẩn IPv4 cho Postgres và Supabase RPC.
 */
function extractIPv4(req: Request): string {
  // 1. Kiểm tra nếu client gửi kèm IPv4 trong body
  const customIp = req.body?.ip || req.body?.client_ip;
  if (typeof customIp === 'string') {
    const trimmed = customIp.trim();
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
      const octets = trimmed.split('.').map(Number);
      if (octets.every(o => o >= 0 && o <= 255)) {
        return trimmed;
      }
    }
  }

  // 2. Thu thập danh sách từ các header proxy của Web App
  const headerCandidates = [
    req.headers['x-forwarded-for'],
    req.headers['x-real-ip'],
    req.headers['cf-connecting-ip'],
    req.headers['x-client-ip'],
    req.socket.remoteAddress
  ];

  for (const h of headerCandidates) {
    if (!h) continue;
    const str = Array.isArray(h) ? h.join(',') : String(h);
    const parts = str.split(',').map(s => s.trim());
    for (let part of parts) {
      if (part.startsWith('::ffff:')) {
        part = part.substring(7);
      }
      if (part === '::1' || part === 'localhost') {
        return '127.0.0.1';
      }
      // Tìm xem có địa chỉ IPv4 hợp lệ nào trong chuỗi không
      const match = part.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
      if (match) {
        const candidate = match[1];
        const octets = candidate.split('.').map(Number);
        if (octets.every(o => o >= 0 && o <= 255)) {
          return candidate;
        }
      }
    }
  }

  // 3. Mặc định là IPv4 localhost
  return '127.0.0.1';
}

// 1. POST /api/auth/register (Công khai - Gọi RPC fn_web_register)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { username, password, confirmPassword, full_name, email, phone } = req.body || {};
  const ipv4 = extractIPv4(req);

  // 1. Validation phía server
  if (!username || !password) {
    res.status(400).json({ status: false, message: 'Vui lòng điền tên đăng nhập và mật khẩu' });
    return;
  }

  const cleanUser = String(username).trim();
  // username >= 3 ký tự, không dấu, không khoảng trắng
  if (!/^[a-zA-Z0-9_]{3,}$/.test(cleanUser)) {
    res.status(400).json({
      status: false,
      message: 'Tên đăng nhập phải từ 3 ký tự trở lên, không chứa dấu tiếng Việt và không có khoảng trắng'
    });
    return;
  }

  if (String(password).length < 6) {
    res.status(400).json({ status: false, message: 'Mật khẩu phải từ 6 ký tự.' });
    return;
  }

  if (confirmPassword && confirmPassword !== password) {
    res.status(400).json({ status: false, message: 'Xác nhận mật khẩu không khớp' });
    return;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    res.status(400).json({ status: false, message: 'Định dạng email không hợp lệ' });
    return;
  }

  try {
    console.log(`[REGISTER ATTEMPT] username: "${cleanUser}", IPv4: "${ipv4}"`);

    // Gọi RPC fn_web_register(p_username, p_password, p_full_name, p_email, p_phone, p_trial_days)
    const { data: regRes, error: regErr } = await supabase.rpc('fn_web_register', {
      p_username: cleanUser,
      p_password: String(password),
      p_full_name: full_name ? String(full_name).trim() : cleanUser,
      p_email: email ? String(email).trim() : null,
      p_phone: phone ? String(phone).trim() : null,
      p_trial_days: 0 // Mặc định = 0 trial days
    });

    if (regErr) {
      console.error('[REGISTER RPC ERROR]', regErr);
      res.status(500).json({ status: false, message: `Lỗi đăng ký: ${regErr.message}` });
      return;
    }

    if (regRes && regRes.success === false) {
      if (regRes.code === 'USERNAME_EXISTS') {
        res.status(400).json({ status: false, message: 'Tên đăng nhập đã tồn tại.' });
        return;
      }
      if (regRes.code === 'PASSWORD_TOO_SHORT') {
        res.status(400).json({ status: false, message: 'Mật khẩu phải từ 6 ký tự.' });
        return;
      }
      res.status(400).json({ status: false, message: regRes.message || 'Đăng ký không thành công' });
      return;
    }

    res.json({
      status: true,
      message: 'Đăng ký thành công! Vui lòng đăng nhập.',
      user_id: regRes?.user_id,
      username: regRes?.username || cleanUser
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 2. POST /api/auth/login (Công khai - Gọi fn_web_login trên Supabase)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  const ipv4 = extractIPv4(req);

  if (!username || !password) {
    res.status(400).json({ status: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
    return;
  }

  const cleanUser = String(username).trim();
  console.log(`[LOGIN ATTEMPT] user: "${cleanUser}", IPv4: "${ipv4}"`);

  try {
    // 1. Thử gọi RPC fn_web_login(p_username, p_password, p_ip)
    let { data: rpcRes, error: rpcErr } = await supabase.rpc('fn_web_login', {
      p_username: cleanUser,
      p_password: String(password),
      p_ip: ipv4
    });

    // Nếu fn_web_login trả code 0 hoặc lỗi, thử mật khẩu hash (MD5, SHA256) hoặc fallback fn_login_v2
    if ((rpcRes && rpcRes.code === 0) || rpcErr) {
      const md5Pass = crypto.createHash('md5').update(password).digest('hex');
      const { data: md5Res } = await supabase.rpc('fn_web_login', {
        p_username: cleanUser,
        p_password: md5Pass,
        p_ip: ipv4
      });
      if (md5Res && (md5Res.code === 1 || md5Res.code === 3)) {
        rpcRes = md5Res;
        rpcErr = null;
      } else {
        // Fallback gọi fn_login_v2 nếu fn_web_login chưa khớp
        const { data: v2Res } = await supabase.rpc('fn_login_v2', {
          p_username: cleanUser,
          p_password: password,
          p_ip: ipv4,
          p_machine_id: null,
          p_user_agent: 'Web_Portal'
        });
        if (v2Res && (v2Res.code === 1 || v2Res.success === true)) {
          rpcRes = {
            code: 1,
            user_id: v2Res.user_id,
            role: v2Res.role || 'user',
            username: cleanUser,
            full_name: v2Res.full_name || cleanUser,
            email: v2Res.email || '',
            end_date: v2Res.end_date,
            days_left: v2Res.days_left
          };
          rpcErr = null;
        }
      }
    }

    if (rpcErr && !rpcRes) {
      res.status(500).json({ status: false, message: `Lỗi Supabase: ${rpcErr.message}` });
      return;
    }

    if (!rpcRes) {
      res.status(400).json({ status: false, message: 'Sai tài khoản hoặc mật khẩu' });
      return;
    }

    // Xử lý response code theo đặc tả:
    // code = 0: Sai tài khoản hoặc mật khẩu
    // code = 1: Đăng nhập thành công
    // code = 2: Tài khoản đã bị khóa
    // code = 3: Tài khoản đã hết hạn — vui lòng gia hạn
    if (rpcRes.code === 0) {
      res.status(400).json({ status: false, code: 0, message: 'Sai tài khoản hoặc mật khẩu' });
      return;
    }

    if (rpcRes.code === 2) {
      res.status(403).json({ status: false, code: 2, message: 'Tài khoản đã bị khóa' });
      return;
    }

    const userId = rpcRes.user_id || 'u-' + cleanUser;
    const role = rpcRes.role || 'user';
    const retUsername = rpcRes.username || cleanUser;
    const fullName = rpcRes.full_name || retUsername;
    const email = rpcRes.email || '';
    const isExpired = rpcRes.code === 3 || (rpcRes.end_date ? new Date(rpcRes.end_date).getTime() < Date.now() : true);
    const daysLeft = rpcRes.days_left !== undefined ? Number(rpcRes.days_left) : calculateDaysLeft(rpcRes.end_date);

    // Ký JWT Token
    const token = createJWT({
      userId,
      username: retUsername,
      role
    });

    res.json({
      status: true,
      code: rpcRes.code,
      message: rpcRes.code === 3 ? 'Tài khoản đã hết hạn — vui lòng gia hạn' : 'Đăng nhập thành công',
      token,
      user: {
        id: userId,
        username: retUsername,
        full_name: fullName,
        email: email,
        role: role,
        status: 1,
        locked_reason: null,
        last_login_at: new Date().toISOString(),
        last_login_ip: ipv4
      },
      license: {
        id: 'lic-' + userId,
        start_date: new Date().toISOString(),
        end_date: rpcRes.end_date || new Date().toISOString(),
        days_left: daysLeft,
        status: isExpired ? 0 : 1,
        is_expired: isExpired
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 3. GET /api/auth/me (Lấy dữ liệu thật từ users table + fn_get_my_license + fn_admin_list_machines)
app.get('/api/auth/me', authMiddleware, async (req: Request, res: Response) => {
  const authUser = (req as any).user;

  try {
    // 1. Lấy thông tin user từ bảng users
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('username', authUser.username)
      .maybeSingle();

    // 2. Lấy license qua fn_get_my_license(p_username)
    let license = null;
    const { data: licRes } = await supabase.rpc('fn_get_my_license', {
      p_username: authUser.username
    });

    if (licRes && (licRes.code === 1 || licRes.end_date)) {
      const isExpired = new Date(licRes.end_date).getTime() < Date.now();
      license = {
        id: licRes.license_id || 'lic-' + authUser.userId,
        start_date: licRes.start_date || new Date().toISOString(),
        end_date: licRes.end_date,
        days_left: licRes.days_left !== undefined ? licRes.days_left : calculateDaysLeft(licRes.end_date),
        status: isExpired ? 0 : 1,
        is_expired: isExpired
      };
    } else {
      const { data: dbLic } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', authUser.userId)
        .eq('delflag', false)
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbLic) {
        const isExpired = new Date(dbLic.end_date).getTime() < Date.now();
        license = {
          id: dbLic.id,
          start_date: dbLic.start_date,
          end_date: dbLic.end_date,
          days_left: calculateDaysLeft(dbLic.end_date),
          status: isExpired ? 0 : 1,
          is_expired: isExpired
        };
      }
    }

    // 3. Lấy danh sách máy qua RPC fn_admin_list_machines
    let machinesList: any[] = [];
    const { data: rpcMachines } = await supabase.rpc('fn_admin_list_machines', {
      p_username: authUser.username
    });
    if (rpcMachines?.machines && Array.isArray(rpcMachines.machines)) {
      machinesList = rpcMachines.machines;
    } else {
      const { data: dbMachines } = await supabase
        .from('user_machine_mappings')
        .select('*')
        .eq('user_id', authUser.userId)
        .eq('delflag', false)
        .order('last_seen_at', { ascending: false });
      machinesList = dbMachines || [];
    }

    res.json({
      status: true,
      user: {
        id: dbUser?.id || authUser.userId,
        username: authUser.username,
        full_name: dbUser?.full_name || authUser.username,
        email: dbUser?.email || '',
        phone: dbUser?.phone || '',
        role: dbUser?.role || authUser.role,
        status: dbUser?.status !== undefined ? dbUser.status : 1,
        max_machines: dbUser?.max_machines || 1,
        register_ip: dbUser?.register_ip || '127.0.0.1',
        last_login_at: dbUser?.last_login_at || new Date().toISOString(),
        last_login_ip: dbUser?.last_login_ip || '127.0.0.1'
      },
      license,
      machines: machinesList
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 3. POST /api/auth/change-password (Gọi chính xác fn_change_password)
app.post('/api/auth/change-password', authMiddleware, async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword) {
    res.status(400).json({ status: false, message: 'Vui lòng điền đầy đủ mật khẩu cũ và mới' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ status: false, message: 'Xác nhận mật khẩu mới không khớp' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ status: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    return;
  }

  try {
    // Gọi RPC fn_change_password(p_username, p_old_password, p_new_password)
    const { data, error } = await supabase.rpc('fn_change_password', {
      p_username: authUser.username,
      p_old_password: oldPassword,
      p_new_password: newPassword
    });

    if (error) {
      res.status(500).json({ status: false, message: `Lỗi Supabase: ${error.message}` });
      return;
    }

    if (data && (data.code === 0 || data.success === false)) {
      let msg = data.message || 'Đổi mật khẩu thất bại';
      if (msg === 'WRONG_PASSWORD') msg = 'Mật khẩu cũ không chính xác';
      res.status(400).json({ status: false, message: msg });
      return;
    }

    res.json({ status: true, message: 'Đổi mật khẩu thành công' });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 4. GET /api/pricing (Lấy từ bảng pricing của Supabase thật)
app.get('/api/pricing', async (_req: Request, res: Response) => {
  try {
    const { data: plans, error } = await supabase
      .from('pricing')
      .select('*')
      .eq('is_active', true)
      .order('months', { ascending: true });

    if (!error && plans && plans.length > 0) {
      res.json({ status: true, plans });
      return;
    }

    // Nếu bảng pricing trên Supabase chưa insert hàng nào, trả về 4 gói chuẩn để user thao tác
    res.json({ status: true, plans: DEFAULT_PRICING });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 5. POST /api/orders/create (Tạo đơn gia hạn VietQR theo tài khoản ngân hàng của bạn)
app.post('/api/orders/create', authMiddleware, async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const { months } = req.body;
  const numMonths = Number(months) || 1;

  try {
    // 1. Tìm giá tương ứng
    let price = 100000;
    const { data: dbPlans } = await supabase.from('pricing').select('*').eq('months', numMonths).maybeSingle();
    if (dbPlans) {
      price = Number(dbPlans.price);
    } else {
      const fallbackPlan = DEFAULT_PRICING.find(p => p.months === numMonths);
      if (fallbackPlan) price = fallbackPlan.price;
    }

    // 2. Lấy license hiện tại của user để tính ngày mới
    const { data: licRes } = await supabase.rpc('fn_get_my_license', { p_username: authUser.username });
    const now = new Date();
    let licenseBefore = now.toISOString();
    let licenseAfter = new Date();

    if (licRes && licRes.end_date && new Date(licRes.end_date).getTime() >= now.getTime()) {
      // Case 1: Còn hạn -> cộng tiếp
      licenseBefore = licRes.end_date;
      const base = new Date(licRes.end_date);
      base.setMonth(base.getMonth() + numMonths);
      licenseAfter = base;
    } else {
      // Case 2: Hết hạn -> tính từ hôm nay
      const base = new Date();
      base.setMonth(base.getMonth() + numMonths);
      licenseAfter = base;
    }

    // 3. Sinh mã đơn hàng: TLBB + 6 số ngẫu nhiên
    const orderCode = 'TLBB' + Math.floor(100000 + Math.random() * 900000);

    // 4. Tạo URL VietQR chuẩn
    const qrUrl = `https://img.vietqr.io/image/${ADMIN_BANK_CODE}-${ADMIN_BANK_ACCOUNT}-compact2.png?amount=${price}&addInfo=${orderCode}&accountName=${encodeURIComponent(
      ADMIN_BANK_NAME
    )}`;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const orderObj = {
      order_code: orderCode,
      user_id: authUser.userId,
      months: numMonths,
      amount: price,
      status: 'pending',
      qr_url: qrUrl,
      license_before: licenseBefore,
      license_after: licenseAfter.toISOString(),
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };

    // Thử insert vào payment_orders trên Supabase
    await supabase.from('payment_orders').insert(orderObj);

    res.json({
      status: true,
      order: {
        ...orderObj,
        bank_code: ADMIN_BANK_CODE,
        bank_account: ADMIN_BANK_ACCOUNT,
        bank_name: ADMIN_BANK_NAME
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 6. GET /api/orders/:orderCode/status (Đọc trạng thái đơn từ bảng payment_orders của Supabase)
app.get('/api/orders/:orderCode/status', authMiddleware, async (req: Request, res: Response) => {
  const { orderCode } = req.params;

  try {
    const { data: order, error } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_code', orderCode)
      .maybeSingle();

    if (error || !order) {
      res.status(404).json({ status: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }

    res.json({
      status: true,
      order: {
        order_code: order.order_code,
        status: order.status,
        amount: order.amount,
        months: order.months,
        license_after: order.license_after,
        paid_at: order.paid_at,
        expires_at: order.expires_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 7. POST /api/webhook/sepay (Tiếp nhận webhook biến động số dư từ Sepay.vn)
app.post('/api/webhook/sepay', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const apiKey = authHeader ? authHeader.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim() : '';

  if (SEPAY_API_KEY && apiKey !== SEPAY_API_KEY) {
    res.status(401).json({ status: false, message: 'Sai API Key xác thực webhook Sepay' });
    return;
  }

  const { id: bank_txn_id, amount, description } = req.body;
  if (!bank_txn_id || !amount) {
    res.status(400).json({ status: false, message: 'Thiếu dữ liệu giao dịch' });
    return;
  }

  const match = (description || '').toUpperCase().match(/\b(TLBB[A-Z0-9]{4,10})\b/);
  const extractedOrderCode = match ? match[1] : null;

  if (!extractedOrderCode) {
    await supabase.from('bank_transactions').insert({
      bank_txn_id: String(bank_txn_id),
      amount: Number(amount),
      description: `${description || ''} [NO ORDER CODE]`,
      raw_payload: req.body
    });
    res.json({ status: true, message: 'Ghi nhận giao dịch nhưng không tìm thấy mã đơn' });
    return;
  }

  try {
    // 1. Kiểm tra đơn hàng trong payment_orders
    const { data: order } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_code', extractedOrderCode)
      .maybeSingle();

    if (!order) {
      res.status(404).json({ status: false, message: 'Không tìm thấy đơn ' + extractedOrderCode });
      return;
    }

    if (order.status === 'paid') {
      res.json({ status: true, message: 'Đơn hàng đã được thanh toán trước đó' });
      return;
    }

    // 2. Ghi nhận giao dịch vào bank_transactions
    await supabase.from('bank_transactions').insert({
      bank_txn_id: String(bank_txn_id),
      amount: Number(amount),
      description: String(description || ''),
      raw_payload: req.body
    });

    // 3. Cập nhật payment_orders -> paid
    await supabase
      .from('payment_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        bank_txn_id: String(bank_txn_id)
      })
      .eq('id', order.id);

    // 4. Tìm username của user để gọi fn_extend_license(p_months, p_username)
    const { data: u } = await supabase.from('users').select('username').eq('id', order.user_id).maybeSingle();
    const targetUsername = u?.username || 'user';

    await supabase.rpc('fn_extend_license', {
      p_username: targetUsername,
      p_months: Number(order.months)
    });

    // 5. Ghi vào revenue_ledger
    await supabase.from('revenue_ledger').insert({
      order_id: order.id,
      gross: Number(amount),
      commission_pct: 0,
      commission_amt: 0,
      net_amount: Number(amount),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    });

    res.json({ status: true, message: 'Xác nhận thanh toán và gia hạn thành công!' });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 8. POST /api/webhook/simulate-payment (Test duyệt thanh toán trực tiếp)
app.post('/api/webhook/simulate-payment', authMiddleware, async (req: Request, res: Response) => {
  const { orderCode } = req.body;

  try {
    const { data: order } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_code', orderCode)
      .maybeSingle();

    if (!order) {
      res.status(404).json({ status: false, message: 'Không tìm thấy đơn hàng' });
      return;
    }

    const simTxnId = `SIM-ICB-${Date.now().toString().slice(-8)}`;

    // Cập nhật order
    await supabase
      .from('payment_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        bank_txn_id: simTxnId
      })
      .eq('id', order.id);

    // Tìm username và gia hạn qua RPC
    const { data: u } = await supabase.from('users').select('username').eq('id', order.user_id).maybeSingle();
    const targetUsername = u?.username || (req as any).user.username;

    await supabase.rpc('fn_extend_license', {
      p_username: targetUsername,
      p_months: Number(order.months)
    });

    // Ghi sổ cái
    await supabase.from('revenue_ledger').insert({
      order_id: order.id,
      gross: Number(order.amount),
      commission_pct: 0,
      commission_amt: 0,
      net_amount: Number(order.amount),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    });

    res.json({
      status: true,
      message: 'Giả lập thanh toán thành công!',
      license_after: order.license_after
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// =====================================================================
// ADMIN API ENDPOINTS (DỮ LIỆU THẬT 100% TỪ SUPABASE)
// =====================================================================

// GET /api/admin/stats
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data: ledgers } = await supabase.from('revenue_ledger').select('*');
    const allLedgers = ledgers || [];

    const thisMonthLedgers = allLedgers.filter(r => r.month === currentMonth && r.year === currentYear);
    const thisYearLedgers = allLedgers.filter(r => r.year === currentYear);

    const revenueThisMonth = thisMonthLedgers.reduce((acc, curr) => acc + Number(curr.net_amount || 0), 0);
    const grossThisMonth = thisMonthLedgers.reduce((acc, curr) => acc + Number(curr.gross || 0), 0);
    const commissionThisMonth = thisMonthLedgers.reduce((acc, curr) => acc + Number(curr.commission_amt || 0), 0);
    const revenueThisYear = thisYearLedgers.reduce((acc, curr) => acc + Number(curr.net_amount || 0), 0);

    const { data: users } = await supabase.from('users').select('id, username, full_name, status, role, delflag').eq('delflag', false);
    const userList = users || [];

    const { data: orders } = await supabase.from('payment_orders').select('*');
    const allOrders = orders || [];

    const thisMonthOrders = allOrders.filter(o => {
      const d = new Date(o.created_at);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });

    const pendingThisMonth = thisMonthOrders.filter(o => o.status === 'pending').length;
    const paidThisMonth = thisMonthOrders.filter(o => o.status === 'paid').length;

    // 12 months revenue
    const monthlyRevenue12m = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthItems = allLedgers.filter(r => r.month === m && r.year === y);
      monthlyRevenue12m.push({
        month_label: `T${m.toString().padStart(2, '0')}/${y.toString().slice(-2)}`,
        month: m,
        year: y,
        gross: monthItems.reduce((a, c) => a + Number(c.gross || 0), 0),
        net: monthItems.reduce((a, c) => a + Number(c.net_amount || 0), 0),
        order_count: monthItems.length
      });
    }

    // Top 10 spenders: group paid orders
    const spendMap = new Map<string, { total_spent: number; count: number }>();
    allOrders.filter(o => o.status === 'paid').forEach(o => {
      const uid = o.user_id || 'unknown';
      const cur = spendMap.get(uid) || { total_spent: 0, count: 0 };
      spendMap.set(uid, {
        total_spent: cur.total_spent + Number(o.amount || 0),
        count: cur.count + 1
      });
    });

    const top10Spenders: any[] = [];
    for (const [uid, spend] of spendMap.entries()) {
      const u = userList.find(x => x.id === uid);
      top10Spenders.push({
        user_id: uid,
        username: u?.username || uid,
        full_name: u?.full_name || u?.username || 'Khách hàng',
        total_spent: spend.total_spent,
        orders_count: spend.count
      });
    }
    top10Spenders.sort((a, b) => b.total_spent - a.total_spent);

    res.json({
      status: true,
      stats: {
        revenue_this_month: revenueThisMonth,
        gross_this_month: grossThisMonth,
        commission_this_month: commissionThisMonth,
        revenue_this_year: revenueThisYear,
        users_count: {
          total: userList.length,
          active: userList.filter(u => u.status === 1).length,
          locked: userList.filter(u => u.status === 0).length,
          expired: 0
        },
        orders_count: {
          pending_this_month: pendingThisMonth,
          paid_this_month: paidThisMonth,
          total_this_month: thisMonthOrders.length
        },
        monthly_revenue_12m: monthlyRevenue12m,
        top_10_spenders: top10Spenders.slice(0, 10)
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/admin/users (Tìm kiếm, lọc, phân trang 20/page, đính kèm license)
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const statusFilter = req.query.status as string;
  const roleFilter = req.query.role as string;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Number(req.query.limit) || 20);

  try {
    let query = supabase
      .from('users')
      .select('*')
      .eq('delflag', false)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', Number(statusFilter));
    }
    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }

    const { data: users, error } = await query;
    if (error) {
      res.status(500).json({ status: false, message: error.message });
      return;
    }

    let result = users || [];
    if (search) {
      result = result.filter(
        u =>
          (u.username && u.username.toLowerCase().includes(search)) ||
          (u.full_name && u.full_name.toLowerCase().includes(search)) ||
          (u.email && u.email.toLowerCase().includes(search)) ||
          (u.phone && u.phone.toLowerCase().includes(search))
      );
    }

    // Đính kèm license cho từng user
    const { data: allLicenses } = await supabase.from('licenses').select('*').eq('delflag', false);
    const licMap = new Map<string, any>();
    (allLicenses || []).forEach(lic => {
      const existing = licMap.get(lic.user_id);
      if (!existing || new Date(lic.end_date).getTime() > new Date(existing.end_date).getTime()) {
        licMap.set(lic.user_id, lic);
      }
    });

    const enrichedUsers = result.map(u => {
      const lic = licMap.get(u.id);
      let licenseInfo = null;
      if (lic) {
        const isExp = new Date(lic.end_date).getTime() < Date.now();
        licenseInfo = {
          id: lic.id,
          end_date: lic.end_date,
          days_left: calculateDaysLeft(lic.end_date),
          is_expired: isExp,
          status: isExp ? 0 : 1
        };
      }
      return {
        ...u,
        license: licenseInfo
      };
    });

    const total = enrichedUsers.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = enrichedUsers.slice(startIndex, startIndex + limit);

    res.json({
      status: true,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
      users: paginatedUsers
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/admin/users (Tạo user mới qua fn_create_account)
app.post('/api/admin/users', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { username, password, full_name, email, phone, role, initial_months } = req.body;
  if (!username || !password) {
    res.status(400).json({ status: false, message: 'Username và Password không được để trống' });
    return;
  }

  const cleanUser = String(username).trim();

  try {
    const { data, error } = await supabase.rpc('fn_create_account', {
      p_username: cleanUser,
      p_password: password
    });

    if (error) {
      res.status(500).json({ status: false, message: `Lỗi Supabase: ${error.message}` });
      return;
    }

    if (data && (data.code === 'USERNAME_EXISTS' || data.success === false)) {
      res.status(400).json({ status: false, message: 'Tên tài khoản này đã tồn tại trên database' });
      return;
    }

    // Cập nhật thêm thông tin bổ sung (full_name, email, phone, role)
    if (full_name || email || phone || (role && role !== 'user')) {
      await supabase
        .from('users')
        .update({
          full_name: full_name || cleanUser,
          email: email || null,
          phone: phone || null,
          role: role || 'user'
        })
        .eq('username', cleanUser);
    }

    // Nếu chọn gói tháng ban đầu > 0
    if (initial_months && Number(initial_months) > 0) {
      await supabase.rpc('fn_extend_license', {
        p_username: cleanUser,
        p_months: Number(initial_months)
      });
    }

    res.json({ status: true, message: 'Tạo tài khoản thành công!' });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// PATCH /api/admin/users/:id (Cập nhật full_name, email, phone, note, role, max_machines)
app.patch('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { full_name, email, phone, note, role, max_machines } = req.body;

  try {
    const updatePayload: any = {
      updtime: new Date().toISOString()
    };
    if (full_name !== undefined) updatePayload.full_name = full_name;
    if (email !== undefined) updatePayload.email = email;
    if (phone !== undefined) updatePayload.phone = phone;
    if (note !== undefined) updatePayload.note = note;
    if (role !== undefined) updatePayload.role = role;
    if (max_machines !== undefined) updatePayload.max_machines = Number(max_machines);

    const { error } = await supabase.from('users').update(updatePayload).eq('id', id);
    if (error) {
      res.status(500).json({ status: false, message: error.message });
      return;
    }

    if (max_machines !== undefined) {
      const { data: u } = await supabase.from('users').select('username').eq('id', id).maybeSingle();
      if (u?.username) {
        await supabase.rpc('fn_admin_set_max_machines', {
          p_username: u.username,
          p_max_machines: Number(max_machines)
        });
      }
    }

    res.json({ status: true, message: 'Cập nhật thông tin thành công' });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// PATCH /api/admin/users/:id/status (Khoá / Mở khoá tài khoản)
app.patch('/api/admin/users/:id/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, locked_reason } = req.body;

  try {
    const { error } = await supabase
      .from('users')
      .update({
        status: Number(status),
        locked_reason: status === 0 ? locked_reason || 'Vi phạm chính sách' : null,
        updtime: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      res.status(500).json({ status: false, message: error.message });
      return;
    }

    res.json({ status: true, message: status === 0 ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản' });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// DELETE /api/admin/users/:id (Xoá mềm soft delete)
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('users')
      .update({ delflag: true, updtime: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      res.status(500).json({ status: false, message: error.message });
      return;
    }

    res.json({ status: true, message: 'Đã xoá tài khoản thành công' });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// POST /api/admin/users/:id/extend (Gia hạn license thủ công qua fn_extend_license)
app.post('/api/admin/users/:id/extend', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { months } = req.body;

  try {
    const { data: u } = await supabase.from('users').select('username').eq('id', id).maybeSingle();
    const targetUsername = u?.username || id;

    const { data, error } = await supabase.rpc('fn_extend_license', {
      p_username: targetUsername,
      p_months: Number(months)
    });

    if (error) {
      res.status(500).json({ status: false, message: `Lỗi Supabase: ${error.message}` });
      return;
    }

    res.json({ status: true, message: `Đã gia hạn thành công ${months} tháng` });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// =====================================================================
// MACHINE MANAGEMENT ENDPOINTS
// =====================================================================

// User: xem máy của mình
app.get('/api/user/machines', authMiddleware, async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  try {
    const { data: rpcRes, error } = await supabase.rpc('fn_admin_list_machines', {
      p_username: authUser.username
    });
    if (!error && rpcRes?.machines) {
      res.json({ status: true, machines: rpcRes.machines });
      return;
    }
    const { data: dbMachines } = await supabase
      .from('user_machine_mappings')
      .select('*')
      .eq('user_id', authUser.userId)
      .eq('delflag', false)
      .order('last_seen_at', { ascending: false });
    res.json({ status: true, machines: dbMachines || [] });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Admin: xem máy của user
app.get('/api/admin/users/:username/machines', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { username } = req.params;
  try {
    const { data: rpcRes, error } = await supabase.rpc('fn_admin_list_machines', {
      p_username: username
    });
    if (error) {
      res.status(500).json({ status: false, message: error.message });
      return;
    }
    res.json({ status: true, machines: rpcRes?.machines || [] });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Admin: xoá 1 máy
app.delete('/api/admin/users/:username/machines/:machineId', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { username, machineId } = req.params;
  try {
    const { data, error } = await supabase.rpc('fn_admin_remove_machine', {
      p_username: username,
      p_machine_id: machineId
    });
    if (error) {
      res.status(500).json({ status: false, message: error.message });
      return;
    }
    res.json({ status: true, message: 'Đã gỡ thiết bị thành công', data });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Admin: reset toàn bộ máy
app.post('/api/admin/users/:username/reset-machines', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { username } = req.params;
  try {
    const { data, error } = await supabase.rpc('fn_admin_reset_machines', {
      p_username: username
    });
    if (error) {
      res.status(500).json({ status: false, message: error.message });
      return;
    }
    res.json({ status: true, message: 'Đã đặt lại toàn bộ thiết bị của tài khoản', data });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Admin: đặt số máy tối đa
app.post('/api/admin/users/:username/max-machines', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { username } = req.params;
  const max_machines = Number(req.body.max_machines) || 1;
  try {
    const { data, error } = await supabase.rpc('fn_admin_set_max_machines', {
      p_username: username,
      p_max_machines: max_machines
    });
    if (error) {
      res.status(500).json({ status: false, message: error.message });
      return;
    }
    res.json({ status: true, message: `Đã đổi số máy tối đa thành ${max_machines}`, data });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/admin/orders
app.get('/api/admin/orders', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const statusFilter = req.query.status as string;

  try {
    let query = supabase.from('payment_orders').select('*').order('created_at', { ascending: false });
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data: orders, error } = await query;
    if (error) {
      res.status(500).json({ status: false, message: error.message });
      return;
    }
    res.json({ status: true, orders: orders || [] });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/admin/revenue
app.get('/api/admin/revenue', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const { data: items, error } = await supabase.from('revenue_ledger').select('*').order('created_at', { ascending: false });
    if (error) {
      res.status(500).json({ status: false, message: error.message });
      return;
    }
    const list = items || [];
    const totalGross = list.reduce((a, c) => a + Number(c.gross || 0), 0);
    const totalCommission = list.reduce((a, c) => a + Number(c.commission_amt || 0), 0);
    const totalNet = list.reduce((a, c) => a + Number(c.net_amount || 0), 0);

    res.json({
      status: true,
      summary: { totalGross, totalCommission, totalNet, count: list.length },
      items: list
    });
  } catch (err: any) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/admin/revenue/export
app.get('/api/admin/revenue/export', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const { data: items } = await supabase.from('revenue_ledger').select('*').order('created_at', { ascending: false });
    let csv = 'ID,Doanh Thu Gộp (VND),Hoa Hồng (VND),Thực Nhận (VND),Tháng,Năm,Thời Gian\n';
    (items || []).forEach(item => {
      csv += `"${item.id}",${item.gross},${item.commission_amt},${item.net_amount},${item.month},${item.year},"${item.created_at}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=thanlong_revenue_ledger.csv');
    res.send('\uFEFF' + csv);
  } catch (err: any) {
    res.status(500).send('Lỗi: ' + err.message);
  }
});

// =====================================================================
// VITE DEV SERVER / STATIC INTEGRATION
// =====================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Thần Long Mobile Auto Pro server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Cổng ${PORT} đang bận, sẽ tự động thử lại sau 500ms...`);
      setTimeout(() => {
        try {
          server.close();
        } catch (_) {}
        server.listen(PORT, '0.0.0.0');
      }, 500);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
