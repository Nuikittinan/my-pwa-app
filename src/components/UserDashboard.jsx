import { useState } from 'react';

export default function UserDashboard({ billData }) {
  const bill = billData || {
    month: 'กันยายน 2569',
    houseNo: '99/1',
    prevMeter: 120,
    currMeter: 135,
    units: 15,
    amount: 150,
    status: 'unpaid', // 'unpaid', 'pending', 'paid'
    promptpayNo: '0812345678'
  };

  const [slip, setSlip] = useState(null);
  const [status, setStatus] = useState(bill.status);

  const handleSlipUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSlip(URL.createObjectURL(file));
      setStatus('pending'); // ส่งสลิปแล้ว รอตรวจสอบ
      alert('ส่งสลิปเรียบร้อยแล้ว รอระบบตรวจสอบ');
    }
  };

  return (
    <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8, maxWidth: 400 }}>
      {/* 🔔 การแจ้งเตือนบน Dashboard */}
      <div style={{ background: '#e3f2fd', padding: 10, borderRadius: 5, marginBottom: 12 }}>
        🔔 <strong>แจ้งเตือน:</strong> ออกบิลรอบ {bill.month} แล้ว
      </div>

      <h2>🧾 บิลค่าน้ำประปา - บ้านเลขที่ {bill.houseNo}</h2>
      <p>รอบบิล: {bill.month}</p>
      
      <table style={{ width: '100%', marginBottom: 12, textAlign: 'left' }}>
        <tbody>
          <tr><td>เลขมิเตอร์ครั้งก่อน:</td><td>{bill.prevMeter}</td></tr>
          <tr><td>เลขมิเตอร์ครั้งนี้:</td><td>{bill.currMeter}</td></tr>
          <tr><td>จำนวนหน่วยที่ใช้:</td><td><strong>{bill.units} หน่วย</strong></td></tr>
          <tr><td>ยอดชำระทั้งสิ้น:</td><td><strong style={{ fontSize: 18, color: 'blue' }}>{bill.amount} บาท</strong></td></tr>
          <tr>
            <td>สถานะชำระเงิน:</td>
            <td>
              {status === 'paid' && <span style={{ color: 'green' }}>✅ ชำระแล้ว</span>}
              {status === 'pending' && <span style={{ color: 'orange' }}>⏳ รอตรวจสอบสลิป</span>}
              {status === 'unpaid' && <span style={{ color: 'red' }}>❌ ยังไม่ได้ชำระ</span>}
            </td>
          </tr>
        </tbody>
      </table>

      {status === 'unpaid' && (
        <div style={{ borderTop: '1px solid #ccc', paddingTop: 12 }}>
          <h4>📱 สแกน QR พร้อมเพย์เพื่อชำระเงิน</h4>
          {/* สามารถใช้ไลบรารี promptpay-qr เจน QR Code อัตโนมัติได้ */}
          <img 
            src={`https://promptpay.io/${bill.promptpayNo}/${bill.amount}.png`} 
            alt="PromptPay QR Code" 
            style={{ width: '100%', maxWidth: 200, display: 'block', margin: '0 auto' }}
          />

          <div style={{ marginTop: 12 }}>
            <label>📤 แนบสลิปการโอนเงิน:</label>
            <input type="file" accept="image/*" onChange={handleSlipUpload} style={{ marginTop: 5 }} />
          </div>
        </div>
      )}
    </div>
  );
}