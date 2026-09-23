// ชั้นข้อมูลของแอป — ต่อกับ Supabase (Postgres กลางบนคลาวด์)
// รองรับหลายหมู่บ้าน (multi-tenant): ทุกตารางมีคอลัมน์ village_id
// ทุกฟังก์ชันที่อ่าน/เขียนข้อมูลของหมู่บ้าน จึงรับ villageId เป็นพารามิเตอร์แรกเสมอ
// เพื่อกรองให้เห็น/แก้ไขได้แค่ข้อมูลของหมู่บ้านตัวเอง

import { supabase } from './supabaseClient';

const MONTH_LABEL_FALLBACK = 'กันยายน 2569';

// ---------- ตัวแปลงข้อมูล: Postgres (snake_case) <-> รูปแบบที่แอปใช้ (camelCase) ----------

function toHouse(row) {
  if (!row) return null;
  return {
    id: row.id,
    villageId: row.village_id,
    houseNo: row.house_no,
    ownerName: row.owner_name,
    phone: row.phone,
    password: row.password,
    lastMeter: Number(row.last_meter),
    initialMeterImage: row.initial_meter_image || null,
  };
}

function toAdmin(row) {
  if (!row) return null;
  return {
    id: row.id,
    villageId: row.village_id,
    username: row.username,
    password: row.password,
    name: row.name,
    role: row.role || 'admin',
  };
}

