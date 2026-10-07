-- ==========================================================
-- วินิจฉัย + แก้ policy ของตาราง admins (เผื่อ migration รอบก่อนสะดุดกลางทาง)
-- รันทีละคำสั่งตามลำดับ
-- ==========================================================

-- 1) เช็คว่าตอนนี้ตาราง admins มี policy อะไรอยู่บ้าง
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'admins';

-- ควรเห็น 3 แถว: select, insert, delete
-- ถ้าไม่เห็นแถว insert เลย (cmd = 'INSERT') นั่นคือสาเหตุ — ไปรันคำสั่งที่ 2 ต่อ

-- 2) ลบ policy เดิม (เผื่อมีอยู่ค้างแบบผิดๆ) แล้วสร้างใหม่ให้ครบ ปลอดภัยที่จะรันซ้ำได้
drop policy if exists "insert admin (first admin or by existing full admin)" on admins;

create policy "insert admin (first admin or by existing full admin)" on admins
  for insert with check (
    not exists (select 1 from admins a where a.village_id = admins.village_id)
    or (public.current_role() = 'admin' and public.current_village_id() = admins.village_id)
  );

-- 3) เช็คด้วยว่า helper function current_village_id() / current_role() ถูกสร้างไว้จริง
select proname from pg_proc where proname in ('current_role', 'current_village_id');

-- ควรเห็น 2 แถว ถ้าไม่เห็น (ว่างเปล่า) แปลว่าฟังก์ชันยังไม่ถูกสร้าง ให้กลับไปรัน
-- supabase_migrate_to_real_auth.sql ใหม่ทั้งไฟล์อีกครั้ง (รันซ้ำได้ ไม่มีผลเสีย)
