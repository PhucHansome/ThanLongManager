import { supabase } from './api/_lib/supabase.js';

async function getActiveBaseUrl(): Promise<string> {
  const ports = [5174, 5173, 3000];
  for (const port of ports) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/system/status`, {
        signal: AbortSignal.timeout(1000)
      });
      if (res.ok) {
        return `http://127.0.0.1:${port}`;
      }
    } catch {}
  }
  return 'http://127.0.0.1:5174';
}

async function testSepayFlow() {
  console.log('\n======================================================');
  console.log('   TEST GIẢ LẬP TỰ ĐỘNG WEBHOOK SEPAY & DATABASE');
  console.log('======================================================\n');

  console.log('[1] Đang dò tìm cổng server Vite đang chạy...');
  const baseUrl = await getActiveBaseUrl();
  console.log(`    -> Đã kết nối thành công tới máy chủ tại: ${baseUrl}`);

  try {
    const sysRes = await fetch(`${baseUrl}/api/system/status`, { signal: AbortSignal.timeout(3000) });
    const sys = await sysRes.json();
    console.log('[2] Kết nối Supabase Database:', sys.connected ? '✅ Hoạt động (Online)' : '❌ Lỗi');
  } catch (err: any) {
    console.log('❌ Lỗi kết nối hệ thống:', err.message);
    return;
  }

  // Kiểm tra xem người dùng có truyền mã đơn vào không, hoặc có đơn hàng nào đang chờ thanh toán trên Web không
  const argOrderCode = process.argv[2];
  let targetOrderCode = '';
  let targetAmount = 70000;
  let isExistingPendingOrder = false;
  let tempOrderId: string | null = null;

  if (argOrderCode && argOrderCode.startsWith('TLBB')) {
    targetOrderCode = argOrderCode;
    console.log(`[3] Sử dụng mã đơn được chỉ định: ${targetOrderCode}`);
  } else {
    // Tự động tìm đơn hàng đang chờ thanh toán (status = 0) mới nhất trên Web (trong 30 phút qua)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: pendingOrders } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('status', 0)
      .gte('created_at', thirtyMinsAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pendingOrders && pendingOrders.length > 0) {
      const pending = pendingOrders[0];
      targetOrderCode = pending.order_code;
      targetAmount = Number(pending.amount);
      isExistingPendingOrder = true;
      console.log(`[3] 🎯 Phát hiện đơn hàng bạn đang mở trên trình duyệt: ${targetOrderCode} (${targetAmount.toLocaleString('vi-VN')} đ)`);
    }
  }

  // Nếu không có đơn nào đang mở trên web, tự tạo 1 đơn test ngẫu nhiên
  if (!targetOrderCode) {
    const { data: user } = await supabase.from('users').select('id, username').limit(1).single();
    if (!user) {
      console.error('Không tìm thấy tài khoản nào trong database để test');
      return;
    }

    targetOrderCode = 'TLBB' + Math.floor(100000 + Math.random() * 900000);
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const { data: created, error } = await supabase.from('payment_orders').insert({
      order_code: targetOrderCode,
      user_id: user.id,
      months: 1,
      amount: targetAmount,
      status: 0,
      qr_url: 'https://img.vietqr.io/test.png',
      license_before: now.toISOString(),
      license_after: nextMonth.toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }).select().single();

    if (error || !created) {
      console.error('Lỗi tạo đơn test:', error);
      return;
    }
    tempOrderId = created.id;
    console.log(`[3] Tự tạo đơn test ngẫu nhiên: ${targetOrderCode} (${targetAmount.toLocaleString('vi-VN')} đ)`);
  }

  // 4. Bắn Webhook SePay giả lập cho mã đơn này
  console.log(`[4] Giả lập SePay bắn webhook xác nhận chuyển khoản cho đơn ${targetOrderCode}...`);
  const fakeTxnId = Math.floor(100000 + Math.random() * 900000);
  const sepayRes = await fetch(`${baseUrl}/api/webhook/sepay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: fakeTxnId,
      gateway: 'VIETINBANK',
      transferType: 'in',
      transferAmount: targetAmount,
      content: `${targetOrderCode} chuyen khoan thanh toan`,
      accountNumber: '107872473033'
    }),
    signal: AbortSignal.timeout(5000)
  });

  const sepayResult = await sepayRes.json();
  console.log('    -> Phản hồi SePay Webhook:', sepayResult.message);

  // 5. Kiểm tra trạng thái đơn qua API
  const checkRes = await fetch(`${baseUrl}/api/orders/${targetOrderCode}/status`, { signal: AbortSignal.timeout(3000) });
  const check = await checkRes.json();
  console.log(`[5] Trạng thái đơn sau khi nhận webhook:`, check.order?.status);

  if (check.order?.status === 'paid') {
    console.log(`\n🎉 THÀNH CÔNG RỰC RỠ: Đơn ${targetOrderCode} đã được DUYỆT & GIA HẠN THÀNH CÔNG!`);
    if (isExistingPendingOrder) {
      console.log('👉 Hãy nhìn vào màn hình trình duyệt của bạn: Modal thanh toán đã tự động báo thành công!\n');
    }
  } else {
    console.log('\n❌ Thất bại: Đơn chưa chuyển sang paid');
  }

  // Chỉ dọn dẹp nếu đây là đơn tạm do script tự tạo
  if (tempOrderId) {
    await supabase.from('payment_orders').delete().eq('id', tempOrderId);
    console.log(`[6] Đã dọn dẹp đơn test tạm khỏi Database.\n`);
  }
}

testSepayFlow();