function toBill(row, house) {
  if (!row) return null;
  return {
    id: row.id,
    villageId: row.village_id,
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

function toVillage(row) {
  if (!row) return null;
  return { id: row.id, name: row.name };
}

function throwIfError(error, fallbackMessage) {
  if (error) throw new Error(error.message || fallbackMessage);
}

function requireVillageId(villageId) {
  if (!villageId) throw new Error('ไม่พบหมู่บ้าน (villageId) — กรุณาเข้าสู่ระบบใหม่');
}

// ---------- คงชื่อฟังก์ชันนี้ไว้เพื่อ compatibility ----------
export async function openDatabase() {
  return true;
}

// ---------- Villages (ใช้ตอนหน้า login เลือกหมู่บ้าน — ไม่ผูกกับ village ใด) ----------

export async function getVillages() {
  const { data, error } = await supabase.from('villages').select('*').order('name');
  throwIfError(error, 'โหลดรายชื่อหมู่บ้านไม่สำเร็จ');
  return data.map(toVillage);
}

export async function getVillageById(villageId) {
  const { data, error } = await supabase
    .from('villages')
    .select('*')
    .eq('id', villageId)
    .maybeSingle();
  throwIfError(error, 'โหลดข้อมูลหมู่บ้านไม่สำเร็จ');
  return toVillage(data);
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function currentMonthLabel() {
  const now = new Date();
  return `${THAI_MONTHS[now.getMonth()]} ${now.getFullYear() + 543}`;
}

/**
 * สมัครหมู่บ้านใหม่: สร้าง village + บัญชีแอดมินคนแรก + ค่าตั้งต้นของระบบ (settings)
 * ทำทีละขั้น พร้อม rollback ถ้าขั้นถัดไปล้มเหลว กันหมู่บ้าน "ลอย" ไม่มีแอดมินหรือ settings
 */
export async function createVillage({ villageName, adminName, adminUsername, adminPassword }) {
  const trimmedVillageName = villageName?.trim();
  const trimmedAdminName = adminName?.trim();
  const trimmedUsername = adminUsername?.trim();
  const trimmedPassword = adminPassword?.trim();

  if (!trimmedVillageName) throw new Error('กรุณากรอกชื่อหมู่บ้าน');
  if (!trimmedAdminName) throw new Error('กรุณากรอกชื่อผู้ดูแล');
  if (!trimmedUsername) throw new Error('กรุณากรอกชื่อผู้ใช้สำหรับเข้าสู่ระบบ');
  if (!trimmedPassword || trimmedPassword.length < 4) {
    throw new Error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
  }

  const { data: villageRow, error: villageError } = await supabase
    .from('villages')
    .insert({ name: trimmedVillageName })
    .select()
    .single();
  if (villageError?.code === '23505') throw new Error('มีชื่อหมู่บ้านนี้อยู่แล้ว ลองตั้งชื่ออื่น');
  throwIfError(villageError, 'สร้างหมู่บ้านไม่สำเร็จ');

  const villageId = villageRow.id;

  const { error: adminError } = await supabase.from('admins').insert({
    village_id: villageId,
    username: trimmedUsername,
    password: trimmedPassword,
    name: trimmedAdminName,
  });
  if (adminError) {
    await supabase.from('villages').delete().eq('id', villageId); // rollback
    if (adminError.code === '23505') throw new Error('มีชื่อผู้ใช้นี้อยู่แล้ว ลองตั้งชื่ออื่น');
    throw new Error(adminError.message || 'สร้างบัญชีผู้ดูแลไม่สำเร็จ');
  }

  const { error: settingsError } = await supabase.from('settings').insert({
    village_id: villageId,
    month: currentMonthLabel(),
    rate_per_unit: 10,
    base_fee: 20,
    promptpay_no: '',
  });
  if (settingsError) {
    // rollback ทั้งหมด กันหมู่บ้านที่สร้างไม่สมบูรณ์ค้างอยู่
    await supabase.from('admins').delete().eq('village_id', villageId);
    await supabase.from('villages').delete().eq('id', villageId);
    throw new Error(settingsError.message || 'ตั้งค่าเริ่มต้นของหมู่บ้านไม่สำเร็จ');
  }

  return toVillage(villageRow);
}

// ---------- Settings ----------

export async function getSettings(villageId) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('village_id', villageId)
    .maybeSingle();
  throwIfError(error, 'โหลดการตั้งค่าไม่สำเร็จ');
  return toSettings(data);
}

export async function updateSettings(villageId, { month, ratePerUnit, baseFee, promptpayNo }) {
  requireVillageId(villageId);
  const payload = {};
  if (month !== undefined) payload.month = month.trim();
  if (ratePerUnit !== undefined) payload.rate_per_unit = Number(ratePerUnit) || 0;
  if (baseFee !== undefined) payload.base_fee = Number(baseFee) || 0;
  if (promptpayNo !== undefined) payload.promptpay_no = promptpayNo.trim();

  const { data, error } = await supabase
    .from('settings')
    .update(payload)
    .eq('village_id', villageId)
    .select()
    .single();
  throwIfError(error, 'บันทึกการตั้งค่าไม่สำเร็จ');
  return toSettings(data);
}

// ---------- Generic getAll ----------

export async function getAll(villageId, storeName) {
  requireVillageId(villageId);
  if (storeName === 'houses') {
    const { data, error } = await supabase
      .from('houses')
      .select('*')
      .eq('village_id', villageId)
      .order('house_no');
    throwIfError(error, 'โหลดรายชื่อบ้านไม่สำเร็จ');
    return data.map(toHouse);
  }
  if (storeName === 'bills') {
    const { data, error } = await supabase.from('bills').select('*').eq('village_id', villageId);
    throwIfError(error, 'โหลดบิลไม่สำเร็จ');
    return data.map((r) => toBill(r));
  }
  if (storeName === 'admins') {
    const { data, error } = await supabase.from('admins').select('*').eq('village_id', villageId);
    throwIfError(error, 'โหลดข้อมูลผู้ดูแลไม่สำเร็จ');
    return data.map(toAdmin);
  }
  throw new Error(`Unknown store: ${storeName}`);
}

export async function getHouseById(villageId, id) {
  requireVillageId(villageId);
  if (!id) return null;
  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .eq('village_id', villageId)
    .eq('id', id)
    .maybeSingle();
  throwIfError(error, 'โหลดข้อมูลบ้านไม่สำเร็จ');
  return toHouse(data);
}

export async function addHouse(villageId, { houseNo, ownerName, phone, password, lastMeter, initialMeterImage }) {
  requireVillageId(villageId);
  if (!initialMeterImage) {
    throw new Error('กรุณาแนบรูปมิเตอร์ตั้งต้นของบ้านนี้');
  }
  const payload = {
    village_id: villageId,
    house_no: houseNo.trim(),
    owner_name: ownerName.trim(),
    phone: phone?.trim() || null,
    password: password?.trim() || '1234',
    last_meter: Number(lastMeter) || 0,
    initial_meter_image: initialMeterImage,
  };
  const { data, error } = await supabase.from('houses').insert(payload).select().single();
  if (error?.code === '23505') throw new Error('มีเลขที่บ้านนี้อยู่แล้ว');
  throwIfError(error, 'เพิ่มบ้านไม่สำเร็จ');
  return toHouse(data);
}

export async function updateHouse(villageId, id, { houseNo, ownerName, phone, password, lastMeter, initialMeterImage }) {
  requireVillageId(villageId);
  const payload = {};
  if (houseNo !== undefined) payload.house_no = houseNo.trim();
  if (ownerName !== undefined) payload.owner_name = ownerName.trim();
  if (phone !== undefined) payload.phone = phone?.trim() || null;
  if (password !== undefined && password.trim()) payload.password = password.trim();
  if (lastMeter !== undefined) payload.last_meter = Number(lastMeter) || 0;
  if (initialMeterImage !== undefined) payload.initial_meter_image = initialMeterImage;

  const { data, error } = await supabase
    .from('houses')
    .update(payload)
    .eq('village_id', villageId)
    .eq('id', id)
    .select()
    .single();
  if (error?.code === '23505') throw new Error('มีเลขที่บ้านนี้อยู่แล้ว');
  throwIfError(error, 'แก้ไขข้อมูลบ้านไม่สำเร็จ');
  return toHouse(data);
}

export async function deleteHouse(villageId, id) {
  requireVillageId(villageId);
  // ลบบิลของบ้านนี้ก่อน (กันกรณี on delete cascade ยังไม่ทำงานตามที่คาด)
  await supabase.from('bills').delete().eq('village_id', villageId).eq('house_id', id);
  const { error } = await supabase.from('houses').delete().eq('village_id', villageId).eq('id', id);
  throwIfError(error, 'ลบบ้านไม่สำเร็จ');
}

export async function getHouseByHouseNo(villageId, houseNo) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .eq('village_id', villageId)
    .eq('house_no', houseNo.trim())
    .maybeSingle();
  throwIfError(error, 'โหลดข้อมูลบ้านไม่สำเร็จ');
  return toHouse(data);
}

export async function getAdminByUsername(villageId, username) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('village_id', villageId)
    .eq('username', username.trim())
    .maybeSingle();
  throwIfError(error, 'โหลดข้อมูลผู้ดูแลไม่สำเร็จ');
  return toAdmin(data);
}

