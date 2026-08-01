import { useState } from 'react'
import { PROVINCES, ASSET_TYPES } from '../lib/constants.js'
import { useGeoFilter } from '../hooks/useGeoFilter.js'

/** Horizontal filter bar — แทน sidebar */
export default function SearchFilters({ filters, onChange, onApply, onReset }) {
  const { districts, subdistricts, loadingDist, loadingSub } =
    useGeoFilter(filters.led_province_id, filters.district_id)

  const set = (k, v) => onChange({ ...filters, [k]: v })

  const handleProvinceChange = (e) => {
    const opt = e.target.selectedOptions[0]
    onChange({
      ...filters,
      city: opt.value,
      led_province_id: opt.getAttribute('data-id') || '',
      ampur: '', district_id: '', tumbol: '',
    })
  }
  const handleDistrictChange = (e) => {
    const opt = e.target.selectedOptions[0]
    onChange({ ...filters, ampur: opt.value, district_id: opt.getAttribute('data-id') || '', tumbol: '' })
  }

  return (
    <div className="filter-bar">
      {/* จังหวัด */}
      <select
        className={`filter-bar-select${filters.city ? ' active' : ''}`}
        value={filters.city}
        onChange={handleProvinceChange}
      >
        <option value="" data-id="">🏙 ทุกจังหวัด</option>
        {PROVINCES.map(p => (
          <option key={p.id} value={p.name} data-id={p.id}>{p.name}</option>
        ))}
      </select>

      {/* อำเภอ */}
      {filters.led_province_id && !loadingDist && (
        <select
          className={`filter-bar-select${filters.ampur ? ' active' : ''}`}
          value={filters.ampur}
          onChange={handleDistrictChange}
        >
          <option value="" data-id="">ทุกอำเภอ</option>
          {districts.map(d => (
            <option key={d.id} value={d.name_th} data-id={d.id}>{d.name_th}</option>
          ))}
        </select>
      )}
      {filters.led_province_id && loadingDist && (
        <span style={{ fontSize:'0.78rem', color:'var(--text-3)' }}>โหลดอำเภอ...</span>
      )}

      {/* ตำบล */}
      {filters.district_id && !loadingSub && (
        <select
          className={`filter-bar-select${filters.tumbol ? ' active' : ''}`}
          value={filters.tumbol}
          onChange={e => set('tumbol', e.target.value)}
        >
          <option value="">ทุกตำบล</option>
          {subdistricts.map(s => (
            <option key={s.id} value={s.name_th}>{s.name_th}</option>
          ))}
        </select>
      )}

      {/* ประเภท */}
      <select
        className={`filter-bar-select${filters.asset_type_id ? ' active' : ''}`}
        value={filters.asset_type_id}
        onChange={e => set('asset_type_id', e.target.value)}
      >
        {ASSET_TYPES.map(t => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>

      {/* ราคา */}
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <input
          type="text" placeholder="ราคาต่ำสุด"
          className="filter-bar-select"
          style={{ width:100, borderRadius:20 }}
          value={filters.price_min}
          onChange={e => set('price_min', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onApply()}
        />
        <span style={{ color:'var(--text-3)', fontSize:'0.8rem' }}>-</span>
        <input
          type="text" placeholder="ราคาสูงสุด"
          className="filter-bar-select"
          style={{ width:100, borderRadius:20 }}
          value={filters.price_max}
          onChange={e => set('price_max', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onApply()}
        />
      </div>

      {/* ราคา presets */}
      {[['< 1M','1000000'],['< 3M','3000000'],['< 5M','5000000']].map(([lbl,val]) => (
        <button
          key={lbl}
          className={`chip${filters.price_max === val ? ' active' : ''}`}
          style={{ padding:'5px 10px', borderRadius:20, fontSize:'0.78rem' }}
          onClick={() => set('price_max', filters.price_max === val ? '' : val)}
        >{lbl}</button>
      ))}

      {/* สถานะ */}
      <select
        className={`filter-bar-select${filters.status !== 'all' ? ' active' : ''}`}
        value={filters.status}
        onChange={e => set('status', e.target.value)}
      >
        <option value="all">ทุกสถานะ</option>
        <option value="open">เปิดประมูล</option>
        <option value="today">ประมูลวันนี้</option>
        <option value="closed">ปิดแล้ว</option>
      </select>

      {/* Actions */}
      <button className="filter-apply-btn"
        style={{ padding:'6px 16px', borderRadius:20, fontSize:'0.82rem', whiteSpace:'nowrap', flexShrink:0 }}
        onClick={onApply}>
        ค้นหา
      </button>
      {/* ล้าง — แสดงเมื่อมี filter */}
      {(filters.city || filters.asset_type_id || filters.price_max || filters.price_min || filters.status !== 'all') && (
        <button
          onClick={onReset}
          style={{
            padding:'6px 12px', borderRadius:20, fontSize:'0.78rem',
            border:'1.5px solid var(--border)', background:'none',
            color:'var(--text-3)', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap',
          }}>
          ล้างทั้งหมด
        </button>
      )}
    </div>
  )
}
