import {
  createVillage,
  getAdminByUsername,
  getHouseByHouseNo,
  getVillageById,
  getVillages,
  openDatabase,
} from './db';

const SESSION_KEY = 'wm_session_v3';

export async function initializeAppData() {
  await openDatabase();
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function listVillages() {
  return getVillages();
}

/** สมัครหมู่บ้านใหม่ แล้ว login เป็นแอดมินคนแรกให้อัตโนมัติ */
export async function signUpVillage({ villageName, adminName, adminUsername, adminPassword }) {
  const village = await createVillage({ villageName, adminName, adminUsername, adminPassword });
  return loginAdmin(village.id, adminUsername, adminPassword);
}

export async function loginAdmin(villageId, username, password) {
  const found = await getAdminByUsername(villageId, username);
  if (!found || found.password !== password) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  const village = await getVillageById(villageId);
  return saveSession({
    role: 'admin',
    adminRole: found.role || 'admin',
    villageId,
    villageName: village?.name || '',
    username: found.username,
    name: found.name,
  });
}

export async function loginResident(villageId, houseNo, password) {
  const found = await getHouseByHouseNo(villageId, houseNo);
  if (!found || found.password !== password) {
    throw new Error('เลขบ้านหรือรหัสผ่านไม่ถูกต้อง');
  }
  const village = await getVillageById(villageId);
  return saveSession({
    role: 'user',
    villageId,
    villageName: village?.name || '',
    id: found.id,
    houseNo: found.houseNo,
    ownerName: found.ownerName,
    phone: found.phone,
  });
}

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