export async function getAdmins(villageId) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .eq('village_id', villageId)
    .order('name');
  throwIfError(error, 'โหลดรายชื่อผู้ใช้งานไม่สำเร็จ');
  return data.map(toAdmin);
}

export async function addAdminAccount(villageId, { username, password, name, role }) {
  requireVillageId(villageId);
  const payload = {
    village_id: villageId,
    username: username?.trim(),
    password: password?.trim(),
    name: name?.trim(),
    role: role === 'meter_reader' ? 'meter_reader' : 'admin',
  };
  if (!payload.username) throw new Error('กรุณากรอกชื่อผู้ใช้');
  if (!payload.password || payload.password.length < 4) {
    throw new Error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
  }
  if (!payload.name) throw new Error('กรุณากรอกชื่อที่แสดงในแอป');

  const { data, error } = await supabase.from('admins').insert(payload).select().single();
  if (error?.code === '23505') throw new Error('มีชื่อผู้ใช้นี้อยู่แล้ว ลองตั้งชื่ออื่น');
  throwIfError(error, 'เพิ่มผู้ใช้งานไม่สำเร็จ');
  return toAdmin(data);
}

export async function deleteAdminAccount(villageId, id) {
  requireVillageId(villageId);
  // กันลบแอดมินคนสุดท้าย (role='admin') ของหมู่บ้าน เพราะจะทำให้ไม่มีใคร login เข้าจัดการระบบได้อีก
  const { data: admins, error: listError } = await supabase
    .from('admins')
    .select('id, role')
    .eq('village_id', villageId);
  throwIfError(listError, 'ตรวจสอบรายชื่อผู้ดูแลไม่สำเร็จ');
  const target = admins.find((a) => a.id === id);
  const fullAdminCount = admins.filter((a) => (a.role || 'admin') === 'admin').length;
  if (target && (target.role || 'admin') === 'admin' && fullAdminCount <= 1) {
    throw new Error('ลบไม่ได้ เพราะเป็นบัญชีผู้ดูแลเต็มสิทธิ์คนสุดท้ายของหมู่บ้านนี้');
  }

  const { error } = await supabase.from('admins').delete().eq('village_id', villageId).eq('id', id);
  throwIfError(error, 'ลบผู้ใช้งานไม่สำเร็จ');
}

