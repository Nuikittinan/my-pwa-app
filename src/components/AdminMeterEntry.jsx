import { useEffect, useMemo, useState } from 'react';
import { fileToDataUrl, getAll, getSettings, saveMeterReading } from '../utils/db';
import { calculateWaterBill } from '../utils/calculate';

function toLocalDatetimeValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function AdminMeterEntry({ onSaved }) {
  const [houses, setHouses] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedHouseId, setSelectedHouseId] = useState('');
  const [currMeter, setCurrMeter] = useState('');
  const [meterImage, setMeterImage] = useState(null);
  const [recordedAt, setRecordedAt] = useState(() => toLocalDatetimeValue(new Date()));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getAll('houses'), getSettings()]).then(([houseList, billingSettings]) => {
      const sorted = [...houseList].sort((a, b) => a.houseNo.localeCompare(b.houseNo, 'th'));
      setHouses(sorted);
      setSettings(billingSettings);
      setSelectedHouseId(sorted[0]?.id || '');
    });
  }, []);

  const selectedHouse = houses.find((house) => house.id === selectedHouseId);
  const estimate = useMemo(() => {
    if (!selectedHouse || !settings) return null;
    const result = calculateWaterBill(selectedHouse.lastMeter, currMeter);
    if (result.error) return result;
    return {
      ...result,
      totalAmount: result.unitsUsed * settings.ratePerUnit + settings.baseFee,
      waterFee: result.unitsUsed * settings.ratePerUnit,
      baseFee: settings.baseFee,
    };
  }, [currMeter, selectedHouse, settings]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) setMeterImage(await fileToDataUrl(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const bill = await saveMeterReading({
        houseId: selectedHouseId,
        currMeter,
        meterImage,
        recordedAt,
      });
      setMessage(`บันทึกบิลบ้าน ${bill.house.houseNo} ยอด ${bill.amount.toLocaleString()} บาทแล้ว`);
      setCurrMeter('');
      setMeterImage(null);
      setRecordedAt(toLocalDatetimeValue(new Date()));
      const houseList = await getAll('houses');
      setHouses([...houseList].sort((a, b) => a.houseNo.localeCompare(b.houseNo, 'th')));
      onSaved();
    } catch (err) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="panel">กำลังโหลดข้อมูลบ้าน...</div>;

  return (
    <section className="stack">
      <div className="section-heading">
        <div>
          <h1>จดมิเตอร์และสร้างบิล</h1>
          <p>ระบบจะบันทึกลง IndexedDB และอัปเดตเลขมิเตอร์ล่าสุดของบ้านทันที</p>
        </div>
      </div>

      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>
          บ้านเลขที่
          <select value={selectedHouseId} onChange={(event) => setSelectedHouseId(event.target.value)}>
            {houses.map((house) => (
              <option key={house.id} value={house.id}>
                {house.houseNo} - {house.ownerName}
              </option>
            ))}
          </select>
        </label>

        {selectedHouse && (
          <div className="house-card">
            <strong>{selectedHouse.ownerName}</strong>
            <span>{selectedHouse.phone}</span>
            <span>เลขมิเตอร์ล่าสุด: {selectedHouse.lastMeter}</span>
          </div>
        )}

        <label>
          เลขมิเตอร์ปัจจุบัน
          <input
            type="number"
            min={selectedHouse?.lastMeter || 0}
            value={currMeter}
            onChange={(event) => setCurrMeter(event.target.value)}
            required
          />
        </label>

        <label>
          วันเวลาที่จดมิเตอร์
          <input
            type="datetime-local"
            value={recordedAt}
            onChange={(event) => setRecordedAt(event.target.value)}
            required
          />
        </label>

        <label>
          รูปมิเตอร์
          <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} />
        </label>

        {meterImage && <img className="preview-image" src={meterImage} alt="รูปมิเตอร์ที่เลือก" />}

        <div className="estimate">
          {estimate?.error ? (
            <span className="danger-text">{estimate.error}</span>
          ) : (
            <>
              <span>จำนวนหน่วย: <strong>{estimate?.unitsUsed || 0}</strong></span>
              <span>ค่าน้ำ: <strong>{(estimate?.waterFee || 0).toLocaleString()}</strong> บาท</span>
              <span>ค่าบริการ: <strong>{settings.baseFee.toLocaleString()}</strong> บาท</span>
              <span>รวมชำระ: <strong>{(estimate?.totalAmount || 0).toLocaleString()}</strong> บาท</span>
            </>
          )}
        </div>

        {error && <div className="notice error">{error}</div>}
        {message && <div className="notice success">{message}</div>}

        <button type="submit" disabled={saving || !selectedHouse}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกและสร้างบิล'}
        </button>
      </form>
    </section>
  );
}
