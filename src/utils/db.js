// ชั้นข้อมูลของแอป — เดิมเก็บใน IndexedDB (เครื่องใครเครื่องมัน)
// ตอนนี้ย้ายไปเก็บใน Supabase (Postgres กลางบนคลาวด์) แทน
// เพื่อให้ผู้ดูแลและลูกบ้านเห็นข้อมูลเดียวกันไม่ว่าจะเปิดจากอุปกรณ์ไหน
//
// หมายเหตุสำคัญ: ฟังก์ชันทุกตัวที่ export จากไฟล์นี้ "ชื่อและรูปแบบข้อมูลที่คืนค่า
// เหมือนเดิมทุกอย่าง" กับตอนใช้ IndexedDB ดังนั้น component อื่น (AdminDashboard,
// AdminMeterEntry, UserDashboard, auth.js) ไม่ต้องแก้โค้ดเลย

import { supabase } from './supabaseClient';

const MONTH_LABEL_FALLBACK = 'กันยายน 2569';

// ---------- ตัวแปลงข้อมูล: Postgres (snake_case) <-> รูปแบบที่แอปใช้ (camelCase) ----------

function toHouse(row) {
  if (!row) return null;
  return {
    id: row.id,
    houseNo: row.house_no,
    ownerName: row.owner_name,
    phone: row.phone,
    password: row.password,
    lastMeter: Number(row.last_meter),
  };
}

function toAdmin(row) {
  if (!row) return null;
  return { id: row.id, username: row.username, password: row.password, name: row.name };
}

function toBill(row, house) {
  if (!row) return null;
  return {
    id: row.id,
    houseId: row.house_id,
    month: row.month,
    prevMeter: Number(row.prev_meter),
    currMeter: Number(row.curr_meter),
    units: Number(row.units),
    waterFee: Number(row.water_fee),
    baseFee: Number(row.base_fee),
    amount: Number(row.amount),
    status: row.status,
    promptpayNo: row.promptpay_no,
    meterImage: row.meter_image,
    slipImage: row.slip_image,
    recordedAt: row.recorded_at,
    submittedAt: row.submitted_at,
    paidAt: row.paid_at,
    ...(house ? { house } : {}),
  };
}

function toSettings(row) {
  return {
    month: row?.month || MONTH_LABEL_FALLBACK,
    ratePerUnit: Number(row?.rate_per_unit ?? 10),
    baseFee: Number(row?.base_fee ?? 20),
    promptpayNo: row?.promptpay_no || '',
  };
}

function throwIfError(error, fallbackMessage) {
  if (error) throw new Error(error.message || fallbackMessage);
}

// ---------- คงชื่อฟังก์ชันนี้ไว้เพื่อ compatibility (auth.js เรียกตอนเปิดแอป) ----------
// Supabase ไม่ต้อง "เปิดฐานข้อมูล" เหมือน IndexedDB จึงแค่ resolve เฉยๆ
export async function openDatabase() {
  return true;
}

// ---------- Settings ----------

export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 'billing')
    .maybeSingle();
  throwIfError(error, 'โหลดการตั้งค่าไม่สำเร็จ');
  return toSettings(data);
}

export async function updateSettings({ month, ratePerUnit, baseFee, promptpayNo }) {
  const payload = {};
  if (month !== undefined) payload.month = month.trim();
  if (ratePerUnit !== undefined) payload.rate_per_unit = Number(ratePerUnit) || 0;
  if (baseFee !== undefined) payload.base_fee = Number(baseFee) || 0;
  if (promptpayNo !== undefined) payload.promptpay_no = promptpayNo.trim();

  const { data, error } = await supabase
    .from('settings')
    .update(payload)
    .eq('id', 'billing')
    .select()
    .single();
  throwIfError(error, 'บันทึกการตั้งค่าไม่สำเร็จ');
  return toSettings(data);
}

// ---------- Generic getAll (ตอนนี้ใช้จริงแค่ 'houses' แต่เผื่อไว้ทั้งหมด) ----------

