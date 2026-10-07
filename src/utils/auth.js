// ระบบ login — ใช้ Supabase Auth จริง (ไม่ใช่การเทียบรหัสผ่านเองใน JS แบบเดิมแล้ว)
// รหัสผ่านทุกบัญชีเก็บแบบเข้ารหัสในระบบของ Supabase เอง และ RLS ฝั่ง database
// บังคับแยกข้อมูลแต่ละหมู่บ้านจริง (ดู supabase_migrate_to_real_auth.sql)
//
// เพราะ Supabase Auth ต้องการ "อีเมล" เสมอ แต่ผู้ใช้จริงมีแค่ username/เลขบ้าน
// แอปจึงคำนวณอีเมลแบบกำหนดแน่นอน (deterministic) จาก id ของแถวนั้นๆ เช่น
// "<adminId>@staff.internal" — ไม่ใช่อีเมลจริง ส่งไม่ได้ ใช้แค่เป็น "ชื่อบัญชี" เท่านั้น
// การ "หาอีเมลจาก username/เลขบ้าน" ทำผ่าน RPC ของ Postgres (house_login_email /
// admin_login_email) เพราะต้องเรียกได้ตั้งแต่ก่อน login (RLS ปกติปิดตารางไว้หมดแล้ว)

import { supabase } from './supabaseClient';
import {
  createVillage,
  getAdminByUsername,
  getHouseByHouseNo,
  getMyAdminProfile,
  getMyHouseProfile,
  getVillageById,
  getVillages,
} from './db';

// คงชื่อฟังก์ชันนี้ไว้เพื่อ compatibility (App.jsx เรียกตอนเปิดแอป) — ไม่ต้องทำอะไรแล้ว
// เพราะ Supabase client จัดการ session ของตัวเองอัตโนมัติอยู่แล้ว
export async function initializeAppData() {
  return true;
}

export async function listVillages() {
  return getVillages();
}

async function buildAdminSession(villageId, adminProfile) {
  const village = await getVillageById(villageId);
  return {
    role: 'admin',
    adminRole: adminProfile.role || 'admin',
    villageId,
    villageName: village?.name || '',
    username: adminProfile.username,
    name: adminProfile.name,
  };
}

async function buildResidentSession(villageId, houseProfile) {
  const village = await getVillageById(villageId);
  return {
    role: 'user',
    villageId,
    villageName: village?.name || '',
    id: houseProfile.id,
    houseNo: houseProfile.houseNo,
    ownerName: houseProfile.ownerName,
    phone: houseProfile.phone,
  };
}

/** สมัครหมู่บ้านใหม่ แล้ว login เป็นแอดมินคนแรกให้อัตโนมัติ (signUp ฝั่ง db.js auto-login ให้แล้ว) */
export async function signUpVillage({ villageName, adminName, adminUsername, adminPassword }) {
  const village = await createVillage({ villageName, adminName, adminUsername, adminPassword });
  const adminProfile = await getAdminByUsername(village.id, adminUsername);
  if (!adminProfile) throw new Error('สมัครสำเร็จ แต่โหลดโปรไฟล์ไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');
  return buildAdminSession(village.id, adminProfile);
}

export async function loginAdmin(villageId, username, password) {
  const trimmedUsername = username.trim();
  const { data: email, error: rpcError } = await supabase.rpc('admin_login_email', {
    p_village_id: villageId,
    p_username: trimmedUsername,
  });
  if (rpcError || !email) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

  const adminProfile = await getAdminByUsername(villageId, trimmedUsername);
  if (!adminProfile) {
    await supabase.auth.signOut();
    throw new Error('ไม่พบบัญชีผู้ใช้นี้ในหมู่บ้านที่เลือก');
  }
  return buildAdminSession(villageId, adminProfile);
}

export async function loginResident(villageId, houseNo, password) {
  const trimmedHouseNo = houseNo.trim();
  const { data: email, error: rpcError } = await supabase.rpc('house_login_email', {
    p_village_id: villageId,
    p_house_no: trimmedHouseNo,
  });
  if (rpcError || !email) throw new Error('เลขบ้านหรือรหัสผ่านไม่ถูกต้อง');

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error('เลขบ้านหรือรหัสผ่านไม่ถูกต้อง');

  const houseProfile = await getHouseByHouseNo(villageId, trimmedHouseNo);
  if (!houseProfile) {
    await supabase.auth.signOut();
    throw new Error('ไม่พบบ้านนี้ในหมู่บ้านที่เลือก');
  }
  return buildResidentSession(villageId, houseProfile);
}

/** อ่าน session ปัจจุบัน (คืนค่า null ถ้ายังไม่ได้ login) — เช็คจาก Supabase Auth จริง
 *  แล้วหาโปรไฟล์ (แอดมิน/บ้าน) ที่ผูกกับบัญชีนั้น เพื่อสร้างออบเจกต์ session ของแอป */
export async function getSession() {
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  if (!authSession) return null;

  const adminProfile = await getMyAdminProfile();
  if (adminProfile) return buildAdminSession(adminProfile.villageId, adminProfile);

  const houseProfile = await getMyHouseProfile();
  if (houseProfile) return buildResidentSession(houseProfile.villageId, houseProfile);

  // login ผ่าน Supabase Auth สำเร็จ แต่หาโปรไฟล์ไม่เจอ (ข้อมูลไม่สมบูรณ์) -> ถือว่ายังไม่ login
  return null;
}

/** ออกจากระบบ */
export async function logout() {
  await supabase.auth.signOut();
}
