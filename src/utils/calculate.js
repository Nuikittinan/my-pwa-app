// ตั้งค่าอัตราค่าน้ำ (ปรับเปลี่ยนได้ตามระเบียบหมู่บ้าน)
const WATER_RATE_PER_UNIT = 10; // บาทต่อหน่วย
const BASE_FEE = 20;            // ค่าบำรุงรักษา/ค่าบริการรายเดือน (ถ้ามี)

export function calculateWaterBill(prevMeter, currMeter) {
  const prev = Number(prevMeter) || 0;
  const curr = Number(currMeter) || 0;

  // ตรวจสอบกรณีเลขมิเตอร์ครบรอบร้อย/พัน หรือกรอกผิด
  if (curr < prev) {
    return { error: 'เลขมิเตอร์ปัจจุบันต้องไม่น้อยกว่าเดือนก่อน' };
  }

  const units = curr - prev;
  const waterFee = units * WATER_RATE_PER_UNIT;
  const totalAmount = waterFee + BASE_FEE;

  return {
    unitsUsed: units,
    waterFee: waterFee,
    baseFee: BASE_FEE,
    totalAmount: totalAmount
  };
}