import type { VercelRequest, VercelResponse } from '@vercel/node';

import loginHandler from './_auth/login.js';
import registerHandler from './_auth/register.js';
import meHandler from './_auth/me.js';
import changePasswordHandler from './_auth/change-password.js';

import adminUsersHandler from './_admin/users.js';
import adminUserDetailHandler from './_admin/users/user-detail.js'; 
import adminUserExtendHandler from './_admin/users/user-extend.js'; 
import adminUserStatusHandler from './_admin/users/user-status.js'; 

import adminOrdersHandler from './_admin/orders.js';
import adminStatsHandler from './_admin/stats.js';
import adminRevenueHandler from './_admin/revenue.js';
import adminRevenueExportHandler from './_admin/revenue/export.js';

import ordersCreateHandler from './_orders/create.js';
import orderStatusHandler from './_orders/order-status.js'; 

import pricingHandler from './_pricing.js';
import systemStatusHandler from './_system/status.js';
import userMachinesHandler from './_user/machines.js';
import webhookSepayHandler from './_webhook/sepay.js';
import webhookSimulateHandler from './_webhook/simulate-payment.js';

import systemVersionHandler from './_system/version.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  // Xóa dấu gạch chéo ở cuối nếu có (ví dụ: /webhook/sepay/ -> /webhook/sepay)
  let path = url.replace(/^\/api/, '').split('?')[0];
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  
  // Thêm dòng này để in ra log, xem SePay gọi đường dẫn là gì
  console.log("🔍 Đường dẫn nhận được từ SePay:", path);

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
  if (path === '/system/version') return systemVersionHandler(req, res);
  if (path === '/user/machines') return userMachinesHandler(req, res);
  if (path === '/webhook/sepay') return webhookSepayHandler(req, res);
  if (path === '/webhook/simulate-payment') return webhookSimulateHandler(req, res);



  return res.status(404).json({ status: false, message: `API route not found: ${path}` });
}