-- ==========================================================
-- ย้ายระบบ login ไปใช้ Supabase Auth จริง + แก้ RLS ให้บังคับแยกหมู่บ้านจริง
-- รันครั้งเดียวใน Supabase SQL Editor (รันทั้งไฟล์รวดเดียวได้)
--
-- ⚠️ หลังรันไฟล์นี้ บัญชีเก่าทั้งหมด (บ้าน/แอดมิน/พนักงานที่มีอยู่ก่อนหน้า) จะ
-- login ไม่ได้อีกต่อไป เพราะยังไม่มีบัญชี Supabase Auth คู่กัน ต้องสมัคร/เพิ่มใหม่
-- ผ่านแอปทั้งหมด (ตามที่ตกลงกันไว้ว่ายอมรับได้เพราะยังเป็นข้อมูลทดสอบ)
--
-- ⚠️ ก่อนรัน ต้องไปปิด "Confirm email" ที่ Supabase Dashboard ก่อน:
-- Authentication > Providers > Email > ปิดสวิตช์ "Confirm email"
-- (เพราะอีเมลที่แอปสร้างให้เป็นอีเมลปลอม ไม่มีจริง ไม่มีทางกดยืนยันได้)
-- ==========================================================

-- 1) เชื่อมแถว houses/admins เข้ากับบัญชี Supabase Auth จริง
alter table houses add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
alter table admins add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- รหัสผ่านเดิมที่เก็บเป็น plain text ไม่ใช้แล้ว (Supabase Auth เก็บรหัสผ่านแบบเข้ารหัส
-- ให้เอง) เลยปลดคอลัมน์นี้จาก "ห้ามว่าง" เพราะโค้ดใหม่จะไม่ใส่ค่าให้อีกต่อไป
alter table houses alter column password drop not null;
alter table admins alter column password drop not null;

-- 2) Helper functions: หาว่า auth.uid() ปัจจุบัน เป็นของหมู่บ้านไหน / มีบทบาทอะไร
--    (security definer = รันข้าม RLS ได้เฉพาะภายในฟังก์ชันนี้ เพื่อเช็คโปรไฟล์ตัวเอง
--     ไม่ใช่ช่องโหว่ เพราะคืนค่าแค่ village_id/role ของ auth.uid() ที่ส่งมาเท่านั้น)
create or replace function public.current_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select role from admins where auth_user_id = auth.uid() limit 1),
    (select 'resident' from houses where auth_user_id = auth.uid() limit 1)
  )
$$;

create or replace function public.current_village_id()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select village_id from admins where auth_user_id = auth.uid() limit 1),
    (select village_id from houses where auth_user_id = auth.uid() limit 1)
  )
$$;

-- 3) RPC สำหรับ "หาอีเมลล็อกอิน" จากเลขบ้าน/ชื่อผู้ใช้ + หมู่บ้าน — ต้องเรียกได้
--    ก่อน login (ยังไม่มี session) จึงต้องเป็น security definer + grant ให้ role "anon"
--    ปลอดภัย เพราะคืนค่าแค่ "อีเมลสำหรับ login" (ผูกกับ id แถวซึ่งไม่ใช่ความลับ)
--    ไม่ได้คืนรหัสผ่าน เบอร์โทร หรือข้อมูลอื่นใดๆ ทั้งสิ้น
create or replace function public.house_login_email(p_village_id text, p_house_no text)
returns text
language sql stable security definer
set search_path = public
as $$
  select h.id || '@resident.internal'
  from houses h
  where h.village_id = p_village_id and h.house_no = p_house_no
  limit 1
$$;

create or replace function public.admin_login_email(p_village_id text, p_username text)
returns text
language sql stable security definer
set search_path = public
as $$
  select a.id || '@staff.internal'
  from admins a
  where a.village_id = p_village_id and a.username = p_username
  limit 1
$$;

grant execute on function public.house_login_email(text, text) to anon, authenticated;
grant execute on function public.admin_login_email(text, text) to anon, authenticated;

