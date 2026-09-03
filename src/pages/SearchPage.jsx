import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import HeroStats from '../components/HeroStats.jsx'
import FilterChips from '../components/FilterChips.jsx'
import SearchFilters from '../components/SearchFilters.jsx'
import PropertyCard from '../components/PropertyCard.jsx'
import LeafletMap from '../components/LeafletMap.jsx'
import Pagination from '../components/Pagination.jsx'
import ResultsToolbar, { PAGE_SIZE_OPTIONS } from '../components/ResultsToolbar.jsx'

const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]   // 20

const EMPTY = {
  city: '', led_province_id: '', ampur: '', district_id: '', tumbol: '',
  asset_type_id: '', price_min: '', price_max: '',
  status: 'all', sort: 'ischeck_date.desc', q: '',
}

const FILTER_KEYS = [
  'city', 'led_province_id', 'ampur', 'tumbol',
  'asset_type_id', 'price_min', 'price_max', 'status', 'sort', 'q',
]

function readStateFromParams(params) {
  const filters = { ...EMPTY }
  for (const k of FILTER_KEYS) {
    const v = params.get(k)
    if (v != null) filters[k] = v
  }
  const page     = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const pageSize = PAGE_SIZE_OPTIONS.includes(Number(params.get('pageSize')))
    ? Number(params.get('pageSize')) : DEFAULT_PAGE_SIZE
  const viewMode = ['grid', 'list', 'map'].includes(params.get('view'))
    ? params.get('view') : 'grid'
  return { filters, page, pageSize, viewMode }
}

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
  const [searchParams, setSearchParams] = useSearchParams()

  const initial = useMemo(() => readStateFromParams(searchParams), []) // eslint-disable-line

  const [filters, setFilters]       = useState(initial.filters)
  const [pending, setPending]       = useState(initial.filters)
  const [items, setItems]           = useState([])
  const [mapPts, setMapPts]         = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(initial.page)
  const [pageSize, setPageSize]     = useState(initial.pageSize)
  const [loading, setLoading]       = useState(false)
  const [initDone, setInitDone]     = useState(false)
  const [error, setError]           = useState(null)
  const [hoverId, setHoverId]       = useState(null)
  const [selId, setSelId]           = useState(null)
  const [activeChip, setActiveChip] = useState(null)
  const [viewMode, setViewMode]     = useState(initial.viewMode)
  const [todayIds, setTodayIds]     = useState([])

  const coordSet = useMemo(() => new Set(mapPts.map(p => p.id)), [mapPts])

  const syncUrl = useCallback((f, p, ps, vm) => {
    const params = new URLSearchParams()
    for (const k of FILTER_KEYS) {
      if (f[k] && f[k] !== EMPTY[k]) params.set(k, f[k])
    }
    if (p > 1) params.set('page', String(p))
    if (ps !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(ps))
    if (vm !== 'grid') params.set('view', vm)
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

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

  useEffect(() => { load(initial.filters, initial.page, initial.pageSize) }, []) // eslint-disable-line

  const handleApply = () => {
    const f = { ...pending }; setFilters(f); setPage(1); load(f, 1, pageSize)
    syncUrl(f, 1, pageSize, viewMode)
  }
  const handleReset = () => {
    setActiveChip(null); setTodayIds([])
    setPending(EMPTY); setFilters(EMPTY); setPage(1); load(EMPTY, 1, pageSize, [])
    syncUrl(EMPTY, 1, pageSize, viewMode)
  }
  const handleSort = (sort) => {
    const f = { ...filters, sort }; setFilters(f); setPending(f); setPage(1); load(f, 1, pageSize)
    syncUrl(f, 1, pageSize, viewMode)
  }
  const handlePageSize = (ps) => {
    setPageSize(ps); setPage(1); load(filters, 1, ps)
    syncUrl(filters, 1, ps, viewMode)
  }
  const handlePage = (p) => {
    setPage(p); load(filters, p, pageSize)
    syncUrl(filters, p, pageSize, viewMode)
  }
  const handleViewMode = (vm) => {
    setViewMode(vm)
    syncUrl(filters, page, pageSize, vm)
  }
  const handleChip = (chip) => {
    if (!chip) {
      setActiveChip(null); setPending(EMPTY); setFilters(EMPTY)
      setPage(1); load(EMPTY, 1, pageSize, [])
      syncUrl(EMPTY, 1, pageSize, viewMode)
    } else {
      setActiveChip(chip.id)
      const f = { ...EMPTY, ...chip.filter }
      setPending(f); setFilters(f); setPage(1); load(f, 1, pageSize)
      syncUrl(f, 1, pageSize, viewMode)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

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

      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', padding:'0 20px' }}>
          <HeroStats />
        </div>
      </div>

      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', padding:'0 20px' }}>
          <FilterChips activeChip={activeChip} onChip={handleChip} />
        </div>
      </div>

      <div className="search-top-bar">
        <div className="search-top-bar-inner">
          <SearchFilters
            filters={pending}
            onChange={setPending}
            onApply={handleApply}
            onReset={handleReset}
          />

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
            <ResultsToolbar
              pageSize={pageSize} onPageSize={handlePageSize}
              sort={filters.sort} sortOptions={SORT_OPTIONS} onSort={handleSort}
              viewMode={viewMode} onViewMode={handleViewMode}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'0 20px 40px' }}>

        {viewMode === 'map' && (
          <div className="map-cards-layout">
            <div className="map-sticky-container" style={{ marginTop:16 }}>
              <LeafletMap
                properties={mapPts}
                selectedId={hoverId || selId}
                onMarkerClick={p => setSelId(prev => prev === p.id ? null : p.id)}
              />
            </div>

            <StateBox />

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
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePage} loading={loading || !initDone} />
              </>
            )}
          </div>
        )}

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
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePage} loading={loading || !initDone} />
              </>
            )}
          </>
        )}

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
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePage} loading={loading || !initDone} />
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}
