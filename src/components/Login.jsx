import { useEffect, useState } from 'react';
import { listVillages, loginAdmin, loginResident, signUpVillage } from '../utils/auth';

export default function Login({ onLoginSuccess }) {
  const [view, setView] = useState('login'); // 'login' | 'signup'
  const [villages, setVillages] = useState(null);
  const [villagesError, setVillagesError] = useState('');
  const [villageId, setVillageId] = useState('');
  const [mode, setMode] = useState('admin'); // 'admin' | 'user'
  const [idValue, setIdValue] = useState(''); // username หรือ เลขบ้าน
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadVillages = () => {
    listVillages()
      .then((list) => {
        setVillages(list);
        setVillageId((prev) => (prev && list.some((v) => v.id === prev) ? prev : list[0]?.id || ''));
      })
      .catch((err) => setVillagesError(err.message || 'โหลดรายชื่อหมู่บ้านไม่สำเร็จ'));
  };

  useEffect(() => {
    loadVillages();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!villageId) {
      setError('กรุณาเลือกหมู่บ้าน');
      return;
    }
    setLoading(true);
    try {
      const session =
        mode === 'admin'
          ? await loginAdmin(villageId, idValue, password)
          : await loginResident(villageId, idValue, password);
      onLoginSuccess(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'signup') {
    return (
      <SignupCard
        onBack={() => setView('login')}
        onSignedUp={(session) => {
          loadVillages();
          onLoginSuccess(session);
        }}
      />
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ color: '#fff', fontSize: 22, margin: '0 0 4px 0', textAlign: 'center' }}>
          💧 ประปาหมู่บ้าน
        </h1>
        <p style={{ color: '#999', margin: '0 0 20px 0', textAlign: 'center', fontSize: 14 }}>
          เข้าสู่ระบบเพื่อใช้งาน
        </p>

        <label style={labelStyle}>หมู่บ้าน</label>
        {villagesError ? (
          <div style={errorBoxStyle}>⚠️ {villagesError}</div>
        ) : (
          <select
            value={villageId}
            onChange={(e) => setVillageId(e.target.value)}
            style={inputStyle}
            disabled={!villages}
          >
            {!villages && <option>กำลังโหลด...</option>}
            {villages?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}

        {/* Tabs สลับโหมด */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#262626',
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setError('');
            }}
            style={tabStyle(mode === 'admin')}
          >
            👨‍💼 ผู้ดูแล
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('user');
              setError('');
            }}
            style={tabStyle(mode === 'user')}
          >
            🏠 ลูกบ้าน
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            {mode === 'admin' ? 'ชื่อผู้ใช้' : 'เลขที่บ้าน'}
          </label>
          <input
            type="text"
            value={idValue}
            onChange={(e) => setIdValue(e.target.value)}
            placeholder={mode === 'admin' ? 'admin' : 'เช่น 99/1'}
            required
            style={inputStyle}
          />

          <label style={labelStyle}>รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            required
            style={inputStyle}
          />

          {error && <div style={errorBoxStyle}>⚠️ {error}</div>}

          <button type="submit" disabled={loading || !villageId} style={submitStyle}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setView('signup');
            setError('');
          }}
          style={linkButtonStyle}
        >
          + สมัครหมู่บ้านใหม่
        </button>

        <p style={{ color: '#666', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
          {mode === 'admin'
            ? 'ทดลองใช้: admin / admin123'
            : 'ทดลองใช้: 99/1 / 1234'}
        </p>
      </div>
    </div>
  );
}

function SignupCard({ onBack, onSignedUp }) {
  const [villageName, setVillageName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (adminPassword !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setLoading(true);
    try {
      const session = await signUpVillage({ villageName, adminName, adminUsername, adminPassword });
      onSignedUp(session);
    } catch (err) {
      setError(err.message || 'สมัครไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ color: '#fff', fontSize: 22, margin: '0 0 4px 0', textAlign: 'center' }}>
          🏘️ สมัครหมู่บ้านใหม่
        </h1>
        <p style={{ color: '#999', margin: '0 0 20px 0', textAlign: 'center', fontSize: 14 }}>
          สร้างระบบประปาหมู่บ้านของคุณเอง พร้อมบัญชีผู้ดูแลคนแรก
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>ชื่อหมู่บ้าน</label>
          <input
            type="text"
            value={villageName}
            onChange={(e) => setVillageName(e.target.value)}
            placeholder="เช่น หมู่บ้านสวนทอง"
            required
            style={inputStyle}
          />

          <label style={labelStyle}>ชื่อผู้ดูแล (แสดงในแอป)</label>
          <input
            type="text"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="เช่น สมชาย ใจดี"
            required
            style={inputStyle}
          />

          <label style={labelStyle}>ชื่อผู้ใช้สำหรับเข้าสู่ระบบ</label>
          <input
            type="text"
            value={adminUsername}
            onChange={(e) => setAdminUsername(e.target.value)}
            placeholder="admin"
            required
            style={inputStyle}
          />

          <label style={labelStyle}>รหัสผ่าน</label>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="อย่างน้อย 4 ตัวอักษร"
            required
            style={inputStyle}
          />

          <label style={labelStyle}>ยืนยันรหัสผ่าน</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="พิมพ์รหัสผ่านอีกครั้ง"
            required
            style={inputStyle}
          />

          {error && <div style={errorBoxStyle}>⚠️ {error}</div>}

          <button type="submit" disabled={loading} style={submitStyle}>
            {loading ? 'กำลังสร้างหมู่บ้าน...' : 'สร้างหมู่บ้านและเข้าสู่ระบบ'}
          </button>
        </form>

        <button type="button" onClick={onBack} style={linkButtonStyle}>
          ← กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#121212',
  fontFamily: 'sans-serif',
  padding: 16,
  boxSizing: 'border-box',
};

const cardStyle = {
  width: '100%',
  maxWidth: 360,
  backgroundColor: '#1a1a1a',
  borderRadius: 16,
  padding: 28,
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};

const tabStyle = (active) => ({
  flex: 1,
  padding: '8px 0',
  border: 'none',
  borderRadius: 8,
  backgroundColor: active ? '#007bff' : 'transparent',
  color: active ? '#fff' : '#aaa',
  fontWeight: active ? 'bold' : 'normal',
  cursor: 'pointer',
  fontSize: 14,
});

const labelStyle = {
  display: 'block',
  color: '#ccc',
  fontSize: 13,
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: 16,
  borderRadius: 8,
  border: '1px solid #333',
  backgroundColor: '#0f0f0f',
  color: '#fff',
  fontSize: 15,
  boxSizing: 'border-box',
};

const errorBoxStyle = {
  color: '#f28b82',
  backgroundColor: '#3a1f1f',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 13,
  marginBottom: 12,
};

const submitStyle = {
  width: '100%',
  padding: '12px 0',
  borderRadius: 8,
  border: 'none',
  backgroundColor: '#007bff',
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 15,
  cursor: 'pointer',
};

const linkButtonStyle = {
  width: '100%',
  padding: '10px 0',
  marginTop: 12,
  borderRadius: 8,
  border: 'none',
  backgroundColor: 'transparent',
  color: '#5b9dff',
  fontSize: 14,
  cursor: 'pointer',
};
