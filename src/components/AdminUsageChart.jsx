import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getMonthlyUsageSummary } from '../utils/db';

export default function AdminUsageChart({ villageId, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getMonthlyUsageSummary(villageId)
      .then((result) => {
        if (mounted) setData(result);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'โหลดข้อมูลการใช้น้ำไม่สำเร็จ');
      });
    return () => {
      mounted = false;
    };
  }, [villageId, refreshKey]);

  return (
    <div className="panel">
      <div className="panel-title">
        <h2>ปริมาณการใช้น้ำรายเดือน</h2>
        <span>หน่วย</span>
      </div>

      {error && <div className="notice error">{error}</div>}

      {!data ? (
        <p className="muted">กำลังโหลดกราฟ...</p>
      ) : data.length === 0 ? (
        <p className="muted">ยังไม่มีข้อมูลการใช้น้ำ — ไปจดมิเตอร์อย่างน้อย 1 รอบก่อน</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`${value.toLocaleString()} หน่วย`, 'ปริมาณการใช้น้ำ']}
              labelStyle={{ fontWeight: 700 }}
            />
            <Bar dataKey="totalUnits" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
