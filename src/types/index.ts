export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: number; // 1: active, 0: locked
  delflag: boolean;
  locked_reason?: string | null;
  note?: string | null;
  max_machines?: number;
  register_ip?: string | null;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  created_at: string;
  updtime?: string | null;
}

export interface License {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  days_left: number;
  status: number; // 1: active, 0: expired
  is_expired: boolean;
  delflag: boolean;
}

export interface UserMachineMapping {
  id: string;
  user_id: string;
  machine_id: string;
  ip_address: string;
  note?: string | null;
  last_active_at: string;
}

export interface PricingPlan {
  id: string;
  months: number;
  price: number;
  discount_pct: number;
  label: string;
  is_active: boolean;
}

export type OrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

export interface PaymentOrder {
  id: string;
  order_code: string;
  user_id: string;
  username?: string;
  months: number;
  amount: number;
  status: OrderStatus;
  qr_url: string;
  bank_txn_id?: string | null;
  license_before: string;
  license_after: string;
  expires_at: string;
  paid_at?: string | null;
  created_at: string;
}

export interface RevenueLedgerItem {
  id: string;
  order_id: string;
  order_code?: string;
  username?: string;
  gross: number;
  commission_pct: number;
  commission_amt: number;
  net_amount: number;
  month: number;
  year: number;
  created_at: string;
}

export interface TopSpender {
  user_id: string;
  username: string;
  full_name: string;
  total_spent: number;
  orders_count: number;
}

export interface MonthlyRevenue {
  month_label: string;
  month: number;
  year: number;
  gross: number;
  net: number;
  order_count: number;
}

export interface DashboardStats {
  revenue_this_month: number;
  revenue_this_year: number;
  gross_this_month: number;
  commission_this_month: number;
  users_count: {
    total: number;
    active: number;
    locked: number;
    expired: number;
  };
  orders_count: {
    pending_this_month: number;
    paid_this_month: number;
    total_this_month: number;
  };
  monthly_revenue_12m: MonthlyRevenue[];
  top_10_spenders: TopSpender[];
}

export interface AuthSession {
  token: string;
  user: User;
  license: License;
}
