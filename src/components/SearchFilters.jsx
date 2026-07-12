import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { PROVINCES, ASSET_TYPES } from '../lib/constants.js'

const CHEVRON = (open) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    className={`filter-section-chevron${open ? ' open' : ''}`}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="filter-section">
      <div className="filter-section-hd" onClick={() => setOpen(o => !o)}>
        <span className="filter-section-title">{title}</span>
        {CHEVRON(open)}
      </div>
      {open && <div className="filter-section-body">{children}</div>}
    </div>
  )
}

export default function SearchFilters({ filters, onChange, onApply, onReset }) {
  const [districts, setDistricts]     = useState([])
  const [loadingDist, setLoadingDist] = useState(false)

  const set = (k, v) => onChange({ ...filters, [k]: v })

  // โหลด districts เมื่อ province เปลี่ยน
  useEffect(() => {
    if (!filters.led_province_id) { setDistricts([]); return }
    setLoadingDist(true)
    supabase
      .from('th_provinces')
      .select('id')
      .eq('led_province_id', filters.led_province_id)
      .single()
      .then(({ data: prov }) => {
        if (!prov) { setLoadingDist(false); return }
        return supabase
          .from('th_districts')
          .select('id, name_th')
          .eq('province_id', prov.id)
          .order('name_th')
      })
      .then(res => {
        if (res?.data) setDistricts(res.data)
        setLoadingDist(false)
      })
      .catch(() => setLoadingDist(false))
  }, [filters.led_province_id])

  const handleProvinceChange = (e) => {
    const opt = e.target.selectedOptions[0]
    const ledId = opt.getAttribute('data-id') || ''
    const name  = opt.value
    onChange({ ...filters, city: name, led_province_id: ledId, ampur: '' })
  }

  return (
    <div className="search-sidebar">

      {/* ทำเล */}
      <Section title="📍 ทำเล">
        <div className="filter-select-wrap">
          <select
            className="filter-select"
            value={filters.city}
            onChange={handleProvinceChange}
          >
            <option value="" data-id="">ทุกจังหวัด</option>
            {PROVINCES.map(p => (
              <option key={p.id} value={p.name} data-id={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* District dropdown — ปรากฏเมื่อเลือกจังหวัดแล้ว */}
        {filters.led_province_id && (
          loadingDist
            ? <div className="filter-district-loading">
                <div className="dots" style={{ transform: 'scale(0.7)' }}>
                  <span/><span/><span/>
                </div>
                โหลดอำเภอ...
              </div>
            : <div className="filter-select-wrap">
                <select
                  className="filter-select"
                  value={filters.ampur}
                  onChange={e => set('ampur', e.target.value)}
                >
                  <option value="">ทุกอำเภอ</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.name_th}>{d.name_th}</option>
                  ))}
                </select>
              </div>
        )}
      </Section>

      {/* ประเภท */}
      <Section title="🏷 ประเภททรัพย์">
        <div className="filter-types">
          {ASSET_TYPES.map(t => (
            <label key={t.id} className="filter-type-opt">
              <input
                type="radio" name="asset_type" value={t.id}
                checked={filters.asset_type_id === t.id}
                onChange={() => set('asset_type_id', t.id)}
              />
              {t.label}
            </label>
          ))}
        </div>
      </Section>

      {/* ราคา */}
      <Section title="💰 ราคาประเมิน">
        <div className="filter-price-row">
          <input type="text" className="filter-input" placeholder="ต่ำสุด (฿)"
            value={filters.price_min} onChange={e => set('price_min', e.target.value)} />
          <input type="text" className="filter-input" placeholder="สูงสุด (฿)"
            value={filters.price_max} onChange={e => set('price_max', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[['<1M','1000000'],['<3M','3000000'],['<5M','5000000'],['<10M','10000000']].map(([lbl, val]) => (
            <button
              key={lbl}
              onClick={() => set('price_max', filters.price_max === val ? '' : val)}
              style={{
                padding: '3px 9px', fontSize: '0.75rem',
                border: '1.5px solid',
                borderColor: filters.price_max === val ? 'var(--accent)' : 'var(--border)',
                borderRadius: 'var(--r-sm)',
                background: filters.price_max === val ? 'var(--accent-lt)' : 'var(--bg)',
                color: filters.price_max === val ? 'var(--accent)' : 'var(--text-3)',
                cursor: 'pointer', transition: 'all 0.13s',
              }}
            >{lbl}</button>
          ))}
        </div>
      </Section>

      {/* สถานะ */}
      <Section title="📊 สถานะ">
        <div className="filter-status-group">
          {[['all','ทั้งหมด'],['open','เปิดอยู่'],['closed','ปิดแล้ว']].map(([id, lbl]) => (
            <button key={id}
              className={`filter-status-btn${filters.status === id ? ' active' : ''}`}
              onClick={() => set('status', id)}
            >{lbl}</button>
          ))}
        </div>
      </Section>

      {/* Actions */}
      <div className="filter-actions">
        <button className="filter-apply-btn" onClick={onApply}>ค้นหา</button>
        <button className="filter-reset-btn" onClick={onReset}>ล้างทั้งหมด</button>
      </div>
    </div>
  )
}
