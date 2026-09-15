-- ==========================================================
-- รันไฟล์นี้ทั้งหมดใน Supabase Dashboard > SQL Editor > New query
-- ==========================================================

create extension if not exists "pgcrypto";

-- ใช้ id แบบ text (ไม่ใช่ uuid ล้วน) เพื่อให้ import ข้อมูลเก่าจาก IndexedDB
-- (ที่มี id แบบ "house-991", "bill-..." ) เข้ามาได้โดยไม่ error เรื่อง type
create table if not exists admins (
  id text primary key default gen_random_uuid()::text,
  username text unique not null,
  password text not null,
  name text not null
);

create table if not exists houses (
  id text primary key default gen_random_uuid()::text,
  house_no text unique not null,
  owner_name text not null,
  phone text,
  password text not null default '1234',
  last_meter numeric not null default 0
);

create table if not exists bills (
  id text primary key default gen_random_uuid()::text,
  house_id text references houses(id) on delete cascade,
  month text not null,
  prev_meter numeric not null,
  curr_meter numeric not null,
  units numeric not null,
  water_fee numeric not null,
  base_fee numeric not null,
  amount numeric not null,
  status text not null default 'unpaid',
  promptpay_no text,
  meter_image text,
  slip_image text,
  recorded_at timestamptz default now(),
  submitted_at timestamptz,
  paid_at timestamptz,
  unique (house_id, month)
);

create table if not exists settings (
  id text primary key,
  month text,
  rate_per_unit numeric,
  base_fee numeric,
  promptpay_no text
);

-- ---------- ข้อมูลตั้งต้น ----------
insert into settings (id, month, rate_per_unit, base_fee, promptpay_no)
values ('billing', 'กันยายน 2569', 10, 20, '0812345678')
on conflict (id) do nothing;

insert into admins (username, password, name)
values ('admin', 'admin123', 'ผู้ดูแลระบบ')
on conflict (username) do nothing;

insert into houses (house_no, owner_name, phone, password, last_meter) values
  ('99/1', 'สมชาย ใจดี', '081-234-5678', '1234', 120),
  ('99/2', 'สมหญิง รักดี', '089-876-5432', '1234', 95)
on conflict (house_no) do nothing;

-- ---------- Row Level Security ----------
alter table admins   enable row level security;
alter table houses   enable row level security;
alter table bills    enable row level security;
alter table settings enable row level security;

-- ⚠️ นโยบายด้านล่างเปิดให้ "anon key" (คีย์สาธารณะที่ฝังอยู่ในแอปที่ deploy)
-- อ่าน/เขียนได้ทุกตาราง เพราะแอปนี้ยังใช้ระบบ login ของตัวเอง (เทียบรหัสผ่าน
-- ใน JS) ไม่ได้ผูกกับ Supabase Auth จริงๆ ผลคือใครก็ตามที่มี anon key (ดูได้จาก
-- source ของเว็บที่ deploy แล้ว) สามารถยิง API เข้าตารางเหล่านี้ตรงๆ โดยข้าม
-- หน้า login ได้ เหมาะกับแอปภายในหมู่บ้านที่ข้อมูลไม่อ่อนไหวมาก แต่ถ้าต้องการ
-- ความปลอดภัยที่แน่นขึ้น ควรย้ายไปใช้ Supabase Auth จริง (ดูคำแนะนำท้ายแชท)
create policy "public read admins" on admins for select using (true);

create policy "public read houses"   on houses for select using (true);
create policy "public write houses"  on houses for insert with check (true);
create policy "public update houses" on houses for update using (true);
create policy "public delete houses" on houses for delete using (true);

create policy "public read bills"   on bills for select using (true);
create policy "public write bills"  on bills for insert with check (true);
create policy "public update bills" on bills for update using (true);

create policy "public read settings"   on settings for select using (true);
create policy "public update settings" on settings for update using (true);