export async function getBillsByHouseId(villageId, houseId) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('village_id', villageId)
    .eq('house_id', houseId)
    .order('recorded_at', { ascending: false });
  throwIfError(error, 'โหลดบิลของบ้านไม่สำเร็จ');
  return data.map((r) => toBill(r));
}

export async function getBillWithHouse(villageId, billId) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('bills')
    .select('*, houses(*)')
    .eq('village_id', villageId)
    .eq('id', billId)
    .maybeSingle();
  throwIfError(error, 'โหลดบิลไม่สำเร็จ');
  if (!data) return null;
  const { houses: houseRow, ...billRow } = data;
  return toBill(billRow, toHouse(houseRow));
}

export async function getBilledHouseIds(villageId, month) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('bills')
    .select('house_id')
    .eq('village_id', villageId)
    .eq('month', month);
  throwIfError(error, 'ตรวจสอบรายชื่อบ้านที่จดแล้วไม่สำเร็จ');
  return new Set(data.map((r) => r.house_id));
}

export async function getBillForHouseAndMonth(villageId, houseId, month) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('village_id', villageId)
    .eq('house_id', houseId)
    .eq('month', month)
    .maybeSingle();
  throwIfError(error, 'ตรวจสอบบิลเดิมไม่สำเร็จ');
  return toBill(data);
}

export async function saveMeterReading(villageId, { houseId, currMeter, meterImage, recordedAt }) {
  requireVillageId(villageId);
  const house = await getHouseById(villageId, houseId);
  if (!house) throw new Error('ไม่พบบ้านที่เลือก');

  const current = Number(currMeter);
  if (!Number.isFinite(current)) throw new Error('กรุณากรอกเลขมิเตอร์ให้ถูกต้อง');
  if (current < house.lastMeter) throw new Error('เลขมิเตอร์ปัจจุบันต้องไม่น้อยกว่าเดือนก่อน');

  const settings = await getSettings(villageId);
  const units = current - house.lastMeter;
  const waterFee = units * settings.ratePerUnit;
  const amount = waterFee + settings.baseFee;

  // บ้านนี้จดมิเตอร์ของรอบบิลนี้ไปแล้ว -> ห้ามบันทึกซ้ำ
  const existingRow = await getBillForHouseAndMonth(villageId, houseId, settings.month);
  if (existingRow) {
    throw new Error(`บ้าน ${house.houseNo} จดมิเตอร์ของรอบ "${settings.month}" ไปแล้ว ไม่สามารถบันทึกซ้ำได้`);
  }

  const payload = {
    village_id: villageId,
    house_id: houseId,
    month: settings.month,
    prev_meter: house.lastMeter,
    curr_meter: current,
    units,
    water_fee: waterFee,
    base_fee: settings.baseFee,
    amount,
    status: 'unpaid',
    promptpay_no: settings.promptpayNo,
    meter_image: meterImage || null,
    slip_image: null,
    recorded_at: recordedAt ? new Date(recordedAt).toISOString() : new Date().toISOString(),
    paid_at: null,
  };

  const { data: savedBill, error: billError } = await supabase
    .from('bills')
    .insert(payload)
    .select()
    .single();
  if (billError?.code === '23505') {
    throw new Error(`บ้าน ${house.houseNo} จดมิเตอร์ของรอบ "${settings.month}" ไปแล้ว ไม่สามารถบันทึกซ้ำได้`);
  }
  throwIfError(billError, 'บันทึกบิลไม่สำเร็จ');

  const { error: houseError } = await supabase
    .from('houses')
    .update({ last_meter: current })
    .eq('village_id', villageId)
    .eq('id', houseId);
  throwIfError(houseError, 'อัปเดตเลขมิเตอร์ของบ้านไม่สำเร็จ');

  return toBill(savedBill, { ...house, lastMeter: current });
}

