export default function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div
      className="row-actions"
      style={{ justifyContent: 'center', alignItems: 'center', marginTop: 12 }}
    >
      <button className="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← ก่อนหน้า
      </button>
      <span className="muted">
        หน้า {page} จาก {totalPages}
      </span>
      <button className="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        ถัดไป →
      </button>
    </div>
  );
}
