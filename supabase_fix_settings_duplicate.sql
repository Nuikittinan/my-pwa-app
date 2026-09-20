-- ==========================================================
-- วินิจฉัย + แก้ปัญหา "Cannot coerce the result to a single JSON object"
-- ตอนบันทึกหน้าตั้งค่า — รันทีละคำสั่งตามลำดับ
-- ==========================================================

-- 1) เช็คว่าหมู่บ้านไหนมีแถว settings ซ้ำกัน (ควรมีหมู่บ้านละ 1 แถวเท่านั้น)
select village_id, count(*) 
from settings 
group by village_id 
having count(*) <> 1;

-- ถ้าคำสั่งที่ 1 ไม่มีผลลัพธ์เลย (0 rows) แปลว่าไม่ใช่ปัญหาซ้ำ/หาย
-- ข้ามไปคำสั่งที่ 4 เพื่อเช็ค unique constraint แทน

-- 2) ถ้าเจอ village_id ที่มี count มากกว่า 1 (ซ้ำกัน) ให้ลบส่วนเกินทิ้ง
--    เหลือไว้แถวเดียว (คำสั่งนี้ปลอดภัย ลบเฉพาะแถวซ้ำส่วนเกิน)
delete from settings a
using settings b
where a.village_id = b.village_id
  and a.ctid < b.ctid;

-- 3) ถ้าคำสั่งที่ 1 แสดง count เป็น 0 สำหรับหมู่บ้านคุณ (คือไม่มีแถวเลย)
--    ให้สร้างแถวใหม่ให้ (แก้ 'village_id_ของคุณ' ให้ตรงก่อนรัน)
insert into settings (village_id, month, rate_per_unit, base_fee, promptpay_no)
values ('village_id_ของคุณ', 'กันยายน 2569', 10, 20, '')
on conflict (village_id) do nothing;

-- 4) ตรวจสอบว่ามี unique constraint บน village_id อยู่จริงไหม (กันปัญหาเกิดซ้ำในอนาคต)
select conname from pg_constraint where conrelid = 'settings'::regclass;
-- ถ้าไม่เห็น "settings_village_unique" ในผลลัพธ์ ให้รันคำสั่งนี้เพิ่ม:
-- alter table settings add constraint settings_village_unique unique (village_id);