export async function getAll(storeName) {
  if (storeName === 'houses') {
    const { data, error } = await supabase.from('houses').select('*').order('house_no');
    throwIfError(error, 'โหลดรายชื่อบ้านไม่สำเร็จ');
    return data.map(toHouse);
  }
  if (storeName === 'bills') {
    const { data, error } = await supabase.from('bills').select('*');
    throwIfError(error, 'โหลดบิลไม่สำเร็จ');
    return data.map((r) => toBill(r));
  }
  if (storeName === 'admins') {
    const { data, error } = await supabase.from('admins').select('*');
    throwIfError(error, 'โหลดข้อมูลผู้ดูแลไม่สำเร็จ');
    return data.map(toAdmin);
  }
  throw new Error(`Unknown store: ${storeName}`);
}

export async function getHouseById(id) {
  if (!id) return null;
  const { data, error } = await supabase.from('houses').select('*').eq('id', id).maybeSingle();
  throwIfError(error, 'โหลดข้อมูลบ้านไม่สำเร็จ');
  return toHouse(data);
}

export async function addHouse({ houseNo, ownerName, phone, password, lastMeter }) {
  const payload = {
    house_no: houseNo.trim(),
    owner_name: ownerName.trim(),
    phone: phone?.trim() || null,
    password: password?.trim() || '1234',
    last_meter: Number(lastMeter) || 0,
  };
  const { data, error } = await supabase.from('houses').insert(payload).select().single();
  if (error?.code === '23505') throw new Error('มีเลขที่บ้านนี้อยู่แล้ว');
  throwIfError(error, 'เพิ่มบ้านไม่สำเร็จ');
  return toHouse(data);
}

export async function updateHouse(id, { houseNo, ownerName, phone, password, lastMeter }) {
  const payload = {};
  if (houseNo !== undefined) payload.house_no = houseNo.trim();
  if (ownerName !== undefined) payload.owner_name = ownerName.trim();
  if (phone !== undefined) payload.phone = phone?.trim() || null;
  if (password !== undefined && password.trim()) payload.password = password.trim();
  if (lastMeter !== undefined) payload.last_meter = Number(lastMeter) || 0;

  const { data, error } = await supabase.from('houses').update(payload).eq('id', id).select().single();
  if (error?.code === '23505') throw new Error('มีเลขที่บ้านนี้อยู่แล้ว');
  throwIfError(error, 'แก้ไขข้อมูลบ้านไม่สำเร็จ');
  return toHouse(data);
}

export async function deleteHouse(id) {
  // ลบบิลของบ้านนี้ก่อน (กันกรณี on delete cascade ยังไม่ทำงานตามที่คาด)
  await supabase.from('bills').delete().eq('house_id', id);
  const { error } = await supabase.from('houses').delete().eq('id', id);
  throwIfError(error, 'ลบบ้านไม่สำเร็จ');
}

export async function getHouseByHouseNo(houseNo) {
  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .eq('house_no', houseNo.trim())
    .maybeSingle();
  throwIfError(error, 'โหลดข้อมูลบ้านไม่สำเร็จ');
  return toHouse(data);
}

export async function getAdminByUsername(username) {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('username', username.trim())
    .maybeSingle();
  throwIfError(error, 'โหลดข้อมูลผู้ดูแลไม่สำเร็จ');
  return toAdmin(data);
}

export async function getBillsByHouseId(houseId) {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('house_id', houseId)
    .order('recorded_at', { ascending: false });
  throwIfError(error, 'โหลดบิลของบ้านไม่สำเร็จ');
  return data.map((r) => toBill(r));
}

export async function getBillWithHouse(billId) {
  const { data, error } = await supabase
    .from('bills')
    .select('*, houses(*)')
    .eq('id', billId)
    .maybeSingle();
  throwIfError(error, 'โหลดบิลไม่สำเร็จ');
  if (!data) return null;
  const { houses: houseRow, ...billRow } = data;
  return toBill(billRow, toHouse(houseRow));
}

