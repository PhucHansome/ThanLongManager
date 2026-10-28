import type { VercelRequest } from '@vercel/node';

export const ADMIN_BANK_CODE = process.env.ADMIN_BANK_CODE || 'VIETINBANK';
export const ADMIN_BANK_ACCOUNT = process.env.ADMIN_BANK_ACCOUNT || '107872473033';
export const ADMIN_BANK_NAME = process.env.ADMIN_BANK_NAME || 'NGUYEN VAN PHUC';

export const DEFAULT_PRICING = [
  { id: 'p-1', months: 1, price: 70000, discount_pct: 0, label: 'Gói 1 Tháng', is_active: true },
  { id: 'p-3', months: 3, price: 210000, discount_pct: 6.67, label: 'Gói 3 Tháng (-6.67%)', is_active: true },
  { id: 'p-6', months: 6, price: 420000, discount_pct: 10, label: 'Gói 6 Tháng (-10%)', is_active: true },
  { id: 'p-12', months: 12, price: 840000, discount_pct: 16.67, label: 'Gói 1 Năm (-16.67%)', is_active: true }
];

export function calculateDaysLeft(endDateStr: string | null | undefined): number {
  if (!endDateStr) return 0;
  const end = new Date(endDateStr).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function mapDbStatusToFrontend(status: any): 'pending' | 'paid' | 'expired' | 'cancelled' {
  if (status === 1 || status === 'paid') return 'paid';
  if (status === 2 || status === 'expired') return 'expired';
  if (status === 3 || status === 'cancelled') return 'cancelled';
  return 'pending';
}

export function mapFrontendStatusToDb(status: any): number {
  if (status === 'paid' || status === 1) return 1;
  if (status === 'expired' || status === 2) return 2;
  if (status === 'cancelled' || status === 3) return 3;
  return 0; // pending
}

export function extractIPv4(req: VercelRequest): string {
  const customIp = req.body?.ip || req.body?.client_ip;
  if (typeof customIp === 'string') {
    const trimmed = customIp.trim();
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
      const octets = trimmed.split('.').map(Number);
      if (octets.every(o => o >= 0 && o <= 255)) return trimmed;
    }
  }

  const headerCandidates = [
    req.headers['x-forwarded-for'],
    req.headers['x-real-ip'],
    req.headers['cf-connecting-ip'],
    req.headers['x-client-ip'],
    req.socket?.remoteAddress
  ];

  for (const h of headerCandidates) {
    if (!h) continue;
    const str = Array.isArray(h) ? h.join(',') : String(h);
    const parts = str.split(',').map(s => s.trim());
    for (let part of parts) {
      if (part.startsWith('::ffff:')) part = part.substring(7);
      if (part === '::1' || part === 'localhost') return '127.0.0.1';
      const match = part.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
      if (match) {
        const candidate = match[1];
        const octets = candidate.split('.').map(Number);
        if (octets.every(o => o >= 0 && o <= 255)) return candidate;
      }
    }
  }
  return '127.0.0.1';
}
