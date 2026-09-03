import { pageBtns } from '../lib/pagination.js'

/**
 * Pagination bar — reuse ระหว่าง SearchPage และ WishlistPage
 * ซ่อนตัวเองถ้ามีแค่หน้าเดียว หรือกำลังโหลดอยู่
 */
export default function Pagination({ page, totalPages, onPageChange, loading = false }) {
  if (loading || totalPages <= 1) return null

  const go = (p) => {
    onPageChange(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="pagination" style={{ padding: '20px 0' }}>
      <button className="pg-btn" onClick={() => go(page - 1)} disabled={page === 1}>←</button>
      {pageBtns(page, totalPages).map((n, i) =>
        n === '…'
          ? <span key={`e${i}`} style={{ padding: '5px 4px', color: 'var(--text-3)' }}>…</span>
          : <button key={n} className={`pg-btn${n === page ? ' active' : ''}`}
              onClick={() => go(n)}>{n}</button>
      )}
      <button className="pg-btn" onClick={() => go(page + 1)} disabled={page === totalPages}>→</button>
    </div>
  )
}
