import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import LeafletMap from '../components/LeafletMap.jsx'
import { PROVINCES, ASSET_TYPES } from '../lib/constants.js'
import { fmtPriceFull, fmtArea, fmtLocation, typeLabel, statusInfo, typeClass } from '../lib/utils.js'

const DEFAULT_F = { city: '', asset_type_id: '', status: 'all' }
const DAY_MS = 86400000

export default function MapPage() {
  const [filters, setFilters]    = useState(DEFAULT_F)
  const [points, setPoints]      = useState([])
  const [loading, setLoading]    = useState(false)
  const [loaded, setLoaded]      = useState(false)
  const [selected, setSelected]  = useState(null)
  const [sameLocGroup, setSameLocGroup] = useState([])  // รายการพิกัดเดียวกัน
  const [total, setTotal]        = useState(0)

  const load = useCallback(async (f) => {
    setLoading(true); setSelected(null); setSameLocGroup([])
    try {
      let q = supabase
        .from('assets_map')
        .select(
          'id,city,ampur,tumbol,deedcity,deedampur,deedtumbol,' +
          'asset_type_id,asset_type_desc,appraisal_price,' +
          'rai,ngan,wa,reserve_fund,' +
          'is_sold,is_closed,latest_round_no,ischeck_date,' +
          'url_picture,latitude,longitude'
        )
        .not('latitude', 'is', null)
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

  useState(() => { load(DEFAULT_F) })

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }))
  const handleApply = () => load(filters)
  const handleReset = () => { setFilters(DEFAULT_F); load(DEFAULT_F) }

  /** เมื่อกด marker — หา asset ทั้งหมดที่พิกัดเดียวกัน */
  const handleMarkerClick = (p) => {
    if (selected?.id === p.id) {
      setSelected(null); setSameLocGroup([])
      return
    }
    // หา asset ที่ lat/lng ตรงกัน (ห้องชุดในตึกเดียวกัน)
    const group = points.filter(
      x => Math.abs(x.latitude - p.latitude) < 0.00001 &&
           Math.abs(x.longitude - p.longitude) < 0.00001
    )
    setSelected(p)
    setSameLocGroup(group.length > 1 ? group : [])
  }

  const isNew = (p) => p.ischeck_date &&
    (Date.now() - new Date(p.ischeck_date).getTime()) / DAY_MS <= 7

  const { cls: selStCls, label: selStLabel } = selected ? statusInfo(selected) : {}

  return (
    <div className="map-full">

      {/* Filter sidebar */}
      <div style={{
        width: 220, flexShrink: 0, background: 'var(--surface)',
        borderRight: '1px solid var(--border)', padding: '14px 12px',
        display: 'flex', flexDirection: 'column', gap: 14,
        overflowY: 'auto', zIndex: 10,
      }}>
        <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-3)',
          letterSpacing:'0.05em', textTransform:'uppercase' }}>แผนที่ทรัพย์</div>

        <div className="filter-section" style={{ border:'none' }}>
          <div className="filter-label">จังหวัด</div>
          <div className="filter-select-wrap">
            <select className="filter-select" value={filters.city}
              onChange={e => set('city', e.target.value)}>
              <option value="">ทุกจังหวัด</option>
              {PROVINCES.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="filter-section" style={{ border:'none' }}>
          <div className="filter-label">ประเภท</div>
          <div className="filter-select-wrap">
            <select className="filter-select" value={filters.asset_type_id}
              onChange={e => set('asset_type_id', e.target.value)}>
              {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="filter-section" style={{ border:'none' }}>
          <div className="filter-label">สถานะ</div>
          <div className="filter-status-group">
            {[['all','ทั้งหมด'],['open','เปิดประมูล'],['closed','ปิดแล้ว']].map(([id, lbl]) => (
              <button key={id}
                className={`filter-status-btn${filters.status === id ? ' active' : ''}`}
                onClick={() => set('status', id)}>{lbl}</button>
            ))}
          </div>
        </div>

        <button className="filter-apply-btn" onClick={handleApply} disabled={loading}>
          {loading ? 'กำลังโหลด...' : 'โหลดแผนที่'}
        </button>
        <button className="filter-reset-btn" onClick={handleReset}>ล้าง</button>

        {loaded && (
          <div style={{ fontSize:'0.78rem', color:'var(--text-3)', textAlign:'center' }}>
            {total.toLocaleString()} จุดบนแผนที่
          </div>
        )}

        {/* Legend */}
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:'auto' }}>
          <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-3)',
            letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:2 }}>สัญลักษณ์</div>
          {[
            { color:'#6EE7B7', label:'ใหม่ ≤7 วัน (N)',    text:'N',  textColor:'#065F46' },
            { color:'#10B981', label:'ยังไม่เคยประมูล',    text:'',   textColor:'' },
            { color:'#1A3A5C', label:'เปิดประมูลแล้ว',     text:'',   textColor:'' },
            { color:'#A8A29E', label:'ปิดแล้ว',            text:'',   textColor:'' },
            { color:'#B91C1C', label:'ขายแล้ว',            text:'',   textColor:'' },
          ].map(({ color, label, text, textColor }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:8,
              fontSize:'0.8rem', color:'var(--text-2)' }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:color,
                border:'1.5px solid rgba(255,255,255,0.5)', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:8, fontWeight:900, color:textColor }}>
                {text}
              </div>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex:1, position:'relative' }}>
        {loading && (
          <div style={{ position:'absolute', inset:0, background:'rgba(245,244,240,0.7)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:500 }}>
            <div className="dots"><span/><span/><span/></div>
          </div>
        )}

        <LeafletMap
          properties={points}
          selectedId={selected?.id}
          onMarkerClick={handleMarkerClick}
        />

        {/* Popup — single asset */}
        {selected && sameLocGroup.length === 0 && (
          <div style={{
            position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
            background:'var(--surface)', border:'1.5px solid var(--border)',
            borderRadius:'var(--r-lg)', padding:'14px 18px',
            boxShadow:'var(--sh-lg)', zIndex:1000,
            minWidth:300, maxWidth:440,
            display:'flex', gap:14, alignItems:'flex-start',
          }}>
            {selected.url_picture && (
              <img src={selected.url_picture} alt=""
                style={{ width:80, height:64, objectFit:'cover',
                  borderRadius:'var(--r-sm)', flexShrink:0 }}
                onError={e => e.target.style.display='none'}
              />
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                <span className={`type-badge ${typeClass(selected.asset_type_id)}`}>
                  {typeLabel(selected.asset_type_id)}
                </span>
                <span className={`status-badge ${selStCls}`}>{selStLabel}</span>
                {isNew(selected) && (
                  <span style={{ fontSize:'0.67rem', fontWeight:700, padding:'2px 6px',
                    borderRadius:4, background:'#6EE7B7', color:'#065F46' }}>NEW</span>
                )}
              </div>
              <div style={{ fontSize:'0.85rem', color:'var(--text-2)', marginBottom:4 }}>
                📍 {fmtLocation(selected) || '—'}
              </div>
              {/* พื้นที่ แทนราคาที่ดินกรมที่ดิน */}
              <div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--accent)', fontFamily:'var(--mono)' }}>
                {fmtArea(selected.rai, selected.ngan, selected.wa)}
              </div>
              <div style={{ fontSize:'0.78rem', color:'var(--text-3)', marginTop:2 }}>
                ราคาประเมิน {fmtPriceFull(selected.appraisal_price)}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
              <Link to={`/property/${selected.id}`}
                style={{ display:'block', padding:'7px 16px',
                  background:'var(--accent)', color:'#fff',
                  borderRadius:'var(--r-sm)', fontSize:'0.82rem',
                  fontWeight:700, textAlign:'center' }}>
                รายละเอียด
              </Link>
              <button onClick={() => { setSelected(null); setSameLocGroup([]) }}
                style={{ padding:'6px 16px', background:'none',
                  border:'1.5px solid var(--border)', borderRadius:'var(--r-sm)',
                  fontSize:'0.8rem', color:'var(--text-3)', cursor:'pointer' }}>
                ปิด
              </button>
            </div>
          </div>
        )}

        {/* Popup — หลาย asset พิกัดเดียวกัน (Option C) */}
        {selected && sameLocGroup.length > 1 && (
          <div style={{
            position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
            background:'var(--surface)', border:'1.5px solid var(--border)',
            borderRadius:'var(--r-lg)', padding:'14px 18px',
            boxShadow:'var(--sh-lg)', zIndex:1000,
            width:380, maxHeight:360, display:'flex', flexDirection:'column', gap:10,
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontWeight:700, fontSize:'0.9rem' }}>
                {sameLocGroup.length} รายการที่ตำแหน่งเดียวกัน
              </div>
              <button onClick={() => { setSelected(null); setSameLocGroup([]) }}
                style={{ background:'none', border:'none', color:'var(--text-3)',
                  fontSize:'1.1rem', cursor:'pointer', lineHeight:1 }}>✕</button>
            </div>

            <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
              {sameLocGroup.map(p => {
                const { cls, label } = statusInfo(p)
                return (
                  <div key={p.id} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'9px 12px', background:'var(--bg)',
                    border:'1.5px solid var(--border)', borderRadius:'var(--r)',
                  }}>
                    {p.url_picture && (
                      <img src={p.url_picture} alt=""
                        style={{ width:52, height:42, objectFit:'cover',
                          borderRadius:'var(--r-sm)', flexShrink:0 }}
                        onError={e => e.target.style.display='none'}
                      />
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', gap:5, marginBottom:2, flexWrap:'wrap' }}>
                        <span className={`type-badge ${typeClass(p.asset_type_id)}`}>
                          {typeLabel(p.asset_type_id)}
                        </span>
                        <span className={`status-badge ${cls}`}>{label}</span>
                        {isNew(p) && (
                          <span style={{ fontSize:'0.65rem', fontWeight:700, padding:'1px 5px',
                            borderRadius:3, background:'#6EE7B7', color:'#065F46' }}>NEW</span>
                        )}
                      </div>
                      <div style={{ fontSize:'0.8rem', color:'var(--text-2)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {fmtArea(p.rai, p.ngan, p.wa)}
                        <span style={{ marginLeft:8, color:'var(--text-3)', fontFamily:'var(--mono)', fontSize:'0.78rem' }}>
                          {fmtPriceFull(p.appraisal_price)}
                        </span>
                      </div>
                    </div>
                    <Link to={`/property/${p.id}`}
                      style={{ padding:'5px 12px', background:'var(--accent)', color:'#fff',
                        borderRadius:'var(--r-sm)', fontSize:'0.78rem', fontWeight:700,
                        flexShrink:0, whiteSpace:'nowrap' }}>
                      ดู
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
