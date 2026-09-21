import { useEffect, useState } from 'react';
import { addAdminAccount, deleteAdminAccount, getAdmins } from '../utils/db';

const emptyForm = { username: '', password: '', name: '', role: 'meter_reader' };

export default function AdminUsers({ villageId, currentUsername }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getAdmins(villageId)
      .then(setAdmins)
      .catch((err) => setError(err.message || 'โหลดรายชื่อผู้ใช้งานไม่สำเร็จ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [villageId]);

  const handleChange = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await addAdminAccount(villageId, form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message || 'เพิ่มผู้ใช้งานไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin) => {
    const ok = window.confirm(`ลบบัญชี "${admin.username}" (${admin.name})?`);
    if (!ok) return;
    setError('');
    try {
      await deleteAdminAccount(villageId, admin.id);
      load();
    } catch (err) {
      setError(err.message || 'ลบไม่สำเร็จ');
    }
  };

  return (
    <section className="stack">
      <div className="section-heading">
        <div>
          <h1>จัดการผู้ใช้งาน</h1>
          <p>
            เพิ่มบัญชี "พนักงานจดมิเตอร์" ที่เข้าได้แค่หน้าจดมิเตอร์อย่างเดียว
            ไม่เห็นข้อมูลเงินหรือแก้ไขการตั้งค่า
          </p>
        </div>
      </div>

      <form className="panel form-grid" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <h2>เพิ่มบัญชีใหม่</h2>

        <label>
          ชื่อที่แสดงในแอป
          <input value={form.name} onChange={handleChange('name')} required />
        </label>

        <label>
          ชื่อผู้ใช้สำหรับ login
          <input value={form.username} onChange={handleChange('username')} required />
        </label>

        <label>
          รหัสผ่าน
          <input
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            placeholder="อย่างน้อย 4 ตัวอักษร"
            required
          />
        </label>

        <label>
          สิทธิ์การใช้งาน
          <select value={form.role} onChange={handleChange('role')}>
            <option value="meter_reader">พนักงานจดมิเตอร์ (เข้าได้แค่หน้าจดมิเตอร์)</option>
            <option value="admin">ผู้ดูแลเต็มสิทธิ์ (เข้าได้ทุกหน้า)</option>
          </select>
        </label>

        {error && <div className="notice error">{error}</div>}

        <button type="submit" disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'เพิ่มบัญชี'}
        </button>
      </form>

      <div className="panel">
        <div className="panel-title">
          <h2>บัญชีผู้ใช้งานทั้งหมด</h2>
          <span>{admins.length} คน</span>
        </div>

        {loading ? (
          <p className="muted">กำลังโหลด...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>ชื่อผู้ใช้</th>
                  <th>สิทธิ์</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.name}</td>
                    <td>
                      {admin.username}
                      {admin.username === currentUsername && (
                        <span className="muted"> (คุณ)</span>
                      )}
                    </td>
                    <td>{admin.role === 'meter_reader' ? 'พนักงานจดมิเตอร์' : 'ผู้ดูแลเต็มสิทธิ์'}</td>
                    <td>
                      <button style={{ background: '#ef4444' }} onClick={() => handleDelete(admin)}>
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty">
                      ยังไม่มีบัญชีผู้ใช้งาน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
