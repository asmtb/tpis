import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import LeafletMap from '../components/LeafletMap.jsx'
import { PROVINCES, ASSET_TYPES } from '../lib/constants.js'
import { fmtPrice, typeLabel, statusInfo } from '../lib/utils.js'

const DEFAULT_F = { city: '', asset_type_id: '', status: 'all' }

export default function MapPage() {
  const [filters, setFilters]   = useState(DEFAULT_F)
  const [points, setPoints]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [loaded, setLoaded]     = useState(false)
  const [selected, setSelected] = useState(null)
  const [total, setTotal]       = useState(0)

  const load = useCallback(async (f) => {
    setLoading(true)
    setSelected(null)
    try {
      let q = supabase
        .from('assets_map')
        .select('id, city, ampur, tumbol, asset_type_id, asset_type_desc, appraisal_price, reserve_fund, is_sold, is_closed, latest_round_no, latest_status, url_picture, latitude, longitude, land_price_per_sqw')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(2000)

      if (f.city)          q = q.eq('city', f.city)
      if (f.asset_type_id) q = q.eq('asset_type_id', f.asset_type_id)
      if (f.status === 'open')   q = q.eq('is_closed', false)
      if (f.status === 'closed') q = q.eq('is_closed', true)

      const { data, error } = await q
      if (error) throw error
      setPoints(data || [])
      setTotal(data?.length || 0)
      setLoaded(true)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // โหลดครั้งแรกอัตโนมัติ
  useState(() => { load(DEFAULT_F) })

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const handleApply = () => load(filters)
  const handleReset = () => { setFilters(DEFAULT_F); load(DEFAULT_F) }

  const { cls: selStCls, label: selStLabel } = selected ? statusInfo(selected) : {}

  return (
    <div className="map-full" style={{ display: 'flex' }}>

      {/* Left filter strip */}
      <div style={{
        width: 220, flexShrink: 0, background: 'var(--surface)',
        borderRight: '1px solid var(--border)', padding: '14px 12px',
        display: 'flex', flexDirection: 'column', gap: 14,
        overflowY: 'auto', zIndex: 10,
      }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          แผนที่ทรัพย์
        </div>

        {/* จังหวัด */}
        <div className="filter-section">
          <div className="filter-label">จังหวัด</div>
          <select className="filter-select" value={filters.city}
            onChange={e => set('city', e.target.value)}>
            <option value="">ทุกจังหวัด</option>
            {PROVINCES.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>

        {/* ประเภท */}
        <div className="filter-section">
          <div className="filter-label">ประเภท</div>
          <select className="filter-select" value={filters.asset_type_id}
            onChange={e => set('asset_type_id', e.target.value)}>
            {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        {/* สถานะ */}
        <div className="filter-section">
          <div className="filter-label">สถานะ</div>
          <div className="filter-status-group">
            {[['all','ทั้งหมด'],['open','เปิดอยู่'],['closed','ปิดแล้ว']].map(([id, lbl]) => (
              <button key={id}
                className={`filter-status-btn${filters.status === id ? ' active' : ''}`}
                onClick={() => set('status', id)}
              >{lbl}</button>
            ))}
          </div>
        </div>

        <button className="filter-apply-btn" onClick={handleApply} disabled={loading}>
          {loading ? 'กำลังโหลด...' : 'โหลดแผนที่'}
        </button>
        <button className="filter-reset-btn" onClick={handleReset}>ล้าง</button>

        {loaded && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center' }}>
            {total.toLocaleString()} จุดบนแผนที่
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>สัญลักษณ์</div>
          {[
            { color: '#1A3A5C', label: 'เปิดประมูล' },
            { color: '#A8A29E', label: 'ปิดแล้ว' },
            { color: '#B91C1C', label: 'ขายแล้ว' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-2)' }}>
              <svg width="12" height="12"><circle cx="6" cy="6" r="5" fill={color} stroke="white" strokeWidth="1.5"/></svg>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(245,244,240,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
          }}>
            <div className="dots"><span/><span/><span/></div>
          </div>
        )}

        <LeafletMap
          properties={points}
          selectedId={selected?.id}
          onMarkerClick={p => setSelected(prev => prev?.id === p.id ? null : p)}
        />

        {/* Selected property popup */}
        {selected && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: '14px 18px',
            boxShadow: 'var(--sh-lg)', zIndex: 1000,
            minWidth: 300, maxWidth: 420,
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            {selected.url_picture && (
              <img src={selected.url_picture} alt=""
                style={{ width: 72, height: 56, objectFit: 'cover', borderRadius: 'var(--r-sm)', flexShrink: 0 }}
                onError={e => e.target.style.display='none'}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className={`type-badge ${selected.asset_type_id === '001' ? 't001' : selected.asset_type_id === '002' ? 't002' : selected.asset_type_id === '003' ? 't003' : 't_x'}`}>
                  {typeLabel(selected.asset_type_id)}
                </span>
                <span className={`status-badge ${selStCls}`}>{selStLabel}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>
                {[selected.ampur, selected.city].filter(Boolean).join(', ')}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                {fmtPrice(selected.assetprice3)}
              </div>
              {selected.land_price_per_sqw > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2 }}>
                  ราคาที่ดิน {fmtPrice(selected.land_price_per_sqw)}/ตร.วา
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <Link
                to={`/property/${selected.id}`}
                style={{
                  display: 'block', padding: '6px 14px', background: 'var(--accent)',
                  color: '#fff', borderRadius: 'var(--r-sm)', fontSize: '0.82rem',
                  fontWeight: 600, textAlign: 'center',
                }}
              >
                รายละเอียด
              </Link>
              <button
                onClick={() => setSelected(null)}
                style={{
                  padding: '5px 14px', background: 'none', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', fontSize: '0.8rem', color: 'var(--text-3)',
                  cursor: 'pointer',
                }}
              >ปิด</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
