-- ==========================================================
-- แก้ปัญหาสมัครหมู่บ้านใหม่ (first-admin bootstrap) แบบครบวงจร
-- รันทั้งไฟล์นี้รวดเดียวใน SQL Editor
-- ==========================================================

-- 1) admins ไม่เคยมี UPDATE policy เลย (ตกหล่นตอนย้ายไป Supabase Auth) —
--    จำเป็นสำหรับตอนผูก auth_user_id ให้พนักงานใหม่ (addAdminAccount)
create policy "update admins by full admin of same village" on admins
  for update using (
    public.current_role() = 'admin' and public.current_village_id() = admins.village_id
  );

-- 2) RPC สำหรับ "ผูก/ลบ แอดมินคนแรกของหมู่บ้านใหม่" ตอนยังไม่มีใคร login เลย
--    (security definer = ข้าม RLS ได้เฉพาะในฟังก์ชันนี้ และมีเงื่อนไข
--    auth_user_id is null กำกับไว้ กันไม่ให้ไปแก้บัญชีที่ผูกกับคนอื่นแล้ว)
create or replace function public.link_admin_auth_user(p_admin_id text, p_auth_user_id uuid)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  updated_count int;
begin
  update admins set auth_user_id = p_auth_user_id
  where id = p_admin_id and auth_user_id is null;
  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.delete_unlinked_admin(p_admin_id text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  delete from admins where id = p_admin_id and auth_user_id is null;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

grant execute on function public.link_admin_auth_user(text, uuid) to anon, authenticated;
grant execute on function public.delete_unlinked_admin(text) to anon, authenticated;

-- 3) แก้ policy ลบ villages ให้ถูกต้องและปลอดภัยขึ้น
--    ของเดิมเช็คด้วย subquery ตรงๆ ซึ่งโดน RLS ของ admins บังตาจนมองไม่เห็นแถวไหน
--    เลยสำหรับผู้ใช้ที่ยังไม่ login (กลายเป็น "ไม่มีแอดมิน" เสมอ = ลบหมู่บ้านไหนก็ได้
--    ทั้งที่มีแอดมินจริง) ต้องใช้ security definer function เช็คแทนให้ข้าม RLS
--    ไปดูข้อมูลจริงแทน
create or replace function public.village_has_admins(p_village_id text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from admins a where a.village_id = p_village_id)
$$;

drop policy if exists "delete incomplete village during signup" on villages;
create policy "delete incomplete village during signup" on villages
  for delete using (not public.village_has_admins(villages.id));

-- 4) คืน policy insert ของ admins กลับเป็นเงื่อนไขที่ถูกต้อง (ไม่ใช่ true เปิดกว้าง
--    ที่ตั้งไว้ตอน debug) — ของเดิมใช้ subquery ตรงๆ เช็ค "มีแอดมินอยู่แล้วหรือยัง"
--    ซึ่งโดน RLS บังตาจนมองไม่เห็นแถวไหนเลยสำหรับผู้ใช้ที่ยังไม่ login (คำตอบเป็น
--    "ไม่มีแอดมิน" เสมอ) เท่ากับใครก็เพิ่มแอดมินปลอมลงหมู่บ้านที่มีอยู่แล้วได้ถ้ารู้
--    village_id — ใช้ฟังก์ชัน village_has_admins() (ข้าม RLS อย่างถูกต้อง) แทน
drop policy if exists "insert admin (first admin or by existing full admin)" on admins;
create policy "insert admin (first admin or by existing full admin)" on admins
  for insert with check (
    not public.village_has_admins(admins.village_id)
    or (public.current_role() = 'admin' and public.current_village_id() = admins.village_id)
  );

notify pgrst, 'reload schema';
