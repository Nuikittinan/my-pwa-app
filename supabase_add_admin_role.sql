-- ==========================================================
-- เพิ่มบทบาท (role) ให้บัญชีผู้ดูแล เพื่อรองรับ "พนักงานจดมิเตอร์"
-- ที่เข้าได้แค่หน้าจดมิเตอร์อย่างเดียว ไม่เห็นข้อมูลเงิน/ตั้งค่า
-- รันครั้งเดียวใน Supabase SQL Editor
-- ==========================================================

-- ค่า role ที่ใช้: 'admin' (ผู้ดูแลเต็มสิทธิ์ - ค่าเริ่มต้น) หรือ 'meter_reader' (จดมิเตอร์อย่างเดียว)
alter table admins add column if not exists role text not null default 'admin';

-- เดิม admins มีแค่ policy อ่านได้ (select) กับสร้างได้ (insert)
-- ตอนนี้ต้องลบบัญชีพนักงานจดมิเตอร์ได้ด้วย เลยต้องเปิด policy delete เพิ่ม
create policy "public delete admins" on admins for delete using (true);
