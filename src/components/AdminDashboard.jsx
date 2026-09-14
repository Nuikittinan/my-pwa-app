import React from 'react'

export default function AdminDashboard() {
  // ข้อมูลจำลองสำหรับแสดงผลบน Dashboard
  const summary = {
    month: 'กันยายน 2569',
    totalHouses: 250,
    recorded: 220,
    pending: 30,
    totalBilled: 35400,
    totalPaid: 28500,
    totalUnpaid: 6900
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#1a252f' }}>📊 ประปาหมู่บ้าน XXX</h1>
        <p style={{ margin: '5px 0', color: '#555' }}>
          <strong>รอบบิล:</strong> {summary.month}
        </p>
      </header>

      {/* การ์ดสรุปข้อมูลรายตัว */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px'
        }}
      >
        <div style={cardStyle('#f8f9fa', '#212529')}>
          <div>🏠 จำนวนบ้านทั้งหมด</div>
          <div style={numberStyle}>{summary.totalHouses}</div>
        </div>

        <div style={cardStyle('#d4edda', '#155724')}>
          <div>✅ จดมิเตอร์แล้ว</div>
          <div style={numberStyle}>{summary.recorded}</div>
        </div>

        <div style={cardStyle('#fff3cd', '#856404')}>
          <div>⏳ ยังไม่ได้จด</div>
          <div style={numberStyle}>{summary.pending}</div>
        </div>

        <div style={cardStyle('#cce5ff', '#004085')}>
          <div>💰 ยอดเรียกเก็บทั้งหมด</div>
          <div style={numberStyle}>
            {summary.totalBilled.toLocaleString()} ฿
          </div>
        </div>

        <div style={cardStyle('#d1e7dd', '#0f5132')}>
          <div>✅ ชำระเงินแล้ว</div>
          <div style={numberStyle}>{summary.totalPaid.toLocaleString()} ฿</div>
        </div>

        <div style={cardStyle('#f8d7da', '#721c24')}>
          <div>❌ ค้างชำระ</div>
          <div style={numberStyle}>
            {summary.totalUnpaid.toLocaleString()} ฿
          </div>
        </div>
      </div>
    </div>
  )
}

// Style สำหรับตกแต่งการ์ดแสดงผล
const cardStyle = (bgColor, textColor) => ({
  backgroundColor: bgColor,
  color: textColor,
  padding: '16px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
})

const numberStyle = {
  fontSize: '20px',
  fontWeight: 'bold',
  marginTop: '8px'
}