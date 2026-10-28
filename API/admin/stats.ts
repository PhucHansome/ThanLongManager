import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase';
import { verifyJWT, requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authUser = verifyJWT(req, res);
  if (!authUser || !requireAdmin(authUser, res)) return;

  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // 1. Lấy dữ liệu sổ cái doanh thu
    const { data: ledgers } = await supabase.from('revenue_ledger').select('*');
    const allLedgers = ledgers || [];

    const thisMonthLedgers = allLedgers.filter(r => r.month === currentMonth && r.year === currentYear);
    const thisYearLedgers = allLedgers.filter(r => r.year === currentYear);

    const revenueThisMonth = thisMonthLedgers.reduce((acc, curr) => acc + Number(curr.net_amount || 0), 0);
    const grossThisMonth = thisMonthLedgers.reduce((acc, curr) => acc + Number(curr.gross || 0), 0);
    const commissionThisMonth = thisMonthLedgers.reduce((acc, curr) => acc + Number(curr.commission_amt || 0), 0);
    const revenueThisYear = thisYearLedgers.reduce((acc, curr) => acc + Number(curr.net_amount || 0), 0);

    // 2. Lấy dữ liệu users
    const { data: users } = await supabase
      .from('users')
      .select('id, username, full_name, status, role, delflag')
      .eq('delflag', false);
    const userList = users || [];

    // 3. Lấy dữ liệu licenses để thống kê số tài khoản hết hạn
    const { data: licenses } = await supabase
      .from('licenses')
      .select('user_id, end_date, status, delflag')
      .eq('delflag', false);
    const allLicenses = licenses || [];

    const now = Date.now();
    let expiredUsersCount = 0;
    userList.forEach(u => {
      const userLics = allLicenses.filter(l => l.user_id === u.id);
      if (userLics.length === 0) {
        expiredUsersCount++;
      } else {
        const latestEnd = Math.max(...userLics.map(l => new Date(l.end_date).getTime()));
        if (latestEnd < now) {
          expiredUsersCount++;
        }
      }
    });

    // 4. Lấy dữ liệu đơn hàng
    const { data: orders } = await supabase.from('payment_orders').select('*');
    const allOrders = orders || [];

    const thisMonthOrders = allOrders.filter(o => {
      const d = new Date(o.created_at);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });

    // Hỗ trợ cả status dạng số (0, 1) và chữ ('pending', 'paid')
    const pendingThisMonth = thisMonthOrders.filter(o => o.status === 0 || o.status === 'pending').length;
    const paidThisMonth = thisMonthOrders.filter(o => o.status === 1 || o.status === 'paid').length;

    // 5. Thống kê 12 tháng gần nhất
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

    // 6. Top 10 khách hàng chi tiêu nhiều nhất
    const spendMap = new Map<string, { total_spent: number; count: number }>();
    allOrders
      .filter(o => o.status === 1 || o.status === 'paid')
      .forEach(o => {
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

    return res.json({
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
          expired: expiredUsersCount
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
    return res.status(500).json({ status: false, message: err.message });
  }
}
