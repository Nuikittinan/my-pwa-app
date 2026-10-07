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

/**
 * สร้าง Supabase client "ใช้แล้วทิ้ง" แยกต่างหาก สำหรับตอนแอดมินสร้างบัญชีใหม่
 * (เพิ่มบ้าน / เพิ่มพนักงาน) ขณะที่ตัวเองยัง login ค้างอยู่
 *
 * เหตุผลที่ต้องแยก client: ถ้าเรียก supabase.auth.signUp() บน client หลัก (ตัวที่
 * เก็บ session ของแอดมินไว้ใน localStorage) มันจะ "สลับ session" ไปเป็นผู้ใช้ใหม่
 * ที่เพิ่งสร้างทันที เท่ากับเตะแอดมินออกจากระบบโดยไม่ตั้งใจ — client แยกตัวนี้ตั้งค่า
 * persistSession/autoRefreshToken เป็น false เลยไม่ไปยุ่งกับ session หลักใน localStorage
 * ใช้ครั้งเดียวแล้วปล่อยทิ้งได้เลย (ไม่ต้อง client.auth.signOut() ก็ได้ เพราะไม่เคย persist)
 */
export function createProvisioningClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