/**
 * แก้ไขบิลที่จดผิด — แก้ได้เฉพาะ "บิลล่าสุด" ของบ้านนั้น (เลขมิเตอร์ล่าสุดของบ้าน
 * ตรงกับ currMeter เดิมของบิลนี้) เพื่อกันไม่ให้ลูกโซ่ prevMeter ของบิลเดือนถัดๆ ไปเพี้ยน
 * ถ้ามีบิลเดือนใหม่กว่าเกิดขึ้นแล้ว จะแก้ไขบิลเก่าไม่ได้ (ต้องแก้ผ่าน Supabase เอง)
 */
export async function updateMeterReading(villageId, billId, { currMeter, meterImage, recordedAt }) {
  requireVillageId(villageId);
  const { data: billRow, error: findError } = await supabase
    .from('bills')
    .select('*')
    .eq('village_id', villageId)
    .eq('id', billId)
    .maybeSingle();
  throwIfError(findError, 'โหลดบิลไม่สำเร็จ');
  if (!billRow) throw new Error('ไม่พบบิลนี้');
  if (billRow.status === 'paid') {
    throw new Error('บิลนี้ชำระเงินแล้ว ไม่สามารถแก้ไขได้');
  }
  if (billRow.status === 'pending') {
    throw new Error('บิลนี้มีลูกบ้านแนบสลิปรอตรวจสอบอยู่ ไม่สามารถแก้ไขได้ กรุณาตรวจสลิปก่อน');
  }

  const house = await getHouseById(villageId, billRow.house_id);
  if (!house) throw new Error('ไม่พบบ้านของบิลนี้');

  if (house.lastMeter !== Number(billRow.curr_meter)) {
    throw new Error(
      'แก้ไขบิลนี้ไม่ได้ เพราะมีการจดมิเตอร์รอบถัดไปของบ้านนี้ไปแล้ว (แก้ได้เฉพาะบิลล่าสุดของแต่ละบ้านเท่านั้น)'
    );
  }

  const current = Number(currMeter);
  if (!Number.isFinite(current)) throw new Error('กรุณากรอกเลขมิเตอร์ให้ถูกต้อง');
  if (current < Number(billRow.prev_meter)) {
    throw new Error('เลขมิเตอร์ปัจจุบันต้องไม่น้อยกว่าเลขมิเตอร์เดือนก่อน');
  }

  const settings = await getSettings(villageId);
  const units = current - Number(billRow.prev_meter);
  const waterFee = units * settings.ratePerUnit;
  const amount = waterFee + settings.baseFee;

  const payload = {
    curr_meter: current,
    units,
    water_fee: waterFee,
    base_fee: settings.baseFee,
    amount,
    meter_image: meterImage !== undefined ? meterImage : billRow.meter_image,
    recorded_at: recordedAt ? new Date(recordedAt).toISOString() : billRow.recorded_at,
  };

  const { data: savedBill, error: billError } = await supabase
    .from('bills')
    .update(payload)
    .eq('village_id', villageId)
    .eq('id', billId)
    .select()
    .single();
  throwIfError(billError, 'แก้ไขบิลไม่สำเร็จ');

  // บิลนี้เป็นบิลล่าสุดของบ้าน -> ต้องอัปเดตเลขมิเตอร์ล่าสุดของบ้านให้ตรงกับค่าที่แก้ใหม่ด้วย
  const { error: houseError } = await supabase
    .from('houses')
    .update({ last_meter: current })
    .eq('village_id', villageId)
    .eq('id', house.id);
  throwIfError(houseError, 'อัปเดตเลขมิเตอร์ของบ้านไม่สำเร็จ');

  return toBill(savedBill, { ...house, lastMeter: current });
}