export async function saveMeterReading({ houseId, currMeter, meterImage }) {
  const house = await getHouseById(houseId);
  if (!house) throw new Error('ไม่พบบ้านที่เลือก');

  const current = Number(currMeter);
  if (!Number.isFinite(current)) throw new Error('กรุณากรอกเลขมิเตอร์ให้ถูกต้อง');
  if (current < house.lastMeter) throw new Error('เลขมิเตอร์ปัจจุบันต้องไม่น้อยกว่าเดือนก่อน');

  const settings = await getSettings();
  const units = current - house.lastMeter;
  const waterFee = units * settings.ratePerUnit;
  const amount = waterFee + settings.baseFee;

  // เช็คว่ามีบิลของบ้านนี้ในรอบเดือนนี้อยู่แล้วหรือยัง (จดซ้ำ = แก้ไขของเดิม)
  const { data: existingRow, error: findError } = await supabase
    .from('bills')
    .select('*')
    .eq('house_id', houseId)
    .eq('month', settings.month)
    .maybeSingle();
  throwIfError(findError, 'ตรวจสอบบิลเดิมไม่สำเร็จ');

  const payload = {
    house_id: houseId,
    month: settings.month,
    prev_meter: house.lastMeter,
    curr_meter: current,
    units,
    water_fee: waterFee,
    base_fee: settings.baseFee,
    amount,
    status: existingRow?.status === 'paid' ? 'paid' : 'unpaid',
    promptpay_no: settings.promptpayNo,
    meter_image: meterImage || existingRow?.meter_image || null,
    slip_image: existingRow?.slip_image || null,
    recorded_at: new Date().toISOString(),
    paid_at: existingRow?.paid_at || null,
  };

  const { data: savedBill, error: billError } = existingRow
    ? await supabase.from('bills').update(payload).eq('id', existingRow.id).select().single()
    : await supabase.from('bills').insert(payload).select().single();
  throwIfError(billError, 'บันทึกบิลไม่สำเร็จ');

  const { error: houseError } = await supabase
    .from('houses')
    .update({ last_meter: current })
    .eq('id', houseId);
  throwIfError(houseError, 'อัปเดตเลขมิเตอร์ของบ้านไม่สำเร็จ');

  return toBill(savedBill, { ...house, lastMeter: current });
}

