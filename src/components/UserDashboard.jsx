import { useEffect, useState } from 'react';
import { fileToDataUrl, getBillsByHouseId, getHouseById, getSettings, savePaymentSlip } from '../utils/db';

export default function UserDashboard({ houseId, refreshKey, onDataChange }) {
  const [house, setHouse] = useState(null);
  const [bills, setBills] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latestBill = bills[0];

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      const [houseData, billList, billingSettings] = await Promise.all([
        getHouseById(houseId),
        getBillsByHouseId(houseId),
        getSettings(),
      ]);
      if (!mounted) return;
      setHouse(houseData);
      setSettings(billingSettings);
      setBills(
        [...billList].sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)),
      );
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
  }, [houseId, refreshKey]);

  const handleSlipUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !latestBill) return;
    const dataUrl = await fileToDataUrl(file);
    await savePaymentSlip(latestBill.id, dataUrl);
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

      {!latestBill ? (
        <div className="panel empty">ยังไม่มีบิลที่ออกโดยผู้ดูแลในรอบนี้</div>
      ) : (
        <div className="panel bill-card">
          <div className="panel-title">
            <h2>รอบบิล {latestBill.month}</h2>
            <Status status={latestBill.status} />
          </div>

          <div className="bill-grid">
            <span>เลขมิเตอร์ครั้งก่อน</span>
            <strong>{latestBill.prevMeter}</strong>
            <span>เลขมิเตอร์ครั้งนี้</span>
            <strong>{latestBill.currMeter}</strong>
            <span>จำนวนหน่วย</span>
            <strong>{latestBill.units} หน่วย</strong>
            <span>ยอดชำระ</span>
            <strong>{latestBill.amount.toLocaleString()} บาท</strong>
          </div>

          {latestBill.status !== 'paid' && (
            <div className="payment-box">
              <h3>ชำระผ่านพร้อมเพย์</h3>
              <img
                src={`https://promptpay.io/${settings?.promptpayNo || latestBill.promptpayNo}/${latestBill.amount}.png`}
                alt="PromptPay QR Code"
              />
              <label className="file-button wide">
                แนบสลิปการโอนเงิน
                <input type="file" accept="image/*" onChange={handleSlipUpload} />
              </label>
              {latestBill.slipImage && (
                <a href={latestBill.slipImage} target="_blank" rel="noreferrer">
                  <img
                    src={latestBill.slipImage}
                    alt="สลิปที่ส่งล่าสุด"
                    style={{ maxWidth: 160, borderRadius: 8, marginTop: 8 }}
                  />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {bills.length > 1 && (
        <div className="panel">
          <div className="panel-title">
            <h2>ประวัติบิล</h2>
          </div>
          <div className="history-list">
            {bills.slice(1).map((bill) => (
              <div key={bill.id}>
                <span>{bill.month}</span>
                <strong>{bill.amount.toLocaleString()} บาท</strong>
                <Status status={bill.status} />
              </div>
            ))}
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
