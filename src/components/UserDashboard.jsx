import { useEffect, useMemo, useState } from 'react';
import { fileToDataUrl, getBillsByHouseId, getHouseById, getSettings, savePaymentSlip } from '../utils/db';

export default function UserDashboard({ villageId, houseId, refreshKey, onDataChange }) {
  const [house, setHouse] = useState(null);
  const [bills, setBills] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [viewingSlip, setViewingSlip] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      const [houseData, billList, billingSettings] = await Promise.all([
        getHouseById(villageId, houseId),
        getBillsByHouseId(villageId, houseId),
        getSettings(villageId),
      ]);
      if (!mounted) return;
      const sorted = [...billList].sort(
        (a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)
      );
      setHouse(houseData);
      setSettings(billingSettings);
      setBills(sorted);
      // ตั้งค่าบิลที่เลือกไว้เริ่มต้น: บิลค้างชำระที่เก่าที่สุด (จ่ายไล่จากเก่าไปใหม่)
      // ถ้าจ่ายครบทุกบิลแล้ว ให้โชว์บิลล่าสุดแทน
      const unpaid = sorted.filter((b) => b.status !== 'paid');
      setSelectedBillId((prev) => {
        const stillValid = prev && sorted.some((b) => b.id === prev);
        if (stillValid) return prev;
        return unpaid.length > 0 ? unpaid[unpaid.length - 1].id : sorted[0]?.id ?? null;
      });
      setLoading(false);
    }

    loadData().catch((err) => {
      if (mounted) {
        setError(err.message || 'โหลดบิลไม่สำเร็จ');
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [villageId, houseId, refreshKey]);

  const unpaidBills = useMemo(() => bills.filter((b) => b.status !== 'paid'), [bills]);
  const totalOutstanding = useMemo(
    () => unpaidBills.reduce((sum, b) => sum + b.amount, 0),
    [unpaidBills]
  );
  const selectedBill = bills.find((b) => b.id === selectedBillId) || bills[0];

  const handleSlipUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBill) return;
    const dataUrl = await fileToDataUrl(file);
    await savePaymentSlip(villageId, selectedBill.id, dataUrl);
    event.target.value = '';
    onDataChange();
  };

  if (loading) return <div className="panel">กำลังโหลดบิล...</div>;
  if (error) return <div className="panel danger">{error}</div>;

  return (
    <section className="stack">
      <div className="section-heading">
        <div>
          <h1>บิลค่าน้ำของฉัน</h1>
          <p>
            บ้านเลขที่ {house?.houseNo} - {house?.ownerName}
          </p>
        </div>
      </div>

      {house?.initialMeterImage && (
        <div className="panel">
          <div className="panel-title">
            <h2>รูปมิเตอร์ตั้งต้นของบ้านนี้</h2>
          </div>
          <button
            type="button"
            onClick={() => setViewingSlip(house.initialMeterImage)}
            style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <img
              src={house.initialMeterImage}
              alt="รูปมิเตอร์ตั้งต้น"
              style={{ maxWidth: 200, borderRadius: 8 }}
            />
          </button>
          <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
            รูปอ้างอิงตอนลงทะเบียนบ้าน ใช้เทียบตอนมีข้อพิพาทเรื่องเลขมิเตอร์ได้
          </p>
        </div>
      )}

      {unpaidBills.length > 1 && (
        <div className="notice error">
          มีบิลค้างชำระทั้งหมด {unpaidBills.length} รอบ รวม {totalOutstanding.toLocaleString()} บาท
          — เลือกบิลที่จะชำระได้จากรายการด้านล่าง (แนบสลิปทีละรอบ)
        </div>
      )}

      {!selectedBill ? (
        <div className="panel empty">ยังไม่มีบิลที่ออกโดยผู้ดูแล</div>
      ) : (
        <div className="panel bill-card">
          <div className="panel-title">
            <h2>รอบบิล {selectedBill.month}</h2>
            <Status status={selectedBill.status} />
          </div>

          <div className="bill-grid">
            <span>เลขมิเตอร์ครั้งก่อน</span>
            <strong>{selectedBill.prevMeter}</strong>
            <span>เลขมิเตอร์ครั้งนี้</span>
            <strong>{selectedBill.currMeter}</strong>
            <span>จำนวนหน่วย</span>
            <strong>{selectedBill.units} หน่วย</strong>
            <span>ยอดชำระ</span>
            <strong>{selectedBill.amount.toLocaleString()} บาท</strong>
          </div>

          {selectedBill.status !== 'paid' && (
            <div className="payment-box">
              <h3>ชำระผ่านพร้อมเพย์</h3>
              <img
                src={`https://promptpay.io/${settings?.promptpayNo || selectedBill.promptpayNo}/${selectedBill.amount}.png`}
                alt="PromptPay QR Code"
              />
              <label className="file-button wide">
                แนบสลิปการโอนเงิน (สำหรับรอบ {selectedBill.month})
                <input type="file" accept="image/*" onChange={handleSlipUpload} />
              </label>
              {selectedBill.slipImage && (
                <button
                  type="button"
                  onClick={() => setViewingSlip(selectedBill.slipImage)}
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <img
                    src={selectedBill.slipImage}
                    alt="สลิปที่ส่งล่าสุด"
                    style={{ maxWidth: 160, borderRadius: 8, marginTop: 8 }}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {bills.length > 1 && (
        <div className="panel">
          <div className="panel-title">
            <h2>บิลทั้งหมด</h2>
          </div>
          <div className="history-list">
            {bills
              .filter((bill) => bill.id !== selectedBill?.id)
              .map((bill) => (
                <div key={bill.id}>
                  <span>{bill.month}</span>
                  <strong>{bill.amount.toLocaleString()} บาท</strong>
                  <Status status={bill.status} />
                  {bill.status !== 'paid' && (
                    <button className="secondary" onClick={() => setSelectedBillId(bill.id)}>
                      เลือกชำระบิลนี้
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

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
              alt="รูปขยาย"
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
    </section>
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
