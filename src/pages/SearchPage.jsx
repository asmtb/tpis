import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import HeroStats from '../components/HeroStats.jsx'
import FilterChips from '../components/FilterChips.jsx'
import SearchFilters from '../components/SearchFilters.jsx'
import PropertyCard from '../components/PropertyCard.jsx'
import LeafletMap from '../components/LeafletMap.jsx'

const DEFAULT_PAGE_SIZE = 20

const EMPTY = {
  city: '', led_province_id: '', ampur: '', district_id: '', tumbol: '',
  asset_type_id: '', price_min: '', price_max: '',
  status: 'all', sort: 'ischeck_date.desc', q: '',
}

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

async function fetchTodayIds() {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('asset_bid_rounds')
    .select('asset_id')
    .eq('bid_date', today)
  return (data || []).map(r => r.asset_id)
}

function buildQuery(f, offset = 0, pageSize = DEFAULT_PAGE_SIZE, todayIds = []) {
  const [field, dir] = (f.sort || 'ischeck_date.desc').split('.')
  let q = supabase
    .from('assets')
    .select(
      'id,str_bid_num,deedno_raw,deedno_count,' +
      'city,ampur,tumbol,deedcity,deedampur,deedtumbol,' +
      'asset_type_id,asset_type_desc,' +
      'rai,ngan,wa,assetprice3,assetprice1,reserve_fund,' +
      'is_closed,is_sold,latest_status,latest_round_no,' +
      'url_picture,ischeck_date,scraped_at',
      { count: 'exact' }
    )
    .order(field, { ascending: dir === 'asc' })
    .range(offset, offset + pageSize - 1)

  if (f.city)          q = q.or(`city.eq.${f.city},deedcity.eq.${f.city}`)
  if (f.ampur)         q = q.or(`ampur.eq.${f.ampur},deedampur.eq.${f.ampur}`)
  if (f.tumbol)        q = q.or(`tumbol.eq.${f.tumbol},deedtumbol.eq.${f.tumbol}`)
  if (f.asset_type_id) q = q.eq('asset_type_id', f.asset_type_id)
  if (f.price_min)     q = q.gte('assetprice3', parseFloat(f.price_min.replace(/,/g, '')))
  if (f.price_max)     q = q.lte('assetprice3', parseFloat(f.price_max.replace(/,/g, '')))
  if (f.status === 'open')   q = q.eq('is_closed', false)
  if (f.status === 'closed') q = q.eq('is_closed', true)
  if (f.status === 'today' && todayIds.length > 0) q = q.in('id', todayIds)
  if (f.q) q = q.or(
    `deedno_raw.ilike.%${f.q}%,city.ilike.%${f.q}%,` +
    `ownername.ilike.%${f.q}%,deedcity.ilike.%${f.q}%`
  )
  return q
}

async function fetchMapPts(f, todayIds = []) {
  let q = supabase
    .from('assets_map')
    .select(
      'id,city,ampur,tumbol,deedcity,deedampur,deedtumbol,' +
      'asset_type_id,asset_type_desc,appraisal_price,' +
      'is_sold,is_closed,latest_round_no,ischeck_date,latitude,longitude'
    )
    .not('latitude', 'is', null)
    .limit(3000)
  if (f.city)          q = q.or(`city.eq.${f.city},deedcity.eq.${f.city}`)
  if (f.ampur)         q = q.or(`ampur.eq.${f.ampur},deedampur.eq.${f.ampur}`)
  if (f.tumbol)        q = q.or(`tumbol.eq.${f.tumbol},deedtumbol.eq.${f.tumbol}`)
  if (f.asset_type_id) q = q.eq('asset_type_id', f.asset_type_id)
  if (f.price_min)     q = q.gte('appraisal_price', parseFloat(f.price_min.replace(/,/g, '')))
  if (f.price_max)     q = q.lte('appraisal_price', parseFloat(f.price_max.replace(/,/g, '')))
  if (f.status === 'open')   q = q.eq('is_closed', false)
  if (f.status === 'closed') q = q.eq('is_closed', true)
  if (f.status === 'today' && todayIds.length > 0) q = q.in('id', todayIds)
  const { data } = await q
  return data || []
}

function pageBtns(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const s = new Set([1, total, cur, cur - 1, cur + 1])
  const sorted = [...s].filter(n => n >= 1 && n <= total).sort((a, b) => a - b)
  const out = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50]
