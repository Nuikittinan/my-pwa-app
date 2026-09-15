import { useEffect, useState } from 'react';
import { exportDatabase, getDashboardData, importDatabase, updateBillStatus } from '../utils/db';

export default function AdminDashboard({ refreshKey, onDataChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getDashboardData()
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
      });

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

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
          <p>รอบบิล {summary.month}</p>
        </div>
        <div className="actions">
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
        <Metric label="ยังไม่ได้จด" value={summary.pending} />
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
                        เปิดสลิป
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
                    ยังไม่มีบิลรอบนี้ ให้ไปที่เมนูจดมิเตอร์เพื่อสร้างบิล
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
