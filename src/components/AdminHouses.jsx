import { useEffect, useState } from 'react';
import { addHouse, deleteHouse, fileToDataUrl, getAll, updateHouse } from '../utils/db';

const emptyForm = { houseNo: '', ownerName: '', phone: '', password: '', lastMeter: 0, meterImage: null };

export default function AdminHouses({ villageId, onDataChange }) {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  const loadHouses = () => {
    setLoading(true);
    getAll(villageId, 'houses')
      .then((list) => setHouses([...list].sort((a, b) => a.houseNo.localeCompare(b.houseNo, 'th'))))
      .catch((err) => setError(err.message || 'โหลดรายชื่อบ้านไม่สำเร็จ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [villageId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
  };

  const handleChange = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setForm((prev) => ({ ...prev, meterImage: dataUrl }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!editingId && !form.meterImage) {
      setError('กรุณาแนบรูปมิเตอร์ตั้งต้นของบ้านนี้ด้วย');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateHouse(villageId, editingId, { ...form, initialMeterImage: form.meterImage });
      } else {
        await addHouse(villageId, { ...form, initialMeterImage: form.meterImage });
      }
      resetForm();
      loadHouses();
      onDataChange?.();
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (house) => {
    setEditingId(house.id);
    setForm({
      houseNo: house.houseNo,
      ownerName: house.ownerName,
      phone: house.phone || '',
      password: '',
      lastMeter: house.lastMeter,
      meterImage: house.initialMeterImage || null,
    });
    setError('');
  };

  const handleDelete = async (house) => {
    const ok = window.confirm(
      `ลบบ้านเลขที่ ${house.houseNo} (${house.ownerName})? ประวัติบิลของบ้านนี้จะถูกลบไปด้วย`
    );
    if (!ok) return;
    try {
      await deleteHouse(villageId, house.id);
      if (editingId === house.id) resetForm();
      loadHouses();
      onDataChange?.();
    } catch (err) {
      setError(err.message || 'ลบไม่สำเร็จ');
    }
  };

  return (
    <section className="stack">
      <div className="section-heading">
        <div>
          <h1>จัดการลูกบ้าน</h1>
          <p>เพิ่ม แก้ไข หรือลบรายชื่อบ้านในระบบ — ไม่ต้องเข้า Supabase โดยตรง</p>
        </div>
      </div>

      <form className="panel form-grid" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <h2>{editingId ? 'แก้ไขบ้าน' : 'เพิ่มบ้านใหม่'}</h2>

        <label>
          เลขที่บ้าน
          <input value={form.houseNo} onChange={handleChange('houseNo')} required />
        </label>

        <label>
          ชื่อเจ้าของบ้าน
          <input value={form.ownerName} onChange={handleChange('ownerName')} required />
        </label>

        <label>
          เบอร์โทร
          <input value={form.phone} onChange={handleChange('phone')} placeholder="ไม่บังคับ" />
        </label>

        <label>
          รหัสผ่าน (สำหรับลูกบ้าน login)
          <input
            value={form.password}
            onChange={handleChange('password')}
            placeholder={editingId ? 'เว้นว่างไว้ถ้าไม่เปลี่ยน' : 'ค่าเริ่มต้น 1234'}
          />
        </label>

        <label>
          เลขมิเตอร์เริ่มต้น / ล่าสุด
          <input
            type="number"
            value={form.lastMeter}
            onChange={handleChange('lastMeter')}
            required
          />
        </label>

        <label>
          รูปมิเตอร์ตั้งต้น {!editingId && <span style={{ color: '#ef4444' }}>*จำเป็น</span>}
          <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} />
        </label>

        {form.meterImage && (
          <img className="preview-image" src={form.meterImage} alt="รูปมิเตอร์ตั้งต้นที่เลือก" />
        )}

        {error && <div className="notice error">{error}</div>}

        <div className="row-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มบ้าน'}
          </button>
          {editingId && (
            <button type="button" className="secondary" onClick={resetForm}>
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      <div className="panel">
        <div className="panel-title">
          <h2>รายชื่อบ้านทั้งหมด</h2>
          <span>{houses.length} หลัง</span>
        </div>

        {loading ? (
          <p className="muted">กำลังโหลด...</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>บ้าน</th>
                  <th>เบอร์โทร</th>
                  <th>เลขมิเตอร์ล่าสุด</th>
                  <th>รูปมิเตอร์ตั้งต้น</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {houses.map((house) => (
                  <tr key={house.id}>
                    <td>
                      <strong>{house.houseNo}</strong>
                      <small>{house.ownerName}</small>
                    </td>
                    <td>{house.phone || <span className="muted">ไม่มี</span>}</td>
                    <td>{house.lastMeter}</td>
                    <td>
                      {house.initialMeterImage ? (
                        <button
                          type="button"
                          onClick={() => setViewingImage(house.initialMeterImage)}
                          style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                        >
                          <img
                            src={house.initialMeterImage}
                            alt="รูปมิเตอร์ตั้งต้น"
                            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                          />
                        </button>
                      ) : (
                        <span className="muted">ไม่มี</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="secondary" onClick={() => handleEdit(house)}>
                          แก้ไข
                        </button>
                        <button
                          style={{ background: '#ef4444' }}
                          onClick={() => handleDelete(house)}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {houses.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty">
                      ยังไม่มีบ้านในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingImage && (
        <div
          onClick={() => setViewingImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div style={{ maxWidth: '92vw', maxHeight: '92vh', textAlign: 'center' }}>
            <img
              src={viewingImage}
              alt="รูปมิเตอร์ตั้งต้น (ขนาดเต็ม)"
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 10 }}
            />
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              style={{ marginTop: 14, padding: '8px 20px' }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
