const DB_NAME = 'village_water_pwa';
const DB_VERSION = 1;
const MONTH_LABEL = 'กันยายน 2569';
const PROMPTPAY_NO = '0812345678';

const seedHouses = [
  {
    id: 'house-991',
    houseNo: '99/1',
    ownerName: 'สมชาย ใจดี',
    phone: '081-234-5678',
    password: '1234',
    lastMeter: 120,
  },
  {
    id: 'house-992',
    houseNo: '99/2',
    ownerName: 'สมหญิง รักดี',
    phone: '089-876-5432',
    password: '1234',
    lastMeter: 95,
  },
  {
    id: 'house-993',
    houseNo: '99/3',
    ownerName: 'ธนา อยู่สุข',
    phone: '086-111-2233',
    password: '1234',
    lastMeter: 174,
  },
  {
    id: 'house-994',
    houseNo: '842/5',
    ownerName: 'กิตตินันท์ อ้นสันเทียะ',
    phone: '061-030-4695',
    password: '1234',
    lastMeter: 100,
  },
];

const seedAdmins = [
  {
    id: 'admin-1',
    username: 'admin',
    password: 'admin123',
    name: 'ผู้ดูแลระบบ',
  },
];

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('admins')) {
        db.createObjectStore('admins', { keyPath: 'id' }).createIndex('username', 'username', {
          unique: true,
        });
      }

      if (!db.objectStoreNames.contains('houses')) {
        const store = db.createObjectStore('houses', { keyPath: 'id' });
        store.createIndex('houseNo', 'houseNo', { unique: true });
      }

      if (!db.objectStoreNames.contains('bills')) {
        const store = db.createObjectStore('bills', { keyPath: 'id' });
        store.createIndex('houseId', 'houseId', { unique: false });
        store.createIndex('month', 'month', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      try {
        await seedDatabase(db);
        resolve(db);
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function seedDatabase(db) {
  const readTx = db.transaction('settings', 'readonly');
  const seeded = await requestToPromise(readTx.objectStore('settings').get('seeded'));

  if (!seeded) {
    const tx = db.transaction(['admins', 'houses', 'settings'], 'readwrite');
    const settings = tx.objectStore('settings');
    const admins = tx.objectStore('admins');
    const houses = tx.objectStore('houses');
    seedAdmins.forEach((admin) => admins.put(admin));
    seedHouses.forEach((house) => houses.put(house));
    settings.put({
      id: 'seeded',
      value: true,
      seededAt: new Date().toISOString(),
    });
    settings.put({
      id: 'billing',
      month: MONTH_LABEL,
      ratePerUnit: 10,
      baseFee: 20,
      promptpayNo: PROMPTPAY_NO,
    });
    await transactionDone(tx);
  }
}

export async function getSettings() {
  const db = await openDatabase();
  const tx = db.transaction('settings', 'readonly');
  const settings = await requestToPromise(tx.objectStore('settings').get('billing'));
  return {
    month: settings?.month || MONTH_LABEL,
    ratePerUnit: settings?.ratePerUnit || 10,
    baseFee: settings?.baseFee || 20,
    promptpayNo: settings?.promptpayNo || PROMPTPAY_NO,
  };
}

export async function getAll(storeName) {
  const db = await openDatabase();
  return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
}

export async function getHouseById(id) {
  const db = await openDatabase();
  return requestToPromise(db.transaction('houses', 'readonly').objectStore('houses').get(id));
}

export async function getHouseByHouseNo(houseNo) {
  const db = await openDatabase();
  const index = db.transaction('houses', 'readonly').objectStore('houses').index('houseNo');
  return requestToPromise(index.get(houseNo.trim()));
}

export async function getAdminByUsername(username) {
  const db = await openDatabase();
  const index = db.transaction('admins', 'readonly').objectStore('admins').index('username');
  return requestToPromise(index.get(username.trim()));
}

export async function getBillsByHouseId(houseId) {
  const db = await openDatabase();
  const index = db.transaction('bills', 'readonly').objectStore('bills').index('houseId');
  return requestToPromise(index.getAll(houseId));
}

export async function getBillWithHouse(billId) {
  const db = await openDatabase();
  const tx = db.transaction(['bills', 'houses'], 'readonly');
  const bill = await requestToPromise(tx.objectStore('bills').get(billId));
  if (!bill) return null;
  const house = await requestToPromise(tx.objectStore('houses').get(bill.houseId));
  return { ...bill, house };
}

export async function saveMeterReading({ houseId, currMeter, meterImage }) {
  const db = await openDatabase();
  const settings = await getSettings();
  const readTx = db.transaction(['houses', 'bills'], 'readonly');
  const houseRequest = readTx.objectStore('houses').get(houseId);
  const existingBillsRequest = readTx.objectStore('bills').index('houseId').getAll(houseId);
  const house = await requestToPromise(houseRequest);

  if (!house) throw new Error('ไม่พบบ้านที่เลือก');
  const current = Number(currMeter);
  if (!Number.isFinite(current)) throw new Error('กรุณากรอกเลขมิเตอร์ให้ถูกต้อง');
  if (current < house.lastMeter) throw new Error('เลขมิเตอร์ปัจจุบันต้องไม่น้อยกว่าเดือนก่อน');

  const units = current - house.lastMeter;
  const waterFee = units * settings.ratePerUnit;
  const amount = waterFee + settings.baseFee;
  const now = new Date().toISOString();
  const existingBills = await requestToPromise(existingBillsRequest);
  const currentMonthBill = existingBills.find((bill) => bill.month === settings.month);

  const bill = {
    id: currentMonthBill?.id || makeId('bill'),
    houseId: house.id,
    month: settings.month,
    prevMeter: house.lastMeter,
    currMeter: current,
    units,
    waterFee,
    baseFee: settings.baseFee,
    amount,
    status: currentMonthBill?.status === 'paid' ? 'paid' : 'unpaid',
    promptpayNo: settings.promptpayNo,
    meterImage: meterImage || currentMonthBill?.meterImage || null,
    slipImage: currentMonthBill?.slipImage || null,
    recordedAt: now,
    paidAt: currentMonthBill?.paidAt || null,
  };

  const writeTx = db.transaction(['houses', 'bills'], 'readwrite');
  writeTx.objectStore('bills').put(bill);
  writeTx.objectStore('houses').put({ ...house, lastMeter: current });
  await transactionDone(writeTx);
  return { ...bill, house: { ...house, lastMeter: current } };
}

export async function savePaymentSlip(billId, slipImage) {
  const db = await openDatabase();
  const bill = await requestToPromise(db.transaction('bills', 'readonly').objectStore('bills').get(billId));
  if (!bill) throw new Error('ไม่พบบิล');

  const updated = {
    ...bill,
    slipImage,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  const writeTx = db.transaction('bills', 'readwrite');
  writeTx.objectStore('bills').put(updated);
  await transactionDone(writeTx);
  return updated;
}

export async function updateBillStatus(billId, status) {
  const db = await openDatabase();
  const bill = await requestToPromise(db.transaction('bills', 'readonly').objectStore('bills').get(billId));
  if (!bill) throw new Error('ไม่พบบิล');

  const updated = {
    ...bill,
    status,
    paidAt: status === 'paid' ? new Date().toISOString() : null,
  };
  const writeTx = db.transaction('bills', 'readwrite');
  writeTx.objectStore('bills').put(updated);
  await transactionDone(writeTx);
  return updated;
}

export async function getDashboardData() {
  const [houses, bills, settings] = await Promise.all([
    getAll('houses'),
    getAll('bills'),
    getSettings(),
  ]);
  const monthBills = bills.filter((bill) => bill.month === settings.month);
  const paidBills = monthBills.filter((bill) => bill.status === 'paid');
  const unpaidBills = monthBills.filter((bill) => bill.status !== 'paid');
  const billsWithHouses = monthBills
    .map((bill) => ({ ...bill, house: houses.find((house) => house.id === bill.houseId) }))
    .sort((a, b) => (a.house?.houseNo || '').localeCompare(b.house?.houseNo || '', 'th'));

  return {
    settings,
    houses,
    bills: billsWithHouses,
    summary: {
      month: settings.month,
      totalHouses: houses.length,
      recorded: monthBills.length,
      pending: Math.max(0, houses.length - monthBills.length),
      totalBilled: monthBills.reduce((sum, bill) => sum + bill.amount, 0),
      totalPaid: paidBills.reduce((sum, bill) => sum + bill.amount, 0),
      totalUnpaid: unpaidBills.reduce((sum, bill) => sum + bill.amount, 0),
      waitingReview: monthBills.filter((bill) => bill.status === 'pending').length,
    },
  };
}

export async function exportDatabase() {
  const [admins, houses, bills, settings] = await Promise.all([
    getAll('admins'),
    getAll('houses'),
    getAll('bills'),
    getAll('settings'),
  ]);
  return { exportedAt: new Date().toISOString(), admins, houses, bills, settings };
}

export async function importDatabase(payload) {
  const db = await openDatabase();
  const tx = db.transaction(['admins', 'houses', 'bills', 'settings'], 'readwrite');
  ['admins', 'houses', 'bills', 'settings'].forEach((storeName) => tx.objectStore(storeName).clear());
  payload.admins?.forEach((item) => tx.objectStore('admins').put(item));
  payload.houses?.forEach((item) => tx.objectStore('houses').put(item));
  payload.bills?.forEach((item) => tx.objectStore('bills').put(item));
  payload.settings?.forEach((item) => tx.objectStore('settings').put(item));
  await transactionDone(tx);
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
