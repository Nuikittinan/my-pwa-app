import { useState } from 'react';
import { loginAdmin, loginResident } from '../utils/auth';

export default function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState('admin'); // 'admin' | 'user'
  const [idValue, setIdValue] = useState(''); // username หรือ เลขบ้าน
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session =
        mode === 'admin'
          ? await loginAdmin(idValue, password)
          : await loginResident(idValue, password);
      onLoginSuccess(session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#121212',
        fontFamily: 'sans-serif',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: '#1a1a1a',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        <h1 style={{ color: '#fff', fontSize: 22, margin: '0 0 4px 0', textAlign: 'center' }}>
          💧 ประปาหมู่บ้าน
        </h1>
        <p style={{ color: '#999', margin: '0 0 20px 0', textAlign: 'center', fontSize: 14 }}>
          เข้าสู่ระบบเพื่อใช้งาน
        </p>

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

          {error && (
            <div
              style={{
                color: '#f28b82',
                backgroundColor: '#3a1f1f',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={submitStyle}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p style={{ color: '#666', fontSize: 12, textAlign: 'center', marginTop: 18 }}>
          {mode === 'admin'
            ? 'ทดลองใช้: admin / admin123'
            : 'ทดลองใช้: 99/1 / 1234'}
        </p>
      </div>
    </div>
  );
}

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
