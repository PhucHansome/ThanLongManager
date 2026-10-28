import type { VercelRequest, VercelResponse } from '@vercel/node';

// Đã sửa lại đường dẫn khớp với tên file mới
import loginHandler from './_auth/login';
import registerHandler from './_auth/register';
import meHandler from './_auth/me';
import changePasswordHandler from './_auth/change-password';

import adminUsersHandler from './_admin/users';
import adminUserDetailHandler from './_admin/users/user-detail'; // Sửa
import adminUserExtendHandler from './_admin/users/user-extend'; // Sửa
import adminUserStatusHandler from './_admin/users/user-status'; // Sửa

import adminOrdersHandler from './_admin/orders';
import adminStatsHandler from './_admin/stats';
import adminRevenueHandler from './_admin/revenue.ts';
import adminRevenueExportHandler from './_admin/revenue/export';

import ordersCreateHandler from './_orders/create';
import orderStatusHandler from './_orders/order-status'; // Sửa

import pricingHandler from './_pricing';
import systemStatusHandler from './_system/status';
import userMachinesHandler from './_user/machines';
import webhookSepayHandler from './_webhook/sepay';
import webhookSimulateHandler from './_webhook/simulate-payment';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const path = url.replace(/^\/api/, '').split('?')[0];

  // 1. Nhóm Auth
  if (path === '/auth/login') return loginHandler(req, res);
  if (path === '/auth/register') return registerHandler(req, res);
  if (path === '/auth/me') return meHandler(req, res);
  if (path === '/auth/change-password') return changePasswordHandler(req, res);

  // 2. Nhóm Admin
  if (path === '/admin/users') return adminUsersHandler(req, res);
  if (path === '/admin/orders') return adminOrdersHandler(req, res);
  if (path === '/admin/stats') return adminStatsHandler(req, res);
  if (path === '/admin/revenue') return adminRevenueHandler(req, res);
  if (path === '/admin/revenue/export') return adminRevenueExportHandler(req, res);
  
  // 3. Nhóm Admin - Users động
  const adminUserMatch = path.match(/^\/admin\/users\/([^\/]+)(?:\/(extend|status))?$/);
  if (adminUserMatch) {
    const userId = adminUserMatch[1];
    const action = adminUserMatch[2];
    req.query.id = userId; 
    
    if (action === 'extend') return adminUserExtendHandler(req, res);
    if (action === 'status') return adminUserStatusHandler(req, res);
    if (!action) return adminUserDetailHandler(req, res);
  }

  // 4. Nhóm Orders
  if (path === '/orders/create') return ordersCreateHandler(req, res);
  const orderStatusMatch = path.match(/^\/orders\/([^\/]+)\/status$/);
  if (orderStatusMatch) {
    req.query.orderCode = orderStatusMatch[1];
    return orderStatusHandler(req, res);
  }

  // 5. Các route lẻ
  if (path === '/pricing') return pricingHandler(req, res);
  if (path === '/system/status') return systemStatusHandler(req, res);
  if (path === '/user/machines') return userMachinesHandler(req, res);
  if (path === '/webhook/sepay') return webhookSepayHandler(req, res);
  if (path === '/webhook/simulate-payment') return webhookSimulateHandler(req, res);

  return res.status(404).json({ status: false, message: `API route not found: ${path}` });
}