import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Đảm bảo nạp file .env từ thư mục gốc
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ujcmnkhjqeohtyorvusy.supabase.co';
const rawSupabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
const isSupabaseConfigured = rawSupabaseKey.length > 10;
const SUPABASE_KEY = isSupabaseConfigured ? rawSupabaseKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

if (!isSupabaseConfigured) {
  console.warn('⚠️ [CHÚ Ý] Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY hoặc SUPABASE_ANON_KEY trong .env');
}
