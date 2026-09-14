import { useState } from 'react'
import AdminDashboard from './components/AdminDashboard'
import AdminMeterEntry from './components/AdminMeterEntry'
import UserDashboard from './components/UserDashboard'

function App() {
  // สร้าง State สำหรับเก็บว่าตอนนี้อยู่หน้าไหน ('dashboard', 'meter', 'user')
  const [activeTab, setActiveTab] = useState('dashboard')

  // ข้อมูลจำลองสำหรับทดสอบ
  const sampleHouse = { id: '1', houseNo: '99/1', ownerName: 'สมชาย ใจดี', phone: '081-234-5678', prevMeter: 120 }

  return (
    <div>
      {/* แถบ เมนู Navigation Bar ด้านบน */}
      <nav style={{
        display: 'flex',
        gap: '10px',
        padding: '12px 24px',
        backgroundColor: '#1e1e1e',
        borderBottom: '1px solid #333'
      }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          style={navButtonStyle(activeTab === 'dashboard')}
        >
          📊 สรุปผล (กรรมการ)
        </button>
        <button 
          onClick={() => setActiveTab('meter')}
          style={navButtonStyle(activeTab === 'meter')}
        >
          📝 จดมิเตอร์
        </button>
        <button 
          onClick={() => setActiveTab('user')}
          style={navButtonStyle(activeTab === 'user')}
        >
          👤 ฝั่งลูกบ้าน
        </button>
      </nav>

      {/* เงื่อนไขแสดงผลหน้าจอตาม Tab ที่เลือก */}
      <main>
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'meter' && <AdminMeterEntry houseData={sampleHouse} />}
        {activeTab === 'user' && <UserDashboard />}
      </main>
    </div>
  )
}

// ตกแต่งปุ่มเมนู
const navButtonStyle = (isActive) => ({
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: isActive ? '#007bff' : '#333',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: isActive ? 'bold' : 'normal'
})

export default App