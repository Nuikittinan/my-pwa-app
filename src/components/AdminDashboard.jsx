import React from 'react'

export default function AdminDashboard() {
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
    <div style={{ 
      padding: '24px', 
      fontFamily: 'sans-serif', 
      backgroundColor: '#121212', // กำหนดพื้นหลังเข้มให้เนียนตา
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      {/* ส่วนหัวข้อ - กำหนดสีตัวหนังสือให้ชัดเจน */}
      <header style={{ 
        marginBottom: '24px', 
        textAlign: 'left', 
        borderBottom: '1px solid #333', 
        paddingBottom: '16px' 
      }}>
        <h1 style={{ margin: 0, color: '#ffffff', fontSize: '28px' }}>
          📊 ประปาหมู่บ้าน
        </h1>
        <p style={{ margin: '8px 0 0 0', color: '#b0b0b0', fontSize: '16px' }}>
          <strong>รอบบิล:</strong> {summary.month}
        </p>
      </header>

      {/* การ์ดสรุปข้อมูล */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '16px'
      }}>
        <div style={cardStyle('#ffffff', '#1a1a1a')}>
          <div style={titleStyle}>🏠 จำนวนบ้านทั้งหมด</div>
          <div style={numberStyle}>{summary.totalHouses}</div>
        </div>

        <div style={cardStyle('#e6f4ea', '#137333')}>
          <div style={titleStyle}>✅ จดมิเตอร์แล้ว</div>
          <div style={numberStyle}>{summary.recorded}</div>
        </div>

        <div style={cardStyle('#fef7e0', '#b06000')}>
          <div style={titleStyle}>⏳ ยังไม่ได้จด</div>
          <div style={numberStyle}>{summary.pending}</div>
        </div>

        <div style={cardStyle('#e8f0fe', '#1a73e8')}>
          <div style={titleStyle}>💰 ยอดเรียกเก็บทั้งหมด</div>
          <div style={numberStyle}>{summary.totalBilled.toLocaleString()} ฿</div>
        </div>

        <div style={cardStyle('#e6f4ea', '#137333')}>
          <div style={titleStyle}>✅ ชำระเงินแล้ว</div>
          <div style={numberStyle}>{summary.totalPaid.toLocaleString()} ฿</div>
        </div>

        <div style={cardStyle('#fce8e6', '#c5221f')}>
          <div style={titleStyle}>❌ ค้างชำระ</div>
          <div style={numberStyle}>{summary.totalUnpaid.toLocaleString()} ฿</div>
        </div>
      </div>
    </div>
  )
}

const cardStyle = (bgColor, textColor) => ({
  backgroundColor: bgColor,
  color: textColor,
  padding: '16px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
  textAlign: 'center'
})

const titleStyle = {
  fontSize: '14px',
  fontWeight: '600'
}

const numberStyle = {
  fontSize: '22px',
  fontWeight: 'bold',
  marginTop: '8px'
}