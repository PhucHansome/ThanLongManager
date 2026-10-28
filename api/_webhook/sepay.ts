import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { mapDbStatusToFrontend, mapFrontendStatusToDb } from '../_lib/utils';

const SEPAY_API_KEY = (process.env.SEPAY_API_KEY || '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  // 1. Xác thực SePay API Key (nếu có cấu hình trong .env)
  const authHeader = req.headers.authorization;
  const apiKey = authHeader ? authHeader.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim() : '';
  if (SEPAY_API_KEY && apiKey !== SEPAY_API_KEY) {
    return res.status(401).json({ status: false, message: 'Sai API Key xác thực SePay' });
  }

  // 2. Trích xuất thông tin giao dịch từ payload SePay
  const bank_txn_id = req.body?.id || req.body?.bank_txn_id || `TXN-${Date.now()}`;
  const amount = Number(req.body?.transferAmount ?? req.body?.amount ?? 0);
  const transferType = req.body?.transferType; // 'in' là tiền vào, 'out' là tiền ra
  const content = String(req.body?.content || req.body?.description || '');

  // Bỏ qua giao dịch tiền ra
  if (transferType === 'out') {
    return res.json({ status: true, message: 'Bỏ qua giao dịch chuyển tiền ra' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ status: false, message: 'Thiếu dữ liệu số tiền giao dịch' });
  }

  // 3. Trích xuất mã đơn hàng (Format: TLBB + chữ/số)
  const match = content.toUpperCase().match(/\b(TLBB[A-Z0-9]{4,12})\b/);
  const extractedOrderCode = match ? match[1] : null;

  if (!extractedOrderCode) {
    await supabase.from('bank_transactions').insert({
      bank_txn_id: String(bank_txn_id),
      amount: amount,
      description: `${content} [KHÔNG TÌM THẤY MÃ ĐƠN]`,
      raw_payload: req.body
    });
    return res.json({ status: true, message: 'Ghi nhận giao dịch nhưng không tìm thấy mã đơn hàng' });
  }

  try {
    // 4. Tìm đơn hàng tương ứng trong payment_orders
    const { data: order, error: orderErr } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_code', extractedOrderCode)
      .maybeSingle();

    if (orderErr || !order) {
      await supabase.from('bank_transactions').insert({
        bank_txn_id: String(bank_txn_id),
        amount: amount,
        description: `${content} [ĐƠN HÀNG KHÔNG TỒN TẠI: ${extractedOrderCode}]`,
        raw_payload: req.body
      });
      return res.status(404).json({ status: false, message: `Không tìm thấy đơn hàng ${extractedOrderCode}` });
    }

    // Đã thanh toán (status = 1 hoặc 'paid')
    if (order.status === 1 || order.status === 'paid') {
      return res.json({ status: true, message: 'Đơn hàng này đã được thanh toán và kích hoạt trước đó' });
    }

    // 5. Kiểm tra số tiền chuyển so với giá trị đơn hàng
    if (amount < Number(order.amount)) {
      await supabase.from('bank_transactions').insert({
        bank_txn_id: String(bank_txn_id),
        amount: amount,
        description: `${content} [CHUYỂN THIẾU TIỀN: nhận ${amount}, cần ${order.amount}]`,
        raw_payload: req.body
      });
      return res.status(400).json({
        status: false,
        message: `Số tiền chuyển (${amount} đ) không đủ giá trị đơn hàng (${order.amount} đ)`
      });
    }

    // 6. Ghi nhận giao dịch ngân hàng
    await supabase.from('bank_transactions').insert({
      bank_txn_id: String(bank_txn_id),
      amount: amount,
      description: content,
      raw_payload: req.body
    });

    // 7. Cập nhật trạng thái đơn hàng -> 1 (paid)
    await supabase
      .from('payment_orders')
      .update({
        status: 1, // 1: paid
        paid_at: new Date().toISOString(),
        bank_txn_id: String(bank_txn_id)
      })
      .eq('id', order.id);

    // 8. Tự động gia hạn License cho User
    const { data: u } = await supabase.from('users').select('id, username').eq('id', order.user_id).maybeSingle();
    const targetUsername = u?.username || 'user';

    let extendSuccess = false;

    // Thử gọi RPC fn_extend_license theo p_user_id
    const rpc1 = await supabase.rpc('fn_extend_license', {
      p_user_id: order.user_id,
      p_months: Number(order.months)
    });
    if (!rpc1.error) {
      extendSuccess = true;
    } else {
      // Fallback: Thử gọi theo p_username
      const rpc2 = await supabase.rpc('fn_extend_license', {
        p_username: targetUsername,
        p_months: Number(order.months)
      });
      if (!rpc2.error) {
        extendSuccess = true;
      }
    }

    // Fallback cấp độ 2: Cập nhật trực tiếp bảng licenses
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

    // 9. Ghi sổ cái doanh thu
    const now = new Date();
    await supabase.from('revenue_ledger').insert({
      order_id: order.id,
      gross: amount,
      commission_pct: 0,
      commission_amt: 0,
      net_amount: amount,
      month: now.getMonth() + 1,
      year: now.getFullYear()
    });

    return res.json({
      status: true,
      message: 'Xác nhận thanh toán và tự động gia hạn thành công!',
      order_code: extractedOrderCode
    });
  } catch (err: any) {
    return res.status(500).json({ status: false, message: err.message || 'Lỗi xử lý webhook' });
  }
}
