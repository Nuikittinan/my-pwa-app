import { useEffect, useState } from 'react';
import {
  exportDatabase,
  getAvailableMonths,
  getDashboardData,
  importDatabase,
  updateBillStatus,
} from '../utils/db';

export default function AdminDashboard({ refreshKey, onDataChange }) {
  const [data, setData] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [error, setError] = useState('');

  // โหลดรายชื่อรอบบิลทั้งหมดที่มีอยู่ (ครั้งแรก + ทุกครั้งที่มีการเปลี่ยนแปลงข้อมูล)
  useEffect(() => {
    let mounted = true;
    getAvailableMonths()
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
  }, [refreshKey]);

  useEffect(() => {
    if (!selectedMonth) return;
    let mounted = true;
    getDashboardData(selectedMonth)
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
      });

    return () => {
      mounted = false;
    };
  }, [selectedMonth, refreshKey]);

  const handleApprove = async (billId) => {
    await updateBillStatus(billId, 'paid');
    onDataChange();
  };

  const handleReject = async (billId) => {
    await updateBillStatus(billId, 'unpaid');
    onDataChange();
  };

  const handleExport = async () => {
    const payload = await exportDatabase();
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
    await importDatabase(payload);
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
                <th>หน่วย</th>
                <th>ยอด</th>
                <th>สถานะ</th>
                <th>หลักฐาน</th>
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
                  <td>{bill.units}</td>
                  <td>{bill.amount.toLocaleString()} บาท</td>
                  <td>
                    <Status status={bill.status} />
                  </td>
                  <td>
                    {bill.slipImage ? (
                      <a href={bill.slipImage} target="_blank" rel="noreferrer">
                        <img
                          src={bill.slipImage}
                          alt="สลิปโอนเงิน"
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                        />
                      </a>
                    ) : (
                      <span className="muted">ไม่มี</span>
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
                  <td colSpan="7" className="empty">
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
    </section>
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
