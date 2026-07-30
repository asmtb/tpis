import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import LeafletMap from '../components/LeafletMap.jsx'
import { PROVINCES, ASSET_TYPES } from '../lib/constants.js'
import { fmtPriceFull, fmtArea, fmtLocation, typeLabel, statusInfo, typeClass } from '../lib/utils.js'
import { useGeoFilter } from '../hooks/useGeoFilter.js'

const DAY_MS = 86400000

const DEFAULT_F = {
  city: '', led_province_id: '', ampur: '', district_id: '', tumbol: '',
  asset_type_id: '', price_min: '', price_max: '',
  status: 'all', isNew: false, notAuctioned: false,
}

export default function MapPage() {
  const [filters, setFilters]    = useState(DEFAULT_F)
  const [points, setPoints]      = useState([])
  const [loading, setLoading]    = useState(false)
  const [loaded, setLoaded]      = useState(false)
  const [selected, setSelected]  = useState(null)
  const [sameLocGroup, setSameLocGroup] = useState([])
  const [total, setTotal]        = useState(0)

  const { districts, subdistricts, loadingDist, loadingSub } =
    useGeoFilter(filters.led_province_id, filters.district_id)

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const handleProvinceChange = (e) => {
    const opt = e.target.selectedOptions[0]
    setFilters(f => ({ ...f,
      city: opt.value, led_province_id: opt.getAttribute('data-id') || '',
      ampur: '', district_id: '', tumbol: '',
    }))
  }
  const handleDistrictChange = (e) => {
    const opt = e.target.selectedOptions[0]
    setFilters(f => ({ ...f,
      ampur: opt.value, district_id: opt.getAttribute('data-id') || '', tumbol: '',
    }))
  }

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

      if (f.city)          q = q.or(`city.eq.${f.city},deedcity.eq.${f.city}`)
      if (f.ampur)         q = q.or(`ampur.eq.${f.ampur},deedampur.eq.${f.ampur}`)
      if (f.tumbol)        q = q.or(`tumbol.eq.${f.tumbol},deedtumbol.eq.${f.tumbol}`)
      if (f.asset_type_id) q = q.eq('asset_type_id', f.asset_type_id)
      if (f.price_min)     q = q.gte('appraisal_price', parseFloat(f.price_min.replace(/,/g,'')))
      if (f.price_max)     q = q.lte('appraisal_price', parseFloat(f.price_max.replace(/,/g,'')))
      if (f.status === 'open')   q = q.eq('is_closed', false)
      if (f.status === 'closed') q = q.eq('is_closed', true)
      if (f.notAuctioned)  q = q.is('latest_round_no', null)
      if (f.isNew) {
        const d = new Date(Date.now() - 7 * DAY_MS).toISOString().slice(0, 10)
        q = q.gte('ischeck_date', d)
      }

      const { data, error } = await q
      if (error) throw error
      setPoints(data || [])
      setTotal(data?.length || 0)
      setLoaded(true)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useState(() => { load(DEFAULT_F) })

  const handleApply = () => load(filters)
  const handleReset = () => { setFilters(DEFAULT_F); load(DEFAULT_F) }

  const handleMarkerClick = (p) => {
    if (selected?.id === p.id) { setSelected(null); setSameLocGroup([]); return }
    const group = points.filter(
      x => Math.abs(x.latitude  - p.latitude)  < 0.00001 &&
           Math.abs(x.longitude - p.longitude) < 0.00001
    )
    setSelected(p)
    setSameLocGroup(group.length > 1 ? group : [])
  }

  const isNewPin = (p) => p.ischeck_date &&
    (Date.now() - new Date(p.ischeck_date).getTime()) / DAY_MS <= 7

  const { cls: selStCls, label: selStLabel } = selected ? statusInfo(selected) : {}

  const Loading = () => (
    <div className="filter-district-loading">
      <div className="dots" style={{ transform:'scale(0.7)' }}><span/><span/><span/></div>
      กำลังโหลด...
    </div>
  )

  return (
    <div className="map-full">

      {/* Filter sidebar */}
      <div style={{
        width:228, flexShrink:0, background:'var(--surface)',
        borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column', gap:0,
        overflowY:'auto', zIndex:10,
      }}>
        {/* Header */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)',
          fontSize:'0.78rem', fontWeight:700, color:'var(--text-3)',
          letterSpacing:'0.05em', textTransform:'uppercase' }}>
          แผนที่ทรัพย์
        </div>

        {/* ทำเล */}
        <div style={{ padding:'0 14px 12px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:7, paddingTop:12 }}>
          <div className="filter-section-title">📍 ทำเล</div>

          {/* จังหวัด */}
          <div className="filter-select-wrap">
            <select className="filter-select" value={filters.city}
              onChange={handleProvinceChange}>
              <option value="" data-id="">ทุกจังหวัด</option>
              {PROVINCES.map(p => (
                <option key={p.id} value={p.name} data-id={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* อำเภอ */}
          {filters.led_province_id && (
            loadingDist ? <Loading /> : (
              <div className="filter-select-wrap">
                <select className="filter-select" value={filters.ampur}
                  onChange={handleDistrictChange}>
                  <option value="" data-id="">ทุกอำเภอ</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.name_th} data-id={d.id}>{d.name_th}</option>
                  ))}
                </select>
              </div>
            )
          )}

          {/* ตำบล */}
          {filters.district_id && (
            loadingSub ? <Loading /> : (
              <div className="filter-select-wrap">
                <select className="filter-select" value={filters.tumbol}
                  onChange={e => set('tumbol', e.target.value)}>
                  <option value="">ทุกตำบล</option>
                  {subdistricts.map(s => (
                    <option key={s.id} value={s.name_th}>{s.name_th}</option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>

        {/* ประเภท */}
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:7 }}>
          <div className="filter-section-title">🏷 ประเภท</div>
          <div className="filter-select-wrap">
            <select className="filter-select" value={filters.asset_type_id}
              onChange={e => set('asset_type_id', e.target.value)}>
              {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* ราคา */}
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:7 }}>
          <div className="filter-section-title">💰 ราคาประเมิน</div>
          <div className="filter-price-row">
            <input type="text" className="filter-input" placeholder="ต่ำสุด"
              value={filters.price_min} onChange={e => set('price_min', e.target.value)} />
            <input type="text" className="filter-input" placeholder="สูงสุด"
              value={filters.price_max} onChange={e => set('price_max', e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {[['<1M','1000000'],['<3M','3000000'],['<5M','5000000']].map(([lbl,val]) => (
              <button key={lbl} onClick={() => set('price_max', filters.price_max===val?'':val)}
                style={{
                  padding:'3px 8px', fontSize:'0.72rem', cursor:'pointer',
                  border:'1.5px solid', borderRadius:'var(--r-sm)', transition:'all 0.13s',
                  borderColor: filters.price_max===val?'var(--accent)':'var(--border)',
                  background:  filters.price_max===val?'var(--accent-lt)':'var(--bg)',
                  color:       filters.price_max===val?'var(--accent)':'var(--text-3)',
                }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* สถานะ */}
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:7 }}>
          <div className="filter-section-title">📊 สถานะ</div>
          <div className="filter-status-group">
            {[['all','ทั้งหมด'],['open','เปิดประมูล'],['closed','ปิดแล้ว']].map(([id,lbl]) => (
              <button key={id}
                className={`filter-status-btn${filters.status===id?' active':''}`}
                onClick={() => set('status', id)}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* รายการพิเศษ */}
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:6 }}>
          <div className="filter-section-title">✨ พิเศษ</div>
          {[
            { key:'isNew',        label:'🟢 ใหม่ ≤7 วัน' },
            { key:'notAuctioned', label:'🟢 ยังไม่เคยประมูล' },
          ].map(({ key, label }) => (
            <label key={key} className="filter-type-opt">
              <input type="checkbox" checked={filters[key]}
                onChange={e => set(key, e.target.checked)}
                style={{ accentColor:'var(--accent)', width:14, height:14 }} />
              {label}
            </label>
          ))}
        </div>

        {/* Actions */}
        <div style={{ padding:14, display:'flex', flexDirection:'column', gap:6 }}>
          <button className="filter-apply-btn" onClick={handleApply} disabled={loading}>
            {loading ? 'กำลังโหลด...' : 'โหลดแผนที่'}
          </button>
          <button className="filter-reset-btn" onClick={handleReset}>ล้างทั้งหมด</button>
          {loaded && (
            <div style={{ fontSize:'0.78rem', color:'var(--text-3)', textAlign:'center', marginTop:2 }}>
              {total.toLocaleString()} จุดบนแผนที่
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ padding:'10px 14px 16px', marginTop:'auto', display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-3)',
            letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:2 }}>สัญลักษณ์</div>
          {[
            { color:'#6EE7B7', label:'ใหม่ ≤7 วัน (N)', text:'N', tc:'#065F46' },
            { color:'#10B981', label:'ยังไม่เคยประมูล',  text:'',  tc:'' },
            { color:'#1A3A5C', label:'เปิดประมูลแล้ว',   text:'',  tc:'' },
            { color:'#A8A29E', label:'ปิดแล้ว',          text:'',  tc:'' },
            { color:'#B91C1C', label:'ขายแล้ว',          text:'',  tc:'' },
          ].map(({ color, label, text, tc }) => (
            <div key={label} style={{ display:'flex', alignItems:'center', gap:8,
              fontSize:'0.8rem', color:'var(--text-2)' }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:color,
                border:'1.5px solid rgba(255,255,255,0.5)', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:8, fontWeight:900, color:tc }}>{text}</div>
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

        <LeafletMap properties={points} selectedId={selected?.id}
          onMarkerClick={handleMarkerClick} />

        {/* Popup single */}
        {selected && sameLocGroup.length === 0 && (
          <div style={{
            position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
            background:'var(--surface)', border:'1.5px solid var(--border)',
            borderRadius:'var(--r-lg)', padding:'14px 18px',
            boxShadow:'var(--sh-lg)', zIndex:1000,
            minWidth:300, maxWidth:440, display:'flex', gap:14, alignItems:'flex-start',
          }}>
            {selected.url_picture && (
              <img src={selected.url_picture} alt=""
                style={{ width:80, height:64, objectFit:'cover', borderRadius:'var(--r-sm)', flexShrink:0 }}
                onError={e => e.target.style.display='none'} />
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                <span className={`type-badge ${typeClass(selected.asset_type_id)}`}>
                  {typeLabel(selected.asset_type_id)}</span>
                <span className={`status-badge ${selStCls}`}>{selStLabel}</span>
                {isNewPin(selected) && (
                  <span style={{ fontSize:'0.67rem', fontWeight:700, padding:'2px 6px',
                    borderRadius:4, background:'#6EE7B7', color:'#065F46' }}>NEW</span>
                )}
              </div>
              <div style={{ fontSize:'0.85rem', color:'var(--text-2)', marginBottom:4 }}>
                📍 {fmtLocation(selected) || '—'}
              </div>
              <div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--accent)', fontFamily:'var(--mono)' }}>
                {fmtArea(selected.rai, selected.ngan, selected.wa)}
              </div>
              <div style={{ fontSize:'0.78rem', color:'var(--text-3)', marginTop:2 }}>
                ราคาประเมิน {fmtPriceFull(selected.appraisal_price)}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
              <Link to={`/property/${selected.id}`}
                style={{ display:'block', padding:'7px 16px', background:'var(--accent)',
                  color:'#fff', borderRadius:'var(--r-sm)', fontSize:'0.82rem',
                  fontWeight:700, textAlign:'center' }}>รายละเอียด</Link>
              <button onClick={() => { setSelected(null); setSameLocGroup([]) }}
                style={{ padding:'6px 16px', background:'none',
                  border:'1.5px solid var(--border)', borderRadius:'var(--r-sm)',
                  fontSize:'0.8rem', color:'var(--text-3)', cursor:'pointer' }}>ปิด</button>
            </div>
          </div>
        )}

        {/* Popup multi (Option C) */}
        {selected && sameLocGroup.length > 1 && (
          <div style={{
            position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
            background:'var(--surface)', border:'1.5px solid var(--border)',
            borderRadius:'var(--r-lg)', padding:'14px 18px',
            boxShadow:'var(--sh-lg)', zIndex:1000,
            width:400, maxHeight:380, display:'flex', flexDirection:'column', gap:10,
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
                        onError={e => e.target.style.display='none'} />
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', gap:5, marginBottom:2, flexWrap:'wrap' }}>
                        <span className={`type-badge ${typeClass(p.asset_type_id)}`}>
                          {typeLabel(p.asset_type_id)}</span>
                        <span className={`status-badge ${cls}`}>{label}</span>
                        {isNewPin(p) && (
                          <span style={{ fontSize:'0.65rem', fontWeight:700, padding:'1px 5px',
                            borderRadius:3, background:'#6EE7B7', color:'#065F46' }}>NEW</span>
                        )}
                      </div>
                      <div style={{ fontSize:'0.8rem', color:'var(--text-2)' }}>
                        {fmtArea(p.rai, p.ngan, p.wa)}
                        <span style={{ marginLeft:8, color:'var(--text-3)',
                          fontFamily:'var(--mono)', fontSize:'0.78rem' }}>
                          {fmtPriceFull(p.appraisal_price)}
                        </span>
                      </div>
                    </div>
                    <Link to={`/property/${p.id}`}
                      style={{ padding:'5px 12px', background:'var(--accent)',
                        color:'#fff', borderRadius:'var(--r-sm)',
                        fontSize:'0.78rem', fontWeight:700, flexShrink:0 }}>ดู</Link>
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