const SORT_OPTIONS = [
  { value: 'ischeck_date.desc', label: 'วันที่ประกาศใหม่สุด' },
  { value: 'assetprice3.asc',   label: 'ราคาต่ำสุด' },
  { value: 'assetprice3.desc',  label: 'ราคาสูงสุด' },
  { value: 'rai.desc',          label: 'พื้นที่มากสุด' },
  { value: 'rai.asc',           label: 'พื้นที่น้อยสุด' },
  { value: 'latest_round_no.desc', label: 'ผ่านนัดมากสุด' },
  { value: 'latest_round_no.asc',  label: 'นัดน้อยสุด' },
]

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters]       = useState({ ...EMPTY, q: searchParams.get('q') || '' })
  const [pending, setPending]       = useState({ ...EMPTY, q: searchParams.get('q') || '' })
  const [items, setItems]           = useState([])
  const [mapPts, setMapPts]         = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [pageSize, setPageSize]     = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading]       = useState(false)
  const [initDone, setInitDone]     = useState(false)
  const [error, setError]           = useState(null)
  const [hoverId, setHoverId]       = useState(null)
  const [selId, setSelId]           = useState(null)
  const [activeChip, setActiveChip] = useState(null)
  const [viewMode, setViewMode]     = useState('grid')  // 'grid' | 'list' | 'map'
  const [todayIds, setTodayIds]     = useState([])

  const coordSet = useMemo(() => new Set(mapPts.map(p => p.id)), [mapPts])

  const load = useCallback(async (f, p = 1, ps = DEFAULT_PAGE_SIZE, tIds = todayIds) => {
    setLoading(true); setError(null)
    try {
      let ids = tIds
      if (f.status === 'today' && ids.length === 0) {
        ids = await fetchTodayIds()
        setTodayIds(ids)
      }
      if (f.status === 'today' && ids.length === 0) {
        setItems([]); setTotal(0); setLoading(false); setInitDone(true)
        return
      }
      const { data, count, error: e } = await buildQuery(f, (p - 1) * ps, ps, ids)
      if (e) throw e
      setItems(data || [])
      setTotal(count || 0)
      fetchMapPts(f, ids).then(setMapPts)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false); setInitDone(true)
    }
  }, [todayIds])

  useEffect(() => { load(filters, 1, pageSize) }, []) // eslint-disable-line

  useEffect(() => {
    const q = searchParams.get('q') || ''
    if (!q) return
    const f = { ...EMPTY, q }
    setFilters(f); setPending(f); setPage(1); load(f, 1, pageSize)
  }, [searchParams.get('q')]) // eslint-disable-line

  const handleApply = () => {
    const f = { ...pending }; setFilters(f); setPage(1); load(f, 1, pageSize)
  }
  const handleReset = () => {
    setActiveChip(null); setTodayIds([])
    setPending(EMPTY); setFilters(EMPTY); setPage(1); load(EMPTY, 1, pageSize, [])
  }
  const handleSort = (sort) => {
    const f = { ...filters, sort }; setFilters(f); setPending(f); setPage(1); load(f, 1, pageSize)
  }
  const handlePageSize = (ps) => {
    setPageSize(ps); setPage(1); load(filters, 1, ps)
  }
  const handlePage = (p) => {
    setPage(p); load(filters, p, pageSize)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleChip = (chip) => {
    if (!chip) {
      setActiveChip(null); setPending(EMPTY); setFilters(EMPTY)
      setPage(1); load(EMPTY, 1, pageSize, [])
    } else {
      setActiveChip(chip.id)
      const f = { ...EMPTY, ...chip.filter }
      setPending(f); setFilters(f); setPage(1); load(f, 1, pageSize)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  /* ── Pagination ── */
  const Pagination = () => !initDone || loading || totalPages <= 1 ? null : (
    <div className="pagination" style={{ padding:'20px 0' }}>
      <button className="pg-btn" onClick={() => handlePage(page - 1)} disabled={page === 1}>←</button>
      {pageBtns(page, totalPages).map((n, i) =>
        n === '…'
          ? <span key={`e${i}`} style={{ padding:'5px 4px', color:'var(--text-3)' }}>…</span>
          : <button key={n} className={`pg-btn${n === page ? ' active' : ''}`}
              onClick={() => handlePage(n)}>{n}</button>
      )}
      <button className="pg-btn" onClick={() => handlePage(page + 1)} disabled={page === totalPages}>→</button>
    </div>
  )

  /* ── Empty / Error states ── */
  const StateBox = () => {
    if (error) return (
      <div className="state-box">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1"/>
        </svg>
        <p>เกิดข้อผิดพลาด: {error}</p>
      </div>
    )
    if (!initDone || loading) return (
      <div className="state-box"><div className="dots"><span/><span/><span/></div></div>
    )
    if (items.length === 0) return (
      <div className="state-box">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <p>ไม่พบทรัพย์ที่ตรงกับเงื่อนไข</p>
        <button className="filter-reset-btn" style={{ width:'auto', padding:'7px 20px' }}
          onClick={handleReset}>ล้างตัวกรองทั้งหมด</button>
      </div>
    )
    return null
  }

  return (
    <div className="search-page-new">

      {/* Hero Stats */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', padding:'0 20px' }}>
          <HeroStats />
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', padding:'0 20px' }}>
          <FilterChips activeChip={activeChip} onChip={handleChip} />
        </div>
      </div>

      {/* Sticky top bar: filter + results bar */}
      <div className="search-top-bar">
        <div className="search-top-bar-inner">
          <SearchFilters
            filters={pending}
            onChange={setPending}
            onApply={handleApply}
            onReset={handleReset}
          />

          {/* Results bar */}
          <div className="results-bar-new">
            <div className="results-bar-left">
              <div className="results-count">
                {loading ? 'กำลังโหลด...' : (
                  <>พบ <strong>{total.toLocaleString()}</strong> รายการ
                    {page > 1 && <span style={{ color:'var(--text-3)' }}> · หน้า {page}/{totalPages}</span>}
                  </>
                )}
              </div>
            </div>
            <div className="results-bar-right">
              {/* Page size */}
              <select className="sort-select" value={pageSize}
                onChange={e => handlePageSize(Number(e.target.value))}>
                {PAGE_SIZE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}/หน้า</option>
                ))}
              </select>
              {/* Sort */}
              <select className="sort-select" value={filters.sort}
                onChange={e => handleSort(e.target.value)}>
                {SORT_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {/* View toggle */}
              <div className="view-toggle">
                <button className={`view-btn${viewMode==='grid'?' active':''}`}
                  onClick={() => setViewMode('grid')} title="Grid">
                  <IconGrid/>
                </button>
                <button className={`view-btn${viewMode==='list'?' active':''}`}
                  onClick={() => setViewMode('list')} title="List">
                  <IconList/>
                </button>
                <button className={`view-btn${viewMode==='map'?' active':''}`}
                  onClick={() => setViewMode('map')} title="Map + Cards">
                  <IconMapCards/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1400, margin:'0 auto', padding:'0 20px 40px' }}>

        {/* ── MAP+CARDS view ── */}
        {viewMode === 'map' && (
          <div className="map-cards-layout">
            {/* Map sticky บนเต็มความกว้าง ~45vh */}
            <div className="map-sticky-container" style={{ marginTop:16 }}>
              <LeafletMap
                properties={mapPts}
                selectedId={hoverId || selId}
                onMarkerClick={p => setSelId(prev => prev === p.id ? null : p.id)}
              />
            </div>

            <StateBox />

            {/* Cards ล่าง 4 คอลัมน์ */}
            {initDone && !error && items.length > 0 && (
              <>
                <div className="cards-grid">
                  {items.map(p => (
                    <PropertyCard
                      key={p.id} property={p}
                      hasCoord={coordSet.has(p.id)}
                      variant="grid"
                      onMouseEnter={() => setHoverId(p.id)}
                      onMouseLeave={() => setHoverId(null)}
                    />
                  ))}
                </div>
                <Pagination />
              </>
            )}
          </div>
        )}

        {/* ── GRID view ── */}
        {viewMode === 'grid' && (
          <>
            <StateBox />
            {initDone && !error && items.length > 0 && (
              <>
                <div className="cards-grid" style={{ marginTop:16 }}>
                  {items.map(p => (
                    <PropertyCard
                      key={p.id} property={p}
                      hasCoord={coordSet.has(p.id)}
                      variant="grid"
                      onMouseEnter={() => setHoverId(p.id)}
                      onMouseLeave={() => setHoverId(null)}
                    />
                  ))}
                </div>
                <Pagination />
              </>
            )}
          </>
        )}

        {/* ── LIST view ── */}
        {viewMode === 'list' && (
          <>
            <StateBox />
            {initDone && !error && items.length > 0 && (
              <>
                <div className="cards-list" style={{ marginTop:12 }}>
                  {items.map(p => (
                    <PropertyCard
                      key={p.id} property={p}
                      hasCoord={coordSet.has(p.id)}
                      variant="list"
                      onMouseEnter={() => setHoverId(p.id)}
                      onMouseLeave={() => setHoverId(null)}
                    />
                  ))}
                </div>
                <Pagination />
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
