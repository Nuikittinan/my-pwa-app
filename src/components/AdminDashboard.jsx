import { useEffect, useState } from 'react';
import AdminUsageChart from './AdminUsageChart';
import {
  exportDatabase,
  fileToDataUrl,
  getAvailableMonths,
  getDashboardData,
  importDatabase,
  updateBillStatus,
  updateMeterReading,
} from '../utils/db';

export default function AdminDashboard({ villageId, refreshKey, onDataChange }) {
  const [data, setData] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [error, setError] = useState('');
  const [viewingSlip, setViewingSlip] = useState(null);
  const [editingBill, setEditingBill] = useState(null);

  // โหลดรายชื่อรอบบิลทั้งหมดที่มีอยู่ (ครั้งแรก + ทุกครั้งที่มีการเปลี่ยนแปลงข้อมูล)
  useEffect(() => {
    let mounted = true;
    getAvailableMonths(villageId)
      .then((list) => {
        if (!mounted) return;
        setMonths(list);
        // ถ้ายังไม่เคยเลือกเดือน หรือเดือนที่เลือกไว้หายไปจากลิสต์ -> กลับไปใช้รอบล่าสุด (ตัวท้ายสุด)
        setSelectedMonth((prev) => (prev && list.includes(prev) ? prev : list[list.length - 1]));
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'โหลดรายชื่อรอบบิลไม่สำเร็จ');
      });
    return () => {
      mounted = false;
    };
  }, [villageId, refreshKey]);

  useEffect(() => {
    if (!selectedMonth) return;
    let mounted = true;
    getDashboardData(villageId, selectedMonth)
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
      });

    return () => {
      mounted = false;
    };
  }, [villageId, selectedMonth, refreshKey]);

  const handleApprove = async (billId) => {
    await updateBillStatus(villageId, billId, 'paid');
    onDataChange();
  };

  const handleReject = async (billId) => {
    await updateBillStatus(villageId, billId, 'unpaid');
    onDataChange();
  };

  const handleExport = async () => {
    const payload = await exportDatabase(villageId);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `water-db-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const payload = JSON.parse(await file.text());
    await importDatabase(villageId, payload);
    event.target.value = '';
    onDataChange();
  };

  if (error) return <div className="panel danger">{error}</div>;
  if (!data) return <div className="panel">กำลังโหลดข้อมูล...</div>;

  const { summary, bills } = data;

  return (
    <section className="stack">
      <div className="section-heading">
        <div>
          <h1>สรุปค่าน้ำประปา</h1>
          <p>
            รอบบิล {summary.month}
            {summary.isCurrentMonth ? ' (รอบปัจจุบัน)' : ' (รอบที่ผ่านมา)'}
          </p>
        </div>
        <div className="actions">
          {months.length > 1 && (
            <select
              value={selectedMonth || ''}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
              }}
            >
              {[...months].reverse().map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <button className="secondary" onClick={handleExport}>
            สำรองข้อมูล
          </button>
          <label className="file-button">
            นำเข้าข้อมูล
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="บ้านทั้งหมด" value={summary.totalHouses} />
        <Metric label="จดมิเตอร์แล้ว" value={summary.recorded} />
        {summary.isCurrentMonth && <Metric label="ยังไม่ได้จด" value={summary.pending} />}
        <Metric label="รอตรวจสลิป" value={summary.waitingReview} />
        <Metric label="ยอดเรียกเก็บ" value={`${summary.totalBilled.toLocaleString()} บาท`} />
        <Metric label="ค้างชำระ" value={`${summary.totalUnpaid.toLocaleString()} บาท`} tone="warning" />
      </div>

      <div className="panel">
        <div className="panel-title">
          <h2>รายการบิล</h2>
          <span>{bills.length} รายการ</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>บ้าน</th>
                <th>มิเตอร์</th>
                <th>วันที่จด</th>
                <th>หน่วย</th>
                <th>ยอด</th>
                <th>สถานะ</th>
                <th>หลักฐาน</th>
                <th>แก้ไข</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td>
                    <strong>{bill.house?.houseNo}</strong>
                    <small>{bill.house?.ownerName}</small>
                  </td>
                  <td>
                    {bill.prevMeter} → {bill.currMeter}
                  </td>
                  <td>
                    {bill.recordedAt
                      ? new Date(bill.recordedAt).toLocaleString('th-TH', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : '-'}
                  </td>
                  <td>{bill.units}</td>
                  <td>{bill.amount.toLocaleString()} บาท</td>
                  <td>
                    <Status status={bill.status} />
                  </td>
                  <td>
                    {bill.slipImage ? (
                      <button
                        type="button"
                        onClick={() => setViewingSlip(bill.slipImage)}
                        style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        <img
                          src={bill.slipImage}
                          alt="สลิปโอนเงิน"
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                        />
                      </button>
                    ) : (
                      <span className="muted">ไม่มี</span>
                    )}
                  </td>
                  <td>
                    <button className="secondary" onClick={() => setEditingBill(bill)}>
                      แก้ไข
                    </button>
                  </td>
                  <td>
                    {bill.status === 'pending' ? (
                      <div className="row-actions">
                        <button onClick={() => handleApprove(bill.id)}>อนุมัติ</button>
                        <button className="secondary" onClick={() => handleReject(bill.id)}>
                          ตีกลับ
                        </button>
                      </div>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr>
                  <td colSpan="9" className="empty">
                    {summary.isCurrentMonth
                      ? 'ยังไม่มีบิลรอบนี้ ให้ไปที่เมนูจดมิเตอร์เพื่อสร้างบิล'
                      : 'ไม่พบบิลของรอบนี้'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminUsageChart villageId={villageId} refreshKey={refreshKey} />

      {viewingSlip && (
        <div
          onClick={() => setViewingSlip(null)}
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
              src={viewingSlip}
              alt="สลิปโอนเงิน (ขนาดเต็ม)"
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 10 }}
            />
            <button
              type="button"
              onClick={() => setViewingSlip(null)}
              style={{ marginTop: 14, padding: '8px 20px' }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
      {editingBill && (
        <EditBillModal
          villageId={villageId}
          bill={editingBill}
          onClose={() => setEditingBill(null)}
          onSaved={() => {
            setEditingBill(null);
            onDataChange();
          }}
        />
      )}
    </section>
  );
}

function toLocalDatetimeValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function EditBillModal({ villageId, bill, onClose, onSaved }) {
  const [currMeter, setCurrMeter] = useState(String(bill.currMeter));
  const [meterImage, setMeterImage] = useState(bill.meterImage);
  const [recordedAt, setRecordedAt] = useState(() =>
    toLocalDatetimeValue(bill.recordedAt ? new Date(bill.recordedAt) : new Date())
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const units = Math.max(0, Number(currMeter) - bill.prevMeter);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) setMeterImage(await fileToDataUrl(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateMeterReading(villageId, bill.id, { currMeter, meterImage, recordedAt });
      onSaved();
    } catch (err) {
      setError(err.message || 'แก้ไขบิลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
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
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="panel form-grid"
        style={{ maxWidth: 380, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h2 style={{ margin: 0 }}>
          แก้ไขบิล — {bill.house?.houseNo} ({bill.month})
        </h2>

        <label>
          เลขมิเตอร์เดือนก่อน (แก้ไขไม่ได้)
          <input type="number" value={bill.prevMeter} disabled />
        </label>

        <label>
          เลขมิเตอร์ปัจจุบัน
          <input
            type="number"
            min={bill.prevMeter}
            value={currMeter}
            onChange={(e) => setCurrMeter(e.target.value)}
            required
          />
        </label>

        <label>
          วันเวลาที่จดมิเตอร์
          <input
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            required
          />
        </label>

        <label>
          รูปมิเตอร์
          <input type="file" accept="image/*" onChange={handleImageUpload} />
        </label>

        {meterImage && <img className="preview-image" src={meterImage} alt="รูปมิเตอร์" />}

        <div className="estimate">
          <span>
            จำนวนหน่วยใหม่: <strong>{units}</strong>
          </span>
        </div>

        {bill.status === 'paid' && (
          <div className="notice error">
            บิลนี้ชำระแล้ว — ถ้าแก้เลขมิเตอร์ ยอดเงินจะถูกคำนวณใหม่ แต่สถานะยังคงเป็น
            "ชำระแล้ว" เหมือนเดิม กรุณาตรวจสอบยอดที่รับจริงเทียบกับยอดใหม่ด้วยตัวเอง
          </div>
        )}

        {error && <div className="notice error">{error}</div>}

        <div className="row-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
}

function Metric({ label, value, tone = 'normal' }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Status({ status }) {
  const label = {
    unpaid: 'ยังไม่ได้ชำระ',
    pending: 'รอตรวจสอบ',
    paid: 'ชำระแล้ว',
  }[status];
  return <span className={`status ${status}`}>{label}</span>;
}
