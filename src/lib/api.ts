import { AuthSession, DashboardStats, PaymentOrder, PricingPlan, RevenueLedgerItem, User } from '../types';

const TOKEN_KEY = 'tlbb_auth_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

    if (!response.ok) {
    // Lấy Content-Type để biết server trả về JSON hay HTML
    const contentType = response.headers.get("content-type");
    
    // Nếu là JSON (lỗi 400, 500 từ Backend có message rõ ràng)
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Lỗi kết nối (${response.status})`);
    } 
    
    // Nếu là HTML (lỗi 404, 405 của Vercel)
    const errorText = await response.text();
    if (errorText.includes('<!DOCTYPE html>')) {
      throw new Error(`Lỗi hệ thống (${response.status}): API chưa được cấu hình đúng.`);
    }
    throw new Error(`Lỗi kết nối (${response.status}). Vui lòng thử lại!`);
  }

  // 2. Nếu thành công (200), tiến hành đọc JSON
  try {
    const data = await response.json();
    if (data.status === false) {
      throw new Error(data.message || 'Yêu cầu không thành công');
    }
    return data;
  } catch (err: any) {
    throw new Error('Dữ liệu trả về không hợp lệ.');
  }
}

// System Status
export const apiGetSystemStatus = async (): Promise<{
  connected: boolean;
  supabase_url?: string | null;
  real_users_count?: number;
  message?: string;
  error?: string;
}> => {
  const res = await fetch('/api/system/status');
  return res.json();
};

export const apiGetAppVersion = async (): Promise<{ update_url: string; latest_version: string }> => {
  const res = await fetch('/api/system/version');
  return res.json();
};

let cachedClientIPv4: string | undefined = undefined;

// Lấy địa chỉ public IPv4 từ trình duyệt nếu có (timeout 1s)
export const fetchClientIPv4 = async (): Promise<string | undefined> => {
  if (cachedClientIPv4) return cachedClientIPv4;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(data.ip)) {
        cachedClientIPv4 = data.ip;
        return cachedClientIPv4;
      }
    }
  } catch {
    // Nếu timeout hoặc bị chặn, backend server sẽ tự động trích xuất IPv4 từ proxy headers
  }
  return undefined;
};

// Auth API
export const apiRegister = async (data: {
  username: string;
  password: string;
  confirmPassword: string;
  full_name?: string;
  email?: string;
  phone?: string;
}): Promise<{ status: boolean; message: string; user_id?: string; username?: string }> => {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const apiLogin = async (username: string, password: string, machineId?: string): Promise<AuthSession> => {
  const clientIp = await fetchClientIPv4();
  const res = await apiRequest<any>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, machine_id: machineId, client_ip: clientIp })
  });
  setStoredToken(res.token);
  return res;
};

export const apiGetMe = async (): Promise<{ user: User; license: any; machines: any[] }> => {
  return apiRequest('/api/auth/me');
};

export const apiGetUserMachines = async (): Promise<{ status: boolean; machines: any[] }> => {
  return apiRequest('/api/user/machines');
};

export const apiChangePassword = async (oldPassword: string, newPassword: string, confirmPassword: string): Promise<void> => {
  await apiRequest('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
  });
};

// Pricing & Orders
export const apiGetPricing = async (): Promise<PricingPlan[]> => {
  const res = await apiRequest<{ plans: PricingPlan[] }>('/api/pricing');
  return res.plans;
};

export const apiCreateRenewalOrder = async (months: number): Promise<PaymentOrder & { bank_code: string; bank_account: string; bank_name: string }> => {
  const res = await apiRequest<{ order: any }>('/api/orders/create', {
    method: 'POST',
    body: JSON.stringify({ months })
  });
  return res.order;
};

export const apiCheckOrderStatus = async (orderCode: string): Promise<PaymentOrder> => {
  const res = await apiRequest<{ order: PaymentOrder }>(`/api/orders/${orderCode}/status`);
  return res.order;
};

export const apiSimulatePayment = async (orderCode: string): Promise<void> => {
  await apiRequest('/api/webhook/simulate-payment', {
    method: 'POST',
    body: JSON.stringify({ orderCode })
  });
};

// Admin API
export const apiAdminGetStats = async (): Promise<DashboardStats> => {
  const res = await apiRequest<{ stats: DashboardStats }>('/api/admin/stats');
  return res.stats;
};

export const apiAdminGetUsers = async (
  search?: string,
  status?: string,
  role?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ total: number; page: number; limit: number; total_pages: number; users: any[] }> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (role) params.append('role', role);
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  return apiRequest(`/api/admin/users?${params.toString()}`);
};

export const apiAdminCreateUser = async (data: {
  username: string;
  password: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  initial_months: number;
}): Promise<void> => {
  await apiRequest('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const apiAdminUpdateUser = async (id: string, data: Partial<User>): Promise<void> => {
  await apiRequest(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
};

export const apiAdminSetUserStatus = async (id: string, status: number, locked_reason?: string): Promise<void> => {
  await apiRequest(`/api/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, locked_reason })
  });
};

export const apiAdminExtendLicense = async (id: string, months: number, days?: number): Promise<void> => {
  await apiRequest(`/api/admin/users/${id}/extend`, {
    method: 'POST',
    body: JSON.stringify({ months, days }) // Thêm days vào đây
  });
};

export const apiAdminDeleteUser = async (id: string): Promise<void> => {
  await apiRequest(`/api/admin/users/${id}`, {
    method: 'DELETE'
  });
};

// Admin Machine Management
export const apiAdminGetUserMachines = async (username: string): Promise<any[]> => {
  const res = await apiRequest<{ machines: any[] }>(`/api/admin/users/${username}/machines`);
  return res.machines || [];
};

export const apiAdminRemoveMachine = async (username: string, machineId: string): Promise<void> => {
  await apiRequest(`/api/admin/users/${username}/machines/${encodeURIComponent(machineId)}`, {
    method: 'DELETE'
  });
};

export const apiAdminResetMachines = async (username: string): Promise<void> => {
  await apiRequest(`/api/admin/users/${username}/reset-machines`, {
    method: 'POST'
  });
};

export const apiAdminSetMaxMachines = async (username: string, max_machines: number): Promise<void> => {
  await apiRequest(`/api/admin/users/${username}/max-machines`, {
    method: 'POST',
    body: JSON.stringify({ max_machines })
  });
};

export const apiAdminGetOrders = async (status?: string, search?: string): Promise<PaymentOrder[]> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  const res = await apiRequest<{ orders: PaymentOrder[] }>(`/api/admin/orders?${params.toString()}`);
  return res.orders;
};

export const apiAdminGetRevenue = async (month?: number, year?: number): Promise<{
  summary: { totalGross: number; totalCommission: number; totalNet: number; count: number };
  items: RevenueLedgerItem[];
}> => {
  const params = new URLSearchParams();
  if (month) params.append('month', month.toString());
  if (year) params.append('year', year.toString());
  return apiRequest(`/api/admin/revenue?${params.toString()}`);
};