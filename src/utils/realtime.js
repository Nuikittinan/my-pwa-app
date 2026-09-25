import { supabase } from './supabaseClient';

/**
 * ฟังการเปลี่ยนแปลงข้อมูล (houses, bills, settings) ของหมู่บ้านนี้แบบเรียลไทม์
 * ผ่าน Supabase Realtime (websocket) — เมื่อมีใคร (อุปกรณ์ไหนก็ตาม) แก้ข้อมูล
 * จะเรียก onChange() ให้ฝั่งเรา refetch ข้อมูลใหม่ทันที ไม่ต้องกดรีเฟรชเอง
 *
 * ใช้ debounce เล็กน้อย (400ms) เพราะบางการกระทำ (เช่น บันทึกบิล) แก้หลายตาราง
 * พร้อมกัน (bills + houses) จะได้ไม่ยิง refetch ซ้ำๆ รัวๆ โดยไม่จำเป็น
 *
 * คืนค่าเป็นฟังก์ชัน cleanup — ต้องเรียกตอน unmount หรือ villageId เปลี่ยน
 */
export function subscribeToVillageChanges(villageId, onChange) {
  if (!villageId) return () => {};

  let timeoutId = null;
  const debouncedOnChange = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(onChange, 400);
  };

  const channel = supabase
    .channel(`village-changes-${villageId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'houses', filter: `village_id=eq.${villageId}` },
      debouncedOnChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bills', filter: `village_id=eq.${villageId}` },
      debouncedOnChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settings', filter: `village_id=eq.${villageId}` },
      debouncedOnChange
    )
    .subscribe();

  return () => {
    clearTimeout(timeoutId);
    supabase.removeChannel(channel);
  };
}
