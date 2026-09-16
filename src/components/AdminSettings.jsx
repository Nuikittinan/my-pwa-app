import { useEffect, useMemo, useState } from 'react';
import { getSettings, updateSettings } from '../utils/db';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function currentBEYear() {
  return new Date().getFullYear() + 543;
}

// แยกข้อความ "กันยายน 2569" ออกเป็น index เดือน (0-11) กับปี พ.ศ.
// ถ้ารูปแบบไม่ตรง (เช่น พิมพ์เองมาก่อนหน้านี้) จะ fallback เป็นเดือน/ปีปัจจุบัน
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

export default function AdminSettings({ onDataChange }) {
  const [form, setForm] = useState(null);
  const [monthIndex, setMonthIndex] = useState(0);
  const [billYear, setBillYear] = useState(currentBEYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    getSettings()
      .then((s) => {
        setForm(s);
        const parsed = parseMonthLabel(s.month);
        setMonthIndex(parsed.monthIndex);
        setBillYear(parsed.year);
      })
      .catch((err) => setError(err.message || 'โหลดการตั้งค่าไม่สำเร็จ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // ปีให้เลือก: ย้อนหลัง 2 ปี ถึงล่วงหน้า 2 ปีจากปีปัจจุบัน (รวมปีที่ตั้งไว้เดิมเผื่ออยู่นอกช่วง)
  const yearOptions = useMemo(() => {
    const base = currentBEYear();
    const years = new Set();
    for (let y = base - 2; y <= base + 2; y += 1) years.add(y);
    years.add(billYear);
    return [...years].sort((a, b) => a - b);
  }, [billYear]);

  const handleChange = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleMonthIndexChange = (event) => {
    const value = Number(event.target.value);
    setMonthIndex(value);
    setForm((prev) => ({ ...prev, month: `${THAI_MONTHS[value]} ${billYear}` }));
  };

  const handleYearChange = (event) => {
    const value = Number(event.target.value);
    setBillYear(value);
    setForm((prev) => ({ ...prev, month: `${THAI_MONTHS[monthIndex]} ${value}` }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const updated = await updateSettings(form);
      setForm(updated);
      const parsed = parseMonthLabel(updated.month);
      setMonthIndex(parsed.monthIndex);
      setBillYear(parsed.year);
      setMessage('บันทึกการตั้งค่าเรียบร้อยแล้ว');
      onDataChange?.();
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="panel">กำลังโหลดการตั้งค่า...</div>;
  if (!form) return <div className="panel danger">{error}</div>;

  return (
    <section className="stack">
      <div className="section-heading">
        <div>
          <h1>ตั้งค่าระบบ</h1>
          <p>กำหนดเลขพร้อมเพย์จริง อัตราค่าน้ำ และรอบบิลปัจจุบัน</p>
        </div>
      </div>

      <form className="panel form-grid" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <label>
          เลขพร้อมเพย์สำหรับรับเงิน (เบอร์โทร หรือ เลขบัตรประชาชน)
          <input
            value={form.promptpayNo}
            onChange={handleChange('promptpayNo')}
            placeholder="เช่น 0812345678"
            required
          />
        </label>

        <label>
          รอบบิลปัจจุบัน
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={monthIndex} onChange={handleMonthIndexChange} style={{ flex: 2 }}>
              {THAI_MONTHS.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <select value={billYear} onChange={handleYearChange} style={{ flex: 1 }}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label>
          อัตราค่าน้ำ (บาท/หน่วย)
          <input
            type="number"
            step="0.01"
            value={form.ratePerUnit}
            onChange={handleChange('ratePerUnit')}
            required
          />
        </label>

        <label>
          ค่าบริการรายเดือน (บาท)
          <input
            type="number"
            step="0.01"
            value={form.baseFee}
            onChange={handleChange('baseFee')}
            required
          />
        </label>

        {error && <div className="notice error">{error}</div>}
        {message && <div className="notice success">{message}</div>}

        <button type="submit" disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
      </form>

      <div className="panel">
        <h2>ตัวอย่าง QR พร้อมเพย์ (ยอด 100 บาท)</h2>
        {form.promptpayNo ? (
          <img
            src={`https://promptpay.io/${form.promptpayNo}/100.png`}
            alt="ตัวอย่าง QR พร้อมเพย์"
            style={{ maxWidth: 220, marginTop: 10 }}
          />
        ) : (
          <p className="muted">ยังไม่ได้ตั้งเลขพร้อมเพย์</p>
        )}
      </div>
    </section>
  );
}
