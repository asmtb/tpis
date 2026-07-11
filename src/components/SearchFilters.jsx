import { PROVINCES, ASSET_TYPES } from '../lib/constants.js'

export default function SearchFilters({ filters, onChange, onApply, onReset }) {
  const set = (key, val) => onChange({ ...filters, [key]: val })

  return (
    <div className="search-filters">

      {/* จังหวัด */}
      <div className="filter-section">
        <div className="filter-label">จังหวัด</div>
        <select
          className="filter-select"
          value={filters.city}
          onChange={e => set('city', e.target.value)}
        >
          <option value="">ทุกจังหวัด</option>
          {PROVINCES.map(p => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* อำเภอ */}
      <div className="filter-section">
        <div className="filter-label">อำเภอ / เขต</div>
        <input
          type="text"
          className="filter-input"
          placeholder="พิมพ์ชื่ออำเภอ..."
          value={filters.ampur}
          onChange={e => set('ampur', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onApply()}
        />
      </div>

      <hr className="filter-divider" />

      {/* ประเภท */}
      <div className="filter-section">
        <div className="filter-label">ประเภททรัพย์</div>
        <div className="filter-types">
          {ASSET_TYPES.map(t => (
            <label key={t.id} className="filter-type-opt">
              <input
                type="radio"
                name="asset_type"
                value={t.id}
                checked={filters.asset_type_id === t.id}
                onChange={() => set('asset_type_id', t.id)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <hr className="filter-divider" />

      {/* ราคา */}
      <div className="filter-section">
        <div className="filter-label">ราคาประเมิน (บาท)</div>
        <div className="filter-price-row">
          <input
            type="text"
            className="filter-input"
            placeholder="ต่ำสุด"
            value={filters.price_min}
            onChange={e => set('price_min', e.target.value)}
          />
          <input
            type="text"
            className="filter-input"
            placeholder="สูงสุด"
            value={filters.price_max}
            onChange={e => set('price_max', e.target.value)}
          />
        </div>
        {/* Quick presets */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { label: '< 1M', max: '1000000' },
            { label: '< 3M', max: '3000000' },
            { label: '< 5M', max: '5000000' },
          ].map(pr => (
            <button
              key={pr.label}
              style={{
                padding: '3px 8px', fontSize: '0.72rem',
                border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                background: filters.price_max === pr.max ? 'var(--accent-lt)' : 'var(--bg)',
                color: filters.price_max === pr.max ? 'var(--accent)' : 'var(--text-3)',
                cursor: 'pointer', transition: 'all 0.13s',
              }}
              onClick={() => {
                set('price_max', filters.price_max === pr.max ? '' : pr.max)
              }}
            >{pr.label}</button>
          ))}
        </div>
      </div>

      <hr className="filter-divider" />

      {/* สถานะ */}
      <div className="filter-section">
        <div className="filter-label">สถานะ</div>
        <div className="filter-status-group">
          {[
            { id: 'all',    label: 'ทั้งหมด' },
            { id: 'open',   label: 'เปิดอยู่' },
            { id: 'closed', label: 'ปิดแล้ว' },
          ].map(s => (
            <button
              key={s.id}
              className={`filter-status-btn${filters.status === s.id ? ' active' : ''}`}
              onClick={() => set('status', s.id)}
            >{s.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button className="filter-apply-btn" onClick={onApply}>
          ค้นหา
        </button>
        <button className="filter-reset-btn" onClick={onReset}>
          ล้างทั้งหมด
        </button>
      </div>
    </div>
  )
}
