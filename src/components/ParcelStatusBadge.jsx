const VERIFY_STATUS_LABEL = {
  matched: 'matched', partial_match: 'partial_match', not_verified: 'not_verified',
  manual: 'manual', mismatch: 'mismatch', not_found: 'not_found', error: 'error',
}

/**
 * Badge สถานะพิกัดของ parcel — ใช้ร่วมกันทั้งหน้า "จัดการโฉนด"
 * (AdminParcelsPage) และ modal "รายการใหม่" ของหน้า Crawler
 * (AdminCrawlerPage) ให้หน้าตา/สีเหมือนกันเป๊ะทุกที่
 *
 * ถ้าจะเพิ่ม/แก้ label หรือสีของสถานะใหม่ในอนาคต แก้ที่นี่ที่เดียว:
 *   - label: แก้ VERIFY_STATUS_LABEL ด้านบน
 *   - สี: แก้ .parcel-status-<status> ใน src/index.css
 */
export default function ParcelStatusBadge({ status }) {
  if (!status) return <span style={{ color: 'var(--text-3)' }}>—</span>
  return (
    <span className={`parcel-status parcel-status-${status}`}>
      {VERIFY_STATUS_LABEL[status] || status}
    </span>
  )
}
