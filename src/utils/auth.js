// ระบบ Auth แบบง่าย เก็บข้อมูลไว้ใน localStorage
// หมายเหตุ: นี่คือ auth ระดับ demo/frontend-only เหมาะสำหรับทดสอบและต้นแบบ
// สำหรับ production จริงควรย้าย logic การตรวจสอบรหัสผ่านไปทำที่ backend
// (เช่น Firebase Auth / Supabase / API ของตัวเอง) และไม่เก็บรหัสผ่านแบบ plain text

const USERS_KEY = 'wm_users_v1';
const SESSION_KEY = 'wm_session_v1';

// ข้อมูลตั้งต้น (เดโม) — จะถูกสร้างลง localStorage ครั้งแรกที่เปิดแอป
const seedData = {
  admins: [
    { username: 'admin', password: 'admin123', name: 'ผู้ดูแลระบบ' },
  ],
  houses: [
    {
      id: '1',
      houseNo: '99/1',
      ownerName: 'สมชาย ใจดี',
      phone: '081-234-5678',
      password: '1234',
      prevMeter: 120,
    },
    {
      id: '2',
      houseNo: '99/2',
      ownerName: 'สมหญิง รักดี',
      phone: '089-876-5432',
      password: '1234',
      prevMeter: 95,
    },
  ],
};

function getUsersDB() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    localStorage.setItem(USERS_KEY, JSON.stringify(seedData));
    return seedData;
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(USERS_KEY, JSON.stringify(seedData));
    return seedData;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** เข้าสู่ระบบฝั่งผู้ดูแล (กรรมการ) */
export function loginAdmin(username, password) {
  const db = getUsersDB();
  const found = db.admins.find(
    (a) => a.username === username.trim() && a.password === password
  );
  if (!found) {
    throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  return saveSession({ role: 'admin', username: found.username, name: found.name });
}

/** เข้าสู่ระบบฝั่งลูกบ้าน ด้วยเลขบ้าน + รหัสผ่าน */
export function loginResident(houseNo, password) {
  const db = getUsersDB();
  const found = db.houses.find(
    (h) => h.houseNo === houseNo.trim() && h.password === password
  );
  if (!found) {
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

/** อ่าน session ปัจจุบัน (คืนค่า null ถ้ายังไม่ได้ login) */
export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** ออกจากระบบ */
export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

/** ดึงข้อมูลบ้านตาม id (ใช้ต่อยอดหน้า UserDashboard ได้) */
export function getHouseById(id) {
  const db = getUsersDB();
  return db.houses.find((h) => h.id === id) || null;
}
