import { getAdminByUsername, getHouseByHouseNo, openDatabase } from './db';

const SESSION_KEY = 'wm_session_v2';

export async function initializeAppData() {
  await openDatabase();
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function loginAdmin(username, password) {
  const found = await getAdminByUsername(username);
  if (!found || found.password !== password) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  return saveSession({ role: 'admin', username: found.username, name: found.name });
}

export async function loginResident(houseNo, password) {
  const found = await getHouseByHouseNo(houseNo);
  if (!found || found.password !== password) {
    throw new Error('เลขบ้านหรือรหัสผ่านไม่ถูกต้อง');
  }
  return saveSession({
    role: 'user',
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