export async function savePaymentSlip(billId, slipImage) {
  const { data, error } = await supabase
    .from('bills')
    .update({
      slip_image: slipImage,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', billId)
    .select()
    .single();
  throwIfError(error, 'บันทึกสลิปไม่สำเร็จ');
  return toBill(data);
}

export async function updateBillStatus(billId, status) {
  const { data, error } = await supabase
    .from('bills')
    .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
    .eq('id', billId)
    .select()
    .single();
  throwIfError(error, 'อัปเดตสถานะบิลไม่สำเร็จ');
  return toBill(data);
}

export async function getDashboardData() {
  const [housesResult, billsResult, settings] = await Promise.all([
    supabase.from('houses').select('*').order('house_no'),
    supabase.from('bills').select('*'),
    getSettings(),
  ]);
  throwIfError(housesResult.error, 'โหลดรายชื่อบ้านไม่สำเร็จ');
  throwIfError(billsResult.error, 'โหลดบิลไม่สำเร็จ');

  const houses = housesResult.data.map(toHouse);
  const houseMap = new Map(houses.map((h) => [h.id, h]));
  const monthBillRows = billsResult.data.filter((b) => b.month === settings.month);
  const monthBills = monthBillRows.map((r) => toBill(r, houseMap.get(r.house_id)));
  const paidBills = monthBills.filter((b) => b.status === 'paid');
  const unpaidBills = monthBills.filter((b) => b.status !== 'paid');
  const billsWithHouses = [...monthBills].sort((a, b) =>
    (a.house?.houseNo || '').localeCompare(b.house?.houseNo || '', 'th')
  );

  return {
    settings,
    houses,
    bills: billsWithHouses,
    summary: {
      month: settings.month,
      totalHouses: houses.length,
      recorded: monthBills.length,
      pending: Math.max(0, houses.length - monthBills.length),
      totalBilled: monthBills.reduce((sum, b) => sum + b.amount, 0),
      totalPaid: paidBills.reduce((sum, b) => sum + b.amount, 0),
      totalUnpaid: unpaidBills.reduce((sum, b) => sum + b.amount, 0),
      waitingReview: monthBills.filter((b) => b.status === 'pending').length,
    },
  };
}

export async function exportDatabase() {
  const [admins, houses, bills, settingsRows] = await Promise.all([
    supabase.from('admins').select('*').then((r) => r.data || []),
    supabase.from('houses').select('*').then((r) => r.data || []),
    supabase.from('bills').select('*').then((r) => r.data || []),
    supabase.from('settings').select('*').then((r) => r.data || []),
  ]);
  return { exportedAt: new Date().toISOString(), admins, houses, bills, settings: settingsRows };
}

// ยอมรับไฟล์ backup ทั้งแบบเก่า (camelCase จาก IndexedDB) และแบบใหม่ (snake_case จาก Supabase)
function normalizeHouseForImport(h) {
  return {
    id: h.id,
    house_no: h.house_no ?? h.houseNo,
    owner_name: h.owner_name ?? h.ownerName,
    phone: h.phone ?? null,
    password: h.password || '1234',
    last_meter: h.last_meter ?? h.lastMeter ?? 0,
  };
}

function normalizeBillForImport(b) {
  return {
    id: b.id,
    house_id: b.house_id ?? b.houseId,
    month: b.month,
    prev_meter: b.prev_meter ?? b.prevMeter,
    curr_meter: b.curr_meter ?? b.currMeter,
    units: b.units,
    water_fee: b.water_fee ?? b.waterFee,
    base_fee: b.base_fee ?? b.baseFee,
    amount: b.amount,
    status: b.status || 'unpaid',
    promptpay_no: b.promptpay_no ?? b.promptpayNo ?? null,
    meter_image: b.meter_image ?? b.meterImage ?? null,
    slip_image: b.slip_image ?? b.slipImage ?? null,
    recorded_at: b.recorded_at ?? b.recordedAt ?? new Date().toISOString(),
    submitted_at: b.submitted_at ?? b.submittedAt ?? null,
    paid_at: b.paid_at ?? b.paidAt ?? null,
  };
}

function normalizeAdminForImport(a) {
  return { id: a.id, username: a.username, password: a.password, name: a.name };
}

function normalizeSettingsForImport(s) {
  if (s.id !== 'billing') return null; // ข้าม row เมทาดาต้าเก่าๆ เช่น {id:'seeded'}
  return {
    id: 'billing',
    month: s.month,
    rate_per_unit: s.rate_per_unit ?? s.ratePerUnit,
    base_fee: s.base_fee ?? s.baseFee,
    promptpay_no: s.promptpay_no ?? s.promptpayNo,
  };
}

export async function importDatabase(payload) {
  // นำเข้าทับของเดิม (upsert ตาม id) — ใช้ตอนกู้คืนจากไฟล์สำรองเท่านั้น
  if (payload.houses?.length) {
    const { error } = await supabase.from('houses').upsert(payload.houses.map(normalizeHouseForImport));
    throwIfError(error, 'นำเข้าข้อมูลบ้านไม่สำเร็จ');
  }
  if (payload.admins?.length) {
    const { error } = await supabase.from('admins').upsert(payload.admins.map(normalizeAdminForImport));
    throwIfError(error, 'นำเข้าข้อมูลผู้ดูแลไม่สำเร็จ');
  }
  if (payload.bills?.length) {
    const { error } = await supabase.from('bills').upsert(payload.bills.map(normalizeBillForImport));
    throwIfError(error, 'นำเข้าข้อมูลบิลไม่สำเร็จ');
  }
  if (payload.settings?.length) {
    const rows = payload.settings.map(normalizeSettingsForImport).filter(Boolean);
    if (rows.length) {
      const { error } = await supabase.from('settings').upsert(rows);
      throwIfError(error, 'นำเข้าการตั้งค่าไม่สำเร็จ');
    }
  }
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
