-- ==========================================================
-- เปิด Realtime ให้ตาราง houses, bills, settings
-- เพื่อให้ทุกอุปกรณ์ที่เปิดแอปอยู่ เห็นการเปลี่ยนแปลงข้อมูลแบบสดๆ
-- โดยไม่ต้องกดรีเฟรชเอง (เช่น แอดมิน 2 คนคนละเครื่อง หรือลูกบ้านที่เปิดแอปค้างไว้)
-- รันครั้งเดียวใน Supabase SQL Editor
-- ==========================================================

alter publication supabase_realtime add table houses;
alter publication supabase_realtime add table bills;
alter publication supabase_realtime add table settings;

-- หมายเหตุ: ถ้ารันแล้วขึ้น error ว่าตารางนี้อยู่ใน publication อยู่แล้ว (already member)
-- แปลว่าเปิดไว้แล้ว ข้ามได้เลยไม่ต้องแก้อะไร
