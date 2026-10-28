import { createClient } from '@supabase/supabase-js';

// Lấy biến trực tiếp từ Vercel Environment Variables
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const rawSupabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

// Log cảnh báo rõ ràng nếu Vercel chưa cấu hình biến môi trường
if (!SUPABASE_URL || rawSupabaseKey.length < 10) {
  console.error('🚨 [LỖI VERCEL]: Thiếu biến SUPABASE_URL hoặc SUPABASE_KEY. Hãy kiểm tra Environment Variables!');
}

// Khởi tạo client (dùng fallback an toàn để không bị crash khi khởi động)
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  rawSupabaseKey || 'placeholder-key', 
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);