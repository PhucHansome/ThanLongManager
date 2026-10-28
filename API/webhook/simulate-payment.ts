import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  const { orderCode } = req.body || {};
  if (!orderCode) {
    return res.status(400).json({ status: false, message: 'Thiếu mã đơn hàng orderCode' });
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

    if (order.status === 1 || order.status === 'paid') {
      return res.json({ status: true, message: 'Đơn hàng này đã được thanh toán trước đó' });
    }

    const simTxnId = `SIM-${Date.now().toString().slice(-8)}`;

    // 1. Cập nhật trạng thái payment_orders -> 1 (paid)
    await supabase
      .from('payment_orders')
      .update({
        status: 1,
        paid_at: new Date().toISOString(),
        bank_txn_id: simTxnId
      })
      .eq('id', order.id);

    // 2. Ghi nhận giao dịch giả lập vào bank_transactions
    await supabase.from('bank_transactions').insert({
      bank_txn_id: simTxnId,
      amount: Number(order.amount),
      description: `GIẢ LẬP THANH TOÁN [${orderCode}]`,
      raw_payload: { simulated: true, orderCode, timestamp: new Date().toISOString() }
    });

    // 3. Gia hạn License cho User
    const { data: u } = await supabase.from('users').select('id, username').eq('id', order.user_id).maybeSingle();
    const targetUsername = u?.username || 'user';

    let extendSuccess = false;
    const rpc1 = await supabase.rpc('fn_extend_license', {
      p_user_id: order.user_id,
      p_months: Number(order.months)
    });
    if (!rpc1.error) {
      extendSuccess = true;
    } else {
      const rpc2 = await supabase.rpc('fn_extend_license', {
        p_username: targetUsername,
        p_months: Number(order.months)
      });
      if (!rpc2.error) extendSuccess = true;
    }

    // Fallback nếu không có RPC
    if (!extendSuccess) {
      const { data: lic } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', order.user_id)
        .eq('delflag', false)
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      let newEnd = new Date();
      if (lic && new Date(lic.end_date).getTime() > Date.now()) {
        newEnd = new Date(lic.end_date);
      }
      newEnd.setMonth(newEnd.getMonth() + Number(order.months));

      if (lic) {
        await supabase
          .from('licenses')
          .update({ end_date: newEnd.toISOString(), status: 1, updtime: new Date().toISOString() })
          .eq('id', lic.id);
      } else {
        await supabase.from('licenses').insert({
          user_id: order.user_id,
          start_date: new Date().toISOString(),
          end_date: newEnd.toISOString(),
          status: 1
        });
      }
    }

    // 4. Ghi sổ cái doanh thu
    const now = new Date();
    await supabase.from('revenue_ledger').insert({
      order_id: order.id,
      gross: Number(order.amount),
      commission_pct: 0,
      commission_amt: 0,
      net_amount: Number(order.amount),
      month: now.getMonth() + 1,
      year: now.getFullYear()
    });

    return res.json({
      status: true,
      message: 'Giả lập thanh toán thành công!',
      license_after: order.license_after
    });
  } catch (err: any) {
    return res.status(500).json({ status: false, message: err.message || 'Lỗi giả lập thanh toán' });
  }
}
