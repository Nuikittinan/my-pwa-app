-- ==========================================================
-- Multi-tenant migration — รันต่อจาก supabase_schema.sql เดิม
-- ไฟล์นี้ปลอดภัยที่จะรันซ้ำได้ (ใช้ IF NOT EXISTS / ON CONFLICT ทุกจุด)
-- ==========================================================

-- 1) ตารางหมู่บ้าน
create table if not exists villages (
  id text primary key default gen_random_uuid()::text,
  name text unique not null,
  created_at timestamptz default now()
);

-- 2) สร้างหมู่บ้านแรกไว้ให้ข้อมูลเดิมทั้งหมดที่มีอยู่ย้ายเข้ามาอยู่
insert into villages (id, name)
values ('village_default', 'หมู่บ้านของฉัน')
on conflict (id) do nothing;

-- 3) เพิ่มคอลัมน์ village_id ในทุกตาราง (อนุญาต null ชั่วคราวก่อน เพื่อ backfill ได้)
alter table houses   add column if not exists village_id text references villages(id);
alter table bills    add column if not exists village_id text references villages(id);
alter table admins   add column if not exists village_id text references villages(id);
alter table settings add column if not exists village_id text references villages(id);

-- 4) Backfill: ข้อมูลเดิมทั้งหมด (ที่ยังไม่มี village_id) ให้เป็นของหมู่บ้านแรก
update houses   set village_id = 'village_default' where village_id is null;
update bills    set village_id = 'village_default' where village_id is null;
update admins   set village_id = 'village_default' where village_id is null;
update settings set village_id = 'village_default' where village_id is null;

-- 5) บังคับว่าใหม่ทุกแถวต้องมี village_id เสมอ (ตอนนี้ backfill ครบแล้ว)
alter table houses   alter column village_id set not null;
alter table bills    alter column village_id set not null;
alter table admins   alter column village_id set not null;
alter table settings alter column village_id set not null;

-- 6) ปรับ unique constraint: เดิม house_no/username ต้องห้ามซ้ำ "ทั้งระบบ"
--    ตอนนี้ต้องห้ามซ้ำแค่ "ภายในหมู่บ้านเดียวกัน" (คนละหมู่บ้านใช้เลข 99/1 ซ้ำกันได้)
alter table houses drop constraint if exists houses_house_no_key;
alter table houses add constraint houses_village_houseno_unique unique (village_id, house_no);

alter table admins drop constraint if exists admins_username_key;
alter table admins add constraint admins_village_username_unique unique (village_id, username);

-- settings เดิมมี id='billing' แถวเดียวทั้งระบบ ตอนนี้ต้องมี "1 แถวต่อ 1 หมู่บ้าน" แทน
alter table settings drop constraint if exists settings_pkey;
alter table settings add constraint settings_village_unique unique (village_id);

-- bills เดิม unique (house_id, month) ยังใช้ได้เหมือนเดิม เพราะ house_id ก็ผูกกับหมู่บ้านอยู่แล้ว
-- (ไม่ต้องแก้)

-- 7) RLS ของตาราง villages: อ่านได้แบบ public (หน้า login ต้องโหลดรายชื่อหมู่บ้านมาให้เลือกได้
--    ก่อนที่จะรู้ว่าใครคือใคร) แต่ไม่เปิดให้ insert/update/delete จากฝั่ง frontend
alter table villages enable row level security;
create policy "public read villages" on villages for select using (true);

-- ⚠️ หมายเหตุความปลอดภัย: RLS ของ houses/bills/admins/settings ยังเป็น public แบบเดิม
-- (อ่าน/เขียนได้ด้วย anon key) การ "แยกข้อมูลแต่ละหมู่บ้าน" ตอนนี้ทำที่ชั้นแอป (db.js)
-- ด้วยการ filter .eq('village_id', ...) ทุก query เป็นหลัก ไม่ใช่ RLS เพราะระบบ login
-- ยังเป็นแบบเทียบรหัสผ่านเองใน JS ไม่ได้ผูกกับ Supabase Auth จริง จึง RLS แยกสิทธิ์ตาม
-- ผู้ใช้แต่ละคนไม่ได้ ถ้าต้องการความปลอดภัยที่แน่นขึ้น (กันแอดมินหมู่บ้าน A ไม่ให้ยิง API
-- เข้าถึงข้อมูลหมู่บ้าน B ได้โดยตรงแม้จะข้าม UI) ต้องย้ายไปใช้ Supabase Auth จริงในอนาคต
