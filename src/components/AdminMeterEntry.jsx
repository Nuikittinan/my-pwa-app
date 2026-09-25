import { useEffect, useMemo, useState } from 'react';
import {
  fileToDataUrl,
  getAll,
  getBilledHouseIds,
  getBillsByHouseId,
  getSettings,
  saveMeterReading,
  updateSettings,
} from '../utils/db';
import { calculateWaterBill } from '../utils/calculate';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function currentBEYear() {
  return new Date().getFullYear() + 543;
}

// แยกข้อความ "กันยายน 2569" ออกเป็น index เดือน (0-11) กับปี พ.ศ.
function parseMonthLabel(label) {
  if (label) {
    const parts = label.trim().split(/\s+/);
    const year = parseInt(parts[parts.length - 1], 10);
    const monthName = parts.slice(0, -1).join(' ');
    const monthIndex = THAI_MONTHS.indexOf(monthName);
    if (monthIndex !== -1 && !Number.isNaN(year)) {
      return { monthIndex, year };
    }
  }
  return { monthIndex: new Date().getMonth(), year: currentBEYear() };
}

function toLocalDatetimeValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function AdminMeterEntry({ villageId, refreshKey, onSaved }) {
  const [houses, setHouses] = useState([]);
  const [settings, setSettings] = useState(null);
  const [billedHouseIds, setBilledHouseIds] = useState(new Set());
  const [selectedHouseId, setSelectedHouseId] = useState('');
  const [currMeter, setCurrMeter] = useState('');
  const [meterImage, setMeterImage] = useState(null);
  const [recordedAt, setRecordedAt] = useState(() => toLocalDatetimeValue(new Date()));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [houseBills, setHouseBills] = useState([]);
  const [viewingImage, setViewingImage] = useState(null);

  // ตัวเลือกเดือน/ปีของรอบบิล (ย้ายมาจากหน้าตั้งค่าเพื่อความสะดวก)
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [billYear, setBillYear] = useState(currentBEYear());
  const [savingCycle, setSavingCycle] = useState(false);
  const [cycleMessage, setCycleMessage] = useState('');

  const yearOptions = useMemo(() => {
    const base = currentBEYear();
    const years = new Set();
    for (let y = base - 2; y <= base + 2; y += 1) years.add(y);
    years.add(billYear);
    return [...years].sort((a, b) => a - b);
  }, [billYear]);

  const loadHousesAndStatus = async (month) => {
    const [houseList, billed] = await Promise.all([
      getAll(villageId, 'houses'),
      getBilledHouseIds(villageId, month),
    ]);
    const sorted = [...houseList].sort((a, b) => a.houseNo.localeCompare(b.houseNo, 'th'));
    setHouses(sorted);
    setBilledHouseIds(billed);
    return { sorted, billed };
  };

  useEffect(() => {
    getSettings(villageId).then(async (billingSettings) => {
      setSettings(billingSettings);
      const parsed = parseMonthLabel(billingSettings.month);
      setMonthIndex(parsed.monthIndex);
      setBillYear(parsed.year);
      const { sorted, billed } = await loadHousesAndStatus(billingSettings.month);
      // เลือกบ้านแรกที่ยังไม่ได้จดไว้ให้อัตโนมัติ (ถ้ามี) เพื่อลดการคลิกเลือกเอง
      const firstUnbilled = sorted.find((h) => !billed.has(h.id));
      setSelectedHouseId((firstUnbilled || sorted[0])?.id || '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [villageId]);

  // เมื่อมีคนอื่น/เครื่องอื่นแก้ข้อมูล (realtime) -> อัปเดตสถานะ "จดแล้ว/ยังไม่จด" ให้สด
  // โดยตั้งใจไม่แตะ selectedHouseId/currMeter ที่แอดมินกำลังกรอกอยู่ กันข้อมูลที่พิมพ์ค้างหาย
  useEffect(() => {
    if (!settings) return;
    loadHousesAndStatus(settings.month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const cycleChanged = settings
    ? `${THAI_MONTHS[monthIndex]} ${billYear}` !== settings.month
    : false;

  const handleSaveCycle = async () => {
    setSavingCycle(true);
    setCycleMessage('');
    try {
      const newMonth = `${THAI_MONTHS[monthIndex]} ${billYear}`;
      const updated = await updateSettings(villageId, { month: newMonth });
      setSettings(updated);
      setCycleMessage(`เปลี่ยนไปใช้รอบบิล "${updated.month}" แล้ว`);
      const { sorted, billed } = await loadHousesAndStatus(updated.month);
      const firstUnbilled = sorted.find((h) => !billed.has(h.id));
      setSelectedHouseId((firstUnbilled || sorted[0])?.id || '');
      onSaved?.();
    } catch (err) {
      setCycleMessage(err.message || 'เปลี่ยนรอบบิลไม่สำเร็จ');
    } finally {
      setSavingCycle(false);
    }
  };

  const alreadyBilled = selectedHouseId && billedHouseIds.has(selectedHouseId);

  const selectedHouse = houses.find((house) => house.id === selectedHouseId);

  useEffect(() => {
    if (!selectedHouseId) {
      setHouseBills([]);
      return;
    }
    let mounted = true;
    getBillsByHouseId(villageId, selectedHouseId)
      .then((list) => {
        if (mounted) setHouseBills(list);
      })
      .catch(() => {
        if (mounted) setHouseBills([]);
      });
    return () => {
      mounted = false;
    };
  }, [villageId, selectedHouseId]);

  // บิลของรอบก่อนหน้า (ไม่ใช่รอบปัจจุบันที่กำลังจะจด) ใช้เอารูปมิเตอร์มาเทียบให้แอดมินดู
  const previousBill = houseBills.find((b) => b.month !== settings?.month);
  const previousMeterImage = previousBill?.meterImage || selectedHouse?.initialMeterImage || null;
  const previousMeterLabel = previousBill ? previousBill.month : 'รูปตั้งต้น (ตอนลงทะเบียนบ้าน)';

  const estimate = useMemo(() => {
    if (!selectedHouse || !settings) return null;
    const result = calculateWaterBill(selectedHouse.lastMeter, currMeter);
    if (result.error) return result;
    return {
      ...result,
      totalAmount: result.unitsUsed * settings.ratePerUnit + settings.baseFee,
      waterFee: result.unitsUsed * settings.ratePerUnit,
      baseFee: settings.baseFee,
    };
  }, [currMeter, selectedHouse, settings]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) setMeterImage(await fileToDataUrl(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (alreadyBilled) {
      setError(`บ้าน ${selectedHouse?.houseNo} จดมิเตอร์ของรอบนี้ไปแล้ว ไม่สามารถบันทึกซ้ำได้`);
      return;
    }

    setSaving(true);
    try {
      const bill = await saveMeterReading(villageId, {
        houseId: selectedHouseId,
        currMeter,
        meterImage,
        recordedAt,
      });
      setMessage(`บันทึกบิลบ้าน ${bill.house.houseNo} ยอด ${bill.amount.toLocaleString()} บาทแล้ว`);
      setCurrMeter('');
      setMeterImage(null);
      setRecordedAt(toLocalDatetimeValue(new Date()));
      const { sorted, billed } = await loadHousesAndStatus(settings.month);
      const nextUnbilled = sorted.find((h) => h.id !== selectedHouseId && !billed.has(h.id));
      if (nextUnbilled) setSelectedHouseId(nextUnbilled.id);
      onSaved();
    } catch (err) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="panel">กำลังโหลดข้อมูลบ้าน...</div>;

  return (
    <section className="stack">
      <div className="section-heading">
        <div>
          <h1>จดมิเตอร์และสร้างบิล</h1>
          <p>บ้านที่จดแล้วจะขึ้น "✅ จดแล้ว" กำกับไว้ กดบันทึกซ้ำไม่ได้</p>
        </div>
      </div>

      <div className="panel form-grid" style={{ maxWidth: 480 }}>
        <label>
          รอบบิลปัจจุบัน
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={monthIndex}
              onChange={(e) => setMonthIndex(Number(e.target.value))}
              style={{ flex: 2 }}
            >
              {THAI_MONTHS.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={billYear}
              onChange={(e) => setBillYear(Number(e.target.value))}
              style={{ flex: 1 }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </label>

        {cycleChanged && (
          <button type="button" onClick={handleSaveCycle} disabled={savingCycle}>
            {savingCycle ? 'กำลังบันทึก...' : `ใช้รอบบิล "${THAI_MONTHS[monthIndex]} ${billYear}"`}
          </button>
        )}
        {cycleMessage && <div className="notice success">{cycleMessage}</div>}
      </div>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>
          บ้านเลขที่
          <select value={selectedHouseId} onChange={(event) => setSelectedHouseId(event.target.value)}>
            {houses.map((house) => (
              <option key={house.id} value={house.id}>
                {house.houseNo} - {house.ownerName}
                {billedHouseIds.has(house.id) ? ' (✅ จดแล้ว)' : ''}
              </option>
            ))}
          </select>
        </label>

        {selectedHouse && (
          <div className="house-card">
            <strong>{selectedHouse.ownerName}</strong>
            <span>{selectedHouse.phone}</span>
            <span>เลขมิเตอร์ล่าสุด: {selectedHouse.lastMeter}</span>
            <div>
              <p className="muted" style={{ margin: '4px 0 6px 0', fontSize: 13 }}>
                รูปมิเตอร์เดือนก่อน ({previousMeterLabel})
              </p>
              {previousMeterImage ? (
                <button
                  type="button"
                  onClick={() => setViewingImage(previousMeterImage)}
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <img
                    src={previousMeterImage}
                    alt="รูปมิเตอร์เดือนก่อน"
                    style={{ maxWidth: 160, borderRadius: 8 }}
                  />
                </button>
              ) : (
                <span className="muted">ไม่มีรูป</span>
              )}
            </div>
          </div>
        )}

        {alreadyBilled && (
          <div className="notice error">
            บ้าน {selectedHouse?.houseNo} จดมิเตอร์ของรอบ "{settings.month}" ไปแล้ว
            ไม่สามารถบันทึกซ้ำได้ — ถ้าจดผิดต้องแก้ไขผ่าน Supabase โดยตรง
          </div>
        )}

        <label>
          เลขมิเตอร์ปัจจุบัน
          <input
            type="number"
            min={selectedHouse?.lastMeter || 0}
            value={currMeter}
            onChange={(event) => setCurrMeter(event.target.value)}
            disabled={alreadyBilled}
            required
          />
        </label>

        <label>
          วันเวลาที่จดมิเตอร์
          <input
            type="datetime-local"
            value={recordedAt}
            onChange={(event) => setRecordedAt(event.target.value)}
            disabled={alreadyBilled}
            required
          />
        </label>

        <label>
          รูปมิเตอร์
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            disabled={alreadyBilled}
          />
        </label>

        {meterImage && <img className="preview-image" src={meterImage} alt="รูปมิเตอร์ที่เลือก" />}

        <div className="estimate">
          {estimate?.error ? (
            <span className="danger-text">{estimate.error}</span>
          ) : (
            <>
              <span>จำนวนหน่วย: <strong>{estimate?.unitsUsed || 0}</strong></span>
              <span>ค่าน้ำ: <strong>{(estimate?.waterFee || 0).toLocaleString()}</strong> บาท</span>
              <span>ค่าบริการ: <strong>{settings.baseFee.toLocaleString()}</strong> บาท</span>
              <span>รวมชำระ: <strong>{(estimate?.totalAmount || 0).toLocaleString()}</strong> บาท</span>
            </>
          )}
        </div>

        {error && <div className="notice error">{error}</div>}
        {message && <div className="notice success">{message}</div>}

        <button type="submit" disabled={saving || !selectedHouse || alreadyBilled}>
          {alreadyBilled ? 'จดแล้ว บันทึกซ้ำไม่ได้' : saving ? 'กำลังบันทึก...' : 'บันทึกและสร้างบิล'}
        </button>
      </form>

      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div style={{ maxWidth: '92vw', maxHeight: '92vh', textAlign: 'center' }}>
            <img
              src={viewingImage}
              alt="รูปขยาย"
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 10 }}
            />
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              style={{ marginTop: 14, padding: '8px 20px' }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
