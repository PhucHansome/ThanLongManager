import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || 'thanlong_jwt_secret_2026_secured';

export function createJWT(payload: { userId: string; username: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 7 * 86400 })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJWT(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: false, message: 'Vui lòng đăng nhập để tiếp tục' });
    return null;
  }
  const token = authHeader.substring(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) throw new Error('Invalid signature');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Expired');
    return payload;
  } catch {
    res.status(401).json({ status: false, message: 'Phiên đăng nhập đã hết hạn' });
    return null;
  }
}

export function requireAdmin(user: any, res: VercelResponse) {
  if (!user || user.role !== 'admin') {
    res.status(403).json({ status: false, message: 'Bạn không có quyền truy cập trang quản trị' });
    return false;
  }
  return true;
}