-- 4) ลบ policy เดิมที่เปิด public ทั้งหมดทิ้ง (ของเก่าจากตอนยังไม่มี Supabase Auth จริง)
drop policy if exists "public read admins" on admins;
drop policy if exists "public write admins" on admins;
drop policy if exists "public delete admins" on admins;
drop policy if exists "public read houses" on houses;
drop policy if exists "public write houses" on houses;
drop policy if exists "public update houses" on houses;
drop policy if exists "public delete houses" on houses;
drop policy if exists "public read bills" on bills;
drop policy if exists "public write bills" on bills;
drop policy if exists "public update bills" on bills;
drop policy if exists "public read settings" on settings;
drop policy if exists "public update settings" on settings;
drop policy if exists "public write settings" on settings;

-- 5) Policy ใหม่: บังคับด้วย auth.uid() จริง ไม่ใช่แค่ "true" อีกต่อไป

-- villages: อ่านได้แบบ public เสมอ (หน้า login/สมัครต้องเห็น dropdown ก่อนล็อกอิน)
-- insert เปิด public เพราะ "สมัครหมู่บ้านใหม่" เกิดขึ้นตอนยังไม่มี session เลย
-- delete เปิดเฉพาะหมู่บ้านที่ "ยังไม่มีแอดมินเลย" (ใช้ rollback ตอนสมัครแล้วล้มเหลวกลางทาง
-- เท่านั้น ลบหมู่บ้านที่ใช้งานจริงแล้วไม่ได้ เพราะต้องมีแอดมินอย่างน้อย 1 คนเสมอ)
create policy "delete incomplete village during signup" on villages
  for delete using (not exists (select 1 from admins a where a.village_id = villages.id));

-- admins
create policy "select own village admins" on admins
  for select using (village_id = public.current_village_id());

create policy "insert admin (first admin or by existing full admin)" on admins
  for insert with check (
    not exists (select 1 from admins a where a.village_id = admins.village_id)
    or (public.current_role() = 'admin' and public.current_village_id() = admins.village_id)
  );

create policy "delete admin by full admin of same village" on admins
  for delete using (
    public.current_role() = 'admin' and public.current_village_id() = admins.village_id
  );

-- houses
create policy "select houses in own village or own house" on houses
  for select using (
    (public.current_role() in ('admin', 'meter_reader') and village_id = public.current_village_id())
    or auth_user_id = auth.uid()
  );

create policy "insert houses by full admin" on houses
  for insert with check (
    public.current_role() = 'admin' and public.current_village_id() = houses.village_id
  );

create policy "update houses by full admin or by meter reading" on houses
  for update using (
    public.current_role() in ('admin', 'meter_reader') and village_id = public.current_village_id()
  );

create policy "delete houses by full admin" on houses
  for delete using (
    public.current_role() = 'admin' and public.current_village_id() = houses.village_id
  );

-- bills
create policy "select bills in own village or own bills" on bills
  for select using (
    (public.current_role() in ('admin', 'meter_reader') and village_id = public.current_village_id())
    or house_id in (select id from houses where auth_user_id = auth.uid())
  );

create policy "insert bills by admin or meter reader" on bills
  for insert with check (
    public.current_role() in ('admin', 'meter_reader') and public.current_village_id() = bills.village_id
  );

create policy "update bills by staff or own resident (slip upload)" on bills
  for update using (
    (public.current_role() in ('admin', 'meter_reader') and village_id = public.current_village_id())
    or house_id in (select id from houses where auth_user_id = auth.uid())
  );

create policy "delete bills by full admin" on bills
  for delete using (
    public.current_role() = 'admin' and public.current_village_id() = bills.village_id
  );

-- settings
create policy "select own village settings" on settings
  for select using (village_id = public.current_village_id());

create policy "update own village settings by full admin" on settings
  for update using (
    public.current_role() = 'admin' and public.current_village_id() = settings.village_id
  );

create policy "insert own village settings by full admin" on settings
  for insert with check (
    public.current_role() = 'admin' and public.current_village_id() = settings.village_id
  );
