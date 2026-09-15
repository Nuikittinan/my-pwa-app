import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // จะเห็น error นี้ตอน dev ถ้าลืมสร้างไฟล์ .env.local หรือลืมตั้ง env บน Vercel
  console.error(
    '[supabase] ไม่พบ VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY — ' +
      'ตรวจสอบไฟล์ .env.local (ตอน dev) หรือ Environment Variables บน Vercel (ตอน deploy)'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
