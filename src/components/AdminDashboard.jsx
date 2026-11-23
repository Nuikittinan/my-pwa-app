import { useEffect, useState } from 'react';
import AdminUsageChart from './AdminUsageChart';
import Pager from './Pager';
import {
  exportDatabase,
  fileToDataUrl,
  getAvailableMonths,
  getDashboardData,
  importDatabase,
  updateBillStatus,
  updateMeterReading,
} from '../utils/db';

const PAGE_SIZE = 20;

export default function AdminDashboard({ villageId, refreshKey, onDataChange }) {
  const [data, setData] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [error, setError] = useState('');
  const [viewingSlip, setViewingSlip] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [page, setPage] = useState(1);

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
    setPage(1); // เปลี่ยนรอบบิล -> เริ่มดูจากหน้าแรกใหม่เสมอ
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
  const totalPages = Math.max(1, Math.ceil(bills.length / PAGE_SIZE));
  const pagedBills = bills.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  if (page > totalPages) {
    // ป้องกันหน้าค้างเกินขอบเขตหลังข้อมูลเปลี่ยน (setState ระหว่าง render ปลอดภัยเพราะ React จะ re-render ให้เอง)
    setPage(totalPages);
  }

  return (
    <section className="stack">
      <div className="dashboard-header">
        <div className="dashboard-heading-copy">
          <span className="dashboard-eyebrow">WATER MANAGEMENT OVERVIEW</span>
          <h1>ภาพรวมการจัดการค่าน้ำ</h1>
          <p>ติดตามการจดมิเตอร์ การเรียกเก็บ และสถานะการชำระในหน้าเดียว</p>
          <div className="dashboard-month-chip">รอบบิล {summary.month} · {summary.isCurrentMonth ? 'รอบปัจจุบัน' : 'รอบย้อนหลัง'}</div>
        </div>
        <div className="dashboard-toolbar">
          {months.length > 1 && (
            <select className="dashboard-month-select" value={selectedMonth || ''} onChange={(e) => setSelectedMonth(e.target.value)} aria-label="เลือกรอบบิล">
              {[...months].reverse().map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <button className="secondary dashboard-action" onClick={handleExport}>↓ สำรองข้อมูล</button>
          <label className="file-button dashboard-action">
            ↑ นำเข้าข้อมูล
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
        </div>
      </div>
      <div className="dashboard-kpi-grid">
        <Metric icon="⌂" label="บ้านทั้งหมด" value={summary.totalHouses.toLocaleString()} detail="จำนวนบ้านในระบบ" accent="blue" />
        <Metric icon="✓" label="จดมิเตอร์แล้ว" value={summary.recorded.toLocaleString()} detail={`จาก ${summary.totalHouses.toLocaleString()} บ้าน`} accent="green" />
        {summary.isCurrentMonth && <Metric icon="◷" label="ยังไม่ได้จด" value={summary.pending.toLocaleString()} detail="บ้านที่รอจดมิเตอร์" accent="amber" />}
        <Metric icon="▣" label="รอตรวจสลิป" value={summary.waitingReview.toLocaleString()} detail="รายการรออนุมัติ" accent="violet" />
        <Metric icon="฿" label="ยอดเรียกเก็บ" value={`${summary.totalBilled.toLocaleString()} ฿`} detail="ยอดรวมรอบบิลนี้" accent="sky" />
        <Metric icon="!" label="ยอดค้างชำระ" value={`${summary.totalUnpaid.toLocaleString()} ฿`} detail="รวมยอดที่ยังไม่ชำระ" accent="rose" />
      </div>
      <div className="dashboard-progress-panel">
        <div className="dashboard-progress-head"><strong>ความคืบหน้าการจดมิเตอร์</strong><span>{summary.totalHouses ? Math.round((summary.recorded / summary.totalHouses) * 100) : 0}%</span></div>
        <div className="dashboard-progress-track"><div className="dashboard-progress-fill" style={{ width: `${summary.totalHouses ? Math.min(100, (summary.recorded / summary.totalHouses) * 100) : 0}%` }} /></div>
        <div className="dashboard-progress-caption"><span>จดแล้ว {summary.recorded.toLocaleString()} บ้าน</span><span>เหลือ {summary.pending.toLocaleString()} บ้าน</span></div>
      </div>
      <div className="dashboard-quick-actions">
        <div><strong>สรุปงานที่ต้องติดตาม</strong><span>สถานะของรอบบิลที่เลือก</span></div>
        <div className="dashboard-quick-pill">▤ บิลทั้งหมด {bills.length} รายการ</div>
        <div className="dashboard-quick-pill">✓ รอตรวจสลิป {summary.waitingReview} รายการ</div>
        <button className="secondary dashboard-quick-button" onClick={handleExport}>↓ สำรองข้อมูล</button>
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
              {pagedBills.map((bill) => (
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
                    {bill.status === 'paid' ? (
                      <span className="muted" title="บิลที่ชำระแล้วแก้ไขไม่ได้">
                        แก้ไขไม่ได้
                      </span>
                    ) : bill.status === 'pending' ? (
                      <span className="muted" title="มีสลิปรอตรวจสอบอยู่ ต้องอนุมัติ/ตีกลับก่อนถึงจะแก้ไขได้">
                        แก้ไขไม่ได้
                      </span>
                    ) : (
                      <button className="secondary" onClick={() => setEditingBill(bill)}>
                        แก้ไข
                      </button>
                    )}
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
        <Pager page={page} totalPages={totalPages} onChange={setPage} />
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

function Metric({ icon, label, value, detail, accent = 'blue' }) {
  return (
    <div className={`dashboard-kpi dashboard-kpi-${accent}`}>
      <div className="dashboard-kpi-top"><span className="dashboard-kpi-icon">{icon}</span><span className="dashboard-kpi-label">{label}</span></div>
      <strong className="dashboard-kpi-value">{value}</strong>
      <span className="dashboard-kpi-detail">{detail}</span>
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
