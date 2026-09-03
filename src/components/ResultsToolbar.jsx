/* ── Icons ── */
const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)
const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)
const IconMapCards = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6"/>
    <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
)

export const PAGE_SIZE_OPTIONS = [20, 40]

/**
 * Toolbar: page size selector + sort (optional) + view mode toggle
 * reuse ระหว่าง SearchPage และ WishlistPage — sortOptions ไม่ใส่ก็ได้ถ้า
 * หน้านั้นไม่ต้องการตัวเลือก sort (dropdown จะไม่ render เลย)
 */
export default function ResultsToolbar({
  pageSize, onPageSize,
  sort, sortOptions, onSort,
  viewMode, onViewMode,
}) {
  return (
    <div className="results-bar-right">
      <select className="sort-select" value={pageSize}
        onChange={e => onPageSize(Number(e.target.value))}>
        {PAGE_SIZE_OPTIONS.map(n => (
          <option key={n} value={n}>{n}/หน้า</option>
        ))}
      </select>

      {sortOptions && (
        <select className="sort-select" value={sort}
          onChange={e => onSort(e.target.value)}>
          {sortOptions.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      )}

      <div className="view-toggle">
        <button className={`view-btn${viewMode === 'grid' ? ' active' : ''}`}
          onClick={() => onViewMode('grid')} title="Grid">
          <IconGrid/>
        </button>
        <button className={`view-btn${viewMode === 'list' ? ' active' : ''}`}
          onClick={() => onViewMode('list')} title="List">
          <IconList/>
        </button>
        <button className={`view-btn${viewMode === 'map' ? ' active' : ''}`}
          onClick={() => onViewMode('map')} title="Map + Cards">
          <IconMapCards/>
        </button>
      </div>
    </div>
  )
}
