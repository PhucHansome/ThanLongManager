import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../_lib/supabase';
import { mapDbStatusToFrontend } from '../../_lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let orderCode = req.query?.orderCode as string;
  if (!orderCode) {
    const parts = (req.url || '').split('/');
    const statusIndex = parts.indexOf('status');
    if (statusIndex > 0) {
      orderCode = parts[statusIndex - 1];
    }
  }

  if (!orderCode) {
    return res.status(400).json({ status: false, message: 'Thiếu mã đơn hàng' });
  }

  try {
    const { data: order, error } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_code', orderCode)
      .maybeSingle();

    if (error || !order) {
      return res.status(404).json({ status: false, message: 'Không tìm thấy đơn hàng: ' + orderCode });
    }

    // Map status số (0: pending, 1: paid, 2: expired, 3: cancelled) sang chữ cho Frontend
    const mappedOrder = {
      ...order,
      status: mapDbStatusToFrontend(order.status)
    };

    return res.json({ status: true, order: mappedOrder });
  } catch (err: any) {
    return res.status(500).json({ status: false, message: err.message });
  }
}
