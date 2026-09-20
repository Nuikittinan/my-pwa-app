-- ==========================================================
-- แก้ปัญหา: null value in column "id" of relation "settings"
-- รันครั้งเดียวใน Supabase SQL Editor
-- ==========================================================

alter table settings alter column id set default gen_random_uuid()::text;
