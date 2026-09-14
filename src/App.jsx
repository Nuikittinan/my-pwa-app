import { useEffect, useState } from 'react'
import AdminDashboard from './components/AdminDashboard'
import AdminMeterEntry from './components/AdminMeterEntry'
import UserDashboard from './components/UserDashboard'
import Login from './components/Login'
import { getSession, logout } from './utils/auth'

function App() {
  // session = null ถ้ายังไม่ login, มีค่า = { role: 'admin' | 'user', ... }
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  // ตรวจสอบว่าเคย login ค้างไว้ไหม (เก็บใน localStorage) ตอนเปิดแอปครั้งแรก
  useEffect(() => {
    const existing = getSession()
    if (existing) setSession(existing)
    setCheckingSession(false)
  }, [])

  const handleLoginSuccess = (newSession) => {
    setSession(newSession)
    setActiveTab('dashboard')
  }

  const handleLogout = () => {
    logout()
    setSession(null)
  }

  // ระหว่างเช็ค session ค้าง ไม่ต้องแสดงอะไร (กันหน้าจอกระพริบ)
  if (checkingSession) return null

  // ยังไม่ login -> บังคับไปหน้า Login ก่อนเสมอ
  if (!session) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  // login เป็นลูกบ้าน -> เห็นเฉพาะบิลของบ้านตัวเอง ไม่เห็นเมนูฝั่งผู้ดูแล
  if (session.role === 'user') {
    const billData = {
      month: 'กันยายน 2569',
      houseNo: session.houseNo,
      prevMeter: 120,
      currMeter: 135,
      units: 15,
      amount: 150,
      status: 'unpaid',
      promptpayNo: '0812345678',
    }

    return (
      <div>
        <TopBar
          title={`👤 สวัสดีคุณ ${session.ownerName}`}
          onLogout={handleLogout}
        />
        <main style={{ padding: 16 }}>
          <UserDashboard billData={billData} />
        </main>
      </div>
    )
  }

  // login เป็นผู้ดูแล (admin) -> เห็นเมนูเต็มรูปแบบ
  const sampleHouse = {
    id: '1',
    houseNo: '99/1',
    ownerName: 'สมชาย ใจดี',
    phone: '081-234-5678',
    prevMeter: 120,
  }

  return (
    <div>
      <TopBar title={`👨‍💼 ผู้ดูแล: ${session.name}`} onLogout={handleLogout} />

      <nav
        style={{
          display: 'flex',
          gap: '10px',
          padding: '12px 24px',
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #333',
        }}
      >
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
          👤 ดูตัวอย่างฝั่งลูกบ้าน
        </button>
      </nav>

      <main>
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'meter' && <AdminMeterEntry houseData={sampleHouse} />}
        {activeTab === 'user' && <UserDashboard />}
      </main>
    </div>
  )
}

// แถบด้านบนสุด แสดงชื่อผู้ใช้ที่ login และปุ่มออกจากระบบ
function TopBar({ title, onLogout }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 24px',
        backgroundColor: '#0f0f0f',
        borderBottom: '1px solid #262626',
      }}
    >
      <span style={{ color: '#eee', fontSize: 14 }}>{title}</span>
      <button onClick={onLogout} style={logoutButtonStyle}>
        ออกจากระบบ
      </button>
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
  fontWeight: isActive ? 'bold' : 'normal',
})

const logoutButtonStyle = {
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid #444',
  backgroundColor: 'transparent',
  color: '#f28b82',
  cursor: 'pointer',
  fontSize: 13,
}

export default App
