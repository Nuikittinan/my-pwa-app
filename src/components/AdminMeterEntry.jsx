import { useState } from 'react';

export default function AdminMeterEntry({ houseData }) {
  const [prevMeter] = useState(houseData?.prevMeter || 120);
  const [currMeter, setCurrMeter] = useState('');
  const [meterImage, setMeterImage] = useState(null);

  // คำนวณหน่วยอัตโนมัติ
  const unitsUsed = currMeter ? Math.max(0, currMeter - prevMeter) : 0;
  const ratePerUnit = 10;
  const totalAmount = unitsUsed * ratePerUnit;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setMeterImage(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      houseId: houseData.id,
      prevMeter,
      currMeter: Number(currMeter),
      unitsUsed,
      totalAmount,
      meterImage,
      status: 'unpaid'
    };
    console.log('บันทึกข้อมูล:', dataToSave);
    alert('บันทึกค่าน้ำเรียบร้อยแล้ว');
  };

  return (
    <div style={{ padding: 16, border: '1px solid #ccc', borderRadius: 8, maxWidth: 400 }}>
      <h3>📝 จดมิเตอร์: บ้านเลขที่ {houseData?.houseNo || '99/1'}</h3>
      <p>👤 เจ้าของ: {houseData?.ownerName || 'สมชาย ใจดี'} ({houseData?.phone || '081-234-5678'})</p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>📷 ถ่ายรูปมิเตอร์: </label>
          <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} />
          {meterImage && <img src={meterImage} alt="Meter" style={{ width: '100%', marginTop: 8 }} />}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>🔢 เลขมิเตอร์เดือนก่อน: </label>
          <input type="number" value={prevMeter} disabled style={{ width: 80 }} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>🔢 เลขมิเตอร์ปัจจุบัน: </label>
          <input 
            type="number" 
            value={currMeter} 
            onChange={(e) => setCurrMeter(e.target.value)} 
            required 
            style={{ width: 80 }}
          />
        </div>

        <div style={{ background: '#f0f0f0', padding: 10, borderRadius: 5, marginBottom: 10 }}>
          <div>🧮 ปริมาณที่ใช้: <strong>{unitsUsed}</strong> หน่วย</div>
          <div>💰 ยอดรวมค่าน้ำ: <strong>{totalAmount.toLocaleString()}</strong> บาท</div>
        </div>

        <button type="submit" style={{ padding: '8px 16px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4 }}>
          💾 บันทึกและสร้างใบแจ้งหนี้
        </button>
      </form>
    </div>
  );
}