export async function savePaymentSlip(villageId, billId, slipImage) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('bills')
    .update({
      slip_image: slipImage,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .eq('village_id', villageId)
    .eq('id', billId)
    .select()
    .single();
  throwIfError(error, 'บันทึกสลิปไม่สำเร็จ');
  return toBill(data);
}

export async function updateBillStatus(villageId, billId, status) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('bills')
    .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
    .eq('village_id', villageId)
    .eq('id', billId)
    .select()
    .single();
  throwIfError(error, 'อัปเดตสถานะบิลไม่สำเร็จ');
  return toBill(data);
}

export async function getMonthlyUsageSummary(villageId) {
  requireVillageId(villageId);
  const { data, error } = await supabase
    .from('bills')
    .select('month, units, amount, recorded_at')
    .eq('village_id', villageId)
    .order('recorded_at', { ascending: true });
  throwIfError(error, 'โหลดข้อมูลการใช้น้ำรายเดือนไม่สำเร็จ');

  const map = new Map();
  for (const row of data) {
    const entry = map.get(row.month) || {
      totalUnits: 0,
      totalAmount: 0,
      firstRecordedAt: row.recorded_at,
    };
    entry.totalUnits += Number(row.units) || 0;
    entry.totalAmount += Number(row.amount) || 0;
    map.set(row.month, entry);
  }

  return [...map.entries()]
    .map(([month, v]) => ({
      month,
      totalUnits: v.totalUnits,
      totalAmount: v.totalAmount,
      firstRecordedAt: v.firstRecordedAt,
    }))
    .sort((a, b) => new Date(a.firstRecordedAt) - new Date(b.firstRecordedAt));
}

export async function getAvailableMonths(villageId) {
  requireVillageId(villageId);
  const [billsResult, settings] = await Promise.all([
    supabase
      .from('bills')
      .select('month')
      .eq('village_id', villageId)
      .order('recorded_at', { ascending: true }),
    getSettings(villageId),
  ]);
  throwIfError(billsResult.error, 'โหลดรายชื่อรอบบิลไม่สำเร็จ');

  const months = [];
  for (const row of billsResult.data) {
    if (!months.includes(row.month)) months.push(row.month);
  }
  if (!months.includes(settings.month)) months.push(settings.month);
  return months;
}

export async function getDashboardData(villageId, targetMonth) {
  requireVillageId(villageId);
  const [housesResult, billsResult, settings] = await Promise.all([
    supabase.from('houses').select('*').eq('village_id', villageId).order('house_no'),
    supabase.from('bills').select('*').eq('village_id', villageId),
    getSettings(villageId),
  ]);
  throwIfError(housesResult.error, 'โหลดรายชื่อบ้านไม่สำเร็จ');
  throwIfError(billsResult.error, 'โหลดบิลไม่สำเร็จ');

  const month = targetMonth || settings.month;
  const isCurrentMonth = month === settings.month;

  const houses = housesResult.data.map(toHouse);
  const houseMap = new Map(houses.map((h) => [h.id, h]));
  const monthBillRows = billsResult.data.filter((b) => b.month === month);
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
      month,
      isCurrentMonth,
      totalHouses: houses.length,
      recorded: monthBills.length,
      pending: isCurrentMonth ? Math.max(0, houses.length - monthBills.length) : 0,
      totalBilled: monthBills.reduce((sum, b) => sum + b.amount, 0),
      totalPaid: paidBills.reduce((sum, b) => sum + b.amount, 0),
      totalUnpaid: unpaidBills.reduce((sum, b) => sum + b.amount, 0),
      waitingReview: monthBills.filter((b) => b.status === 'pending').length,
    },
  };
}

export async function exportDatabase(villageId) {
  requireVillageId(villageId);
  const [admins, houses, bills, settingsRows] = await Promise.all([
    supabase.from('admins').select('*').eq('village_id', villageId).then((r) => r.data || []),
    supabase.from('houses').select('*').eq('village_id', villageId).then((r) => r.data || []),
    supabase.from('bills').select('*').eq('village_id', villageId).then((r) => r.data || []),
    supabase.from('settings').select('*').eq('village_id', villageId).then((r) => r.data || []),
  ]);
  return { exportedAt: new Date().toISOString(), admins, houses, bills, settings: settingsRows };
}

