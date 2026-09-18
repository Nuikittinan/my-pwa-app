import { useEffect, useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import AdminMeterEntry from './components/AdminMeterEntry';
import AdminHouses from './components/AdminHouses';
import AdminSettings from './components/AdminSettings';
import UserDashboard from './components/UserDashboard';
import Login from './components/Login';
import { getSession, initializeAppData, logout } from './utils/auth';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      await initializeAppData();
      if (!mounted) return;
      setSession(getSession());
      setCheckingSession(false);
    }

    bootstrap().catch(() => {
      if (mounted) setCheckingSession(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const refreshData = () => setRefreshKey((value) => value + 1);

  const handleLoginSuccess = (newSession) => {
    setSession(newSession);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    logout();
    setSession(null);
  };

  if (checkingSession) {
    return <div className="app-loading">กำลังเตรียมฐานข้อมูล...</div>;
  }

  if (!session) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (session.role === 'user') {
    return (
      <div className="app-shell">
        <TopBar
          title={`${session.villageName} — ลูกบ้าน: ${session.ownerName} (${session.houseNo})`}
          onLogout={handleLogout}
        />
        <main className="app-main">
          <UserDashboard
            villageId={session.villageId}
            houseId={session.id}
            refreshKey={refreshKey}
            onDataChange={refreshData}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar title={`${session.villageName} — ผู้ดูแล: ${session.name}`} onLogout={handleLogout} />

      <nav className="app-tabs" aria-label="เมนูหลัก">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          สรุปและตรวจชำระ
        </button>
        <button className={activeTab === 'meter' ? 'active' : ''} onClick={() => setActiveTab('meter')}>
          จดมิเตอร์
        </button>
        <button className={activeTab === 'houses' ? 'active' : ''} onClick={() => setActiveTab('houses')}>
          จัดการลูกบ้าน
        </button>
        <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
          ตั้งค่า
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'dashboard' && (
          <AdminDashboard villageId={session.villageId} refreshKey={refreshKey} onDataChange={refreshData} />
        )}
        {activeTab === 'meter' && (
          <AdminMeterEntry villageId={session.villageId} onSaved={refreshData} />
        )}
        {activeTab === 'houses' && (
          <AdminHouses villageId={session.villageId} onDataChange={refreshData} />
        )}
        {activeTab === 'settings' && (
          <AdminSettings villageId={session.villageId} onDataChange={refreshData} />
        )}
      </main>
    </div>
  );
}

function TopBar({ title, onLogout }) {
  return (
    <header className="top-bar">
      <div>
        <strong>ประปาหมู่บ้าน</strong>
        <span>{title}</span>
      </div>
      <button onClick={onLogout}>ออกจากระบบ</button>
    </header>
  );
}

export default App;
