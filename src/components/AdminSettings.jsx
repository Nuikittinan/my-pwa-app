import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../utils/db';

export default function AdminSettings({ villageId, onDataChange }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    getSettings(villageId)
      .then((s) => setForm(s))
      .catch((err) => setError(err.message || 'โหลดการตั้งค่าไม่สำเร็จ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [villageId]);

  const handleChange = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      // ไม่ส่ง month มาด้วย เพราะย้ายไปตั้งที่หน้า "จดมิเตอร์" แล้ว เพื่อความสะดวก
      const { month, ...rest } = form;
      const updated = await updateSettings(villageId, rest);
      setForm(updated);
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
          <p>กำหนดเลขพร้อมเพย์จริง อัตราค่าน้ำ และค่าบริการ</p>
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

      <div className="panel">
        <p className="muted">
          ต้องการเปลี่ยนรอบบิลปัจจุบัน (เดือน/ปี)? ไปตั้งค่าได้ที่หน้า "จดมิเตอร์" แทน
          เพื่อความสะดวกตอนเริ่มรอบบิลใหม่
        </p>
      </div>
    </section>
  );
}