function normalizeHouseForImport(villageId, h) {
  return {
    id: h.id,
    village_id: villageId,
    house_no: h.house_no ?? h.houseNo,
    owner_name: h.owner_name ?? h.ownerName,
    phone: h.phone ?? null,
    password: h.password || '1234',
    last_meter: h.last_meter ?? h.lastMeter ?? 0,
  };
}

function normalizeBillForImport(villageId, b) {
  return {
    id: b.id,
    village_id: villageId,
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

function normalizeAdminForImport(villageId, a) {
  return { id: a.id, village_id: villageId, username: a.username, password: a.password, name: a.name };
}

function normalizeSettingsForImport(villageId, s) {
  if (s.id && s.id !== 'billing' && s.village_id !== villageId) return null;
  return {
    village_id: villageId,
    month: s.month,
    rate_per_unit: s.rate_per_unit ?? s.ratePerUnit,
    base_fee: s.base_fee ?? s.baseFee,
    promptpay_no: s.promptpay_no ?? s.promptpayNo,
  };
}

export async function importDatabase(villageId, payload) {
  requireVillageId(villageId);
  // นำเข้าทับของเดิม (upsert ตาม id) — ใช้ตอนกู้คืนจากไฟล์สำรองของหมู่บ้านนี้เท่านั้น
  if (payload.houses?.length) {
    const { error } = await supabase
      .from('houses')
      .upsert(payload.houses.map((h) => normalizeHouseForImport(villageId, h)));
    throwIfError(error, 'นำเข้าข้อมูลบ้านไม่สำเร็จ');
  }
  if (payload.admins?.length) {
    const { error } = await supabase
      .from('admins')
      .upsert(payload.admins.map((a) => normalizeAdminForImport(villageId, a)));
    throwIfError(error, 'นำเข้าข้อมูลผู้ดูแลไม่สำเร็จ');
  }
  if (payload.bills?.length) {
    const { error } = await supabase
      .from('bills')
      .upsert(payload.bills.map((b) => normalizeBillForImport(villageId, b)));
    throwIfError(error, 'นำเข้าข้อมูลบิลไม่สำเร็จ');
  }
  if (payload.settings?.length) {
    const rows = payload.settings
      .map((s) => normalizeSettingsForImport(villageId, s))
      .filter(Boolean);
    if (rows.length) {
      const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'village_id' });
      throwIfError(error, 'นำเข้าการตั้งค่าไม่สำเร็จ');
    }
  }
}

/**
 * แปลงไฟล์รูปเป็น base64 data URL พร้อม "ย่อขนาดและบีบอัด" ก่อนเสมอ
 * เหตุผล: รูปจากกล้องมือถือหนัก 2-5 MB/รูป ถ้าเก็บดิบๆ ลง Postgres (เก็บเป็น base64
 * text ในคอลัมน์) จะกิน database quota เร็วมาก (Supabase free tier มีแค่ 500 MB)
 * ฟังก์ชันนี้ย่อรูปให้เหลือด้านยาวสุดไม่เกิน maxDimension แล้วบีบอัดเป็น JPEG
 * คุณภาพ quality (0-1) ลดขนาดไฟล์ลงได้ ~90% โดยยังอ่านตัวเลขมิเตอร์/สลิปได้ชัดเจน
 *
 * ใช้ฟังก์ชันเดียวกันนี้ทุกจุดที่อัปโหลดรูปในแอป (จดมิเตอร์, แก้ไขบิล, รูปตั้งต้นบ้าน,
 * สลิปโอนเงิน) เพราะทุกที่เรียก fileToDataUrl() ชื่อเดิม — ไม่ต้องแก้ไฟล์อื่นเลย
 */
export function fileToDataUrl(file, { maxDimension = 1280, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพนี้ได้'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // ใช้ JPEG เสมอ (ไม่ใช่ PNG) เพราะรูปมิเตอร์/สลิปไม่ต้องการพื้นหลังโปร่งใส
        // และ JPEG ไฟล์เล็กกว่า PNG มากสำหรับภาพถ่ายจริง
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
