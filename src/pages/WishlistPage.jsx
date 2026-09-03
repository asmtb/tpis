import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useWishlist } from '../lib/WishlistContext.jsx'
import PropertyCard from '../components/PropertyCard.jsx'
import LeafletMap from '../components/LeafletMap.jsx'
import SearchFilters from '../components/SearchFilters.jsx'
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

const SORT_OPTIONS = [
  { value: 'ischeck_date.desc', label: 'วันที่ประกาศใหม่สุด' },
  { value: 'assetprice3.asc',   label: 'ราคาต่ำสุด' },
  { value: 'assetprice3.desc',  label: 'ราคาสูงสุด' },
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

/**
 * หน้า /wishlist — ครอบด้วย RequireAuth ที่ App.jsx แล้ว จึงมั่นใจได้ว่า
 * user login อยู่เสมอตอนมาถึงหน้านี้ (ไม่ต้องเช็ค user ซ้ำในนี้)
 *
 * ต่างจาก SearchPage ตรงที่ filter/sort/pagination ทำฝั่ง client ทั้งหมด
 * (ไม่ query Supabase ซ้ำทุกครั้งที่เปลี่ยน filter) เพราะจำนวนรายการใน
 * wishlist ของ user คนหนึ่งมีจำกัด (ไม่ใช่หลักหมื่นแบบทั้งระบบ) — fetch
 * รายละเอียดเต็มของทุก asset ใน wishlist ครั้งเดียวตอน mount พอ
 */
export default function WishlistPage() {
  const { ids, loading: idsLoading } = useWishlist()
  const [searchParams, setSearchParams] = useSearchParams()
  const initial = useMemo(() => readStateFromParams(searchParams), []) // eslint-disable-line

  const [allItems, setAllItems]     = useState([])
  const [coordIds, setCoordIds]     = useState(new Set())
  const [loading, setLoading]       = useState(true)

  const [pending, setPending]   = useState(initial.filters)
  const [filters, setFilters]   = useState(initial.filters)
  const [page, setPage]         = useState(initial.page)
  const [pageSize, setPageSize] = useState(initial.pageSize)
  const [viewMode, setViewMode] = useState(initial.viewMode)
  const [hoverId, setHoverId]   = useState(null)
  const [selId, setSelId]       = useState(null)

  const idList = useMemo(() => [...ids], [ids])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (idsLoading) return
      if (idList.length === 0) {
        setAllItems([]); setCoordIds(new Set()); setLoading(false)
        return
      }
      setLoading(true)
      const [{ data: assets }, { data: mapPts }] = await Promise.all([
        supabase
          .from('assets')
          .select(
            'id,str_bid_num,deedno_raw,deedno_count,' +
            'city,ampur,tumbol,deedcity,deedampur,deedtumbol,' +
            'asset_type_id,asset_type_desc,' +
            'rai,ngan,wa,assetprice3,assetprice1,reserve_fund,' +
            'is_closed,is_sold,latest_status,latest_round_no,' +
            'url_picture,ischeck_date,scraped_at'
          )
          .in('id', idList),
        supabase
          .from('assets_map')
          .select('id,latitude,longitude')
          .in('id', idList)
          .not('latitude', 'is', null),
      ])
      if (cancelled) return
      setAllItems(assets || [])
      setCoordIds(new Set((mapPts || []).map(r => r.id)))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [idList, idsLoading])

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

  // ── filter + sort ฝั่ง client จาก allItems ──
  const filtered = useMemo(() => {
    let out = allItems
    if (filters.city)          out = out.filter(p => p.city === filters.city || p.deedcity === filters.city)
    if (filters.ampur)         out = out.filter(p => p.ampur === filters.ampur || p.deedampur === filters.ampur)
    if (filters.tumbol)        out = out.filter(p => p.tumbol === filters.tumbol || p.deedtumbol === filters.tumbol)
    if (filters.asset_type_id) out = out.filter(p => p.asset_type_id === filters.asset_type_id)
    if (filters.price_min)     out = out.filter(p => (p.assetprice3 || 0) >= parseFloat(filters.price_min.replace(/,/g, '')))
    if (filters.price_max)     out = out.filter(p => (p.assetprice3 || 0) <= parseFloat(filters.price_max.replace(/,/g, '')))
    if (filters.status === 'open')   out = out.filter(p => !p.is_closed)
    if (filters.status === 'closed') out = out.filter(p => p.is_closed)
    if (filters.q) {
      const q = filters.q.toLowerCase()
      out = out.filter(p =>
        (p.deedno_raw || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.deedcity || '').toLowerCase().includes(q)
      )
    }
    const [field, dir] = (filters.sort || 'ischeck_date.desc').split('.')
    out = [...out].sort((a, b) => {
      const av = a[field] ?? 0, bv = b[field] ?? 0
      if (av < bv) return dir === 'asc' ? -1 : 1
      if (av > bv) return dir === 'asc' ? 1 : -1
      return 0
    })
    return out
  }, [allItems, filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageClamped = Math.min(page, totalPages)
  const pageItems = useMemo(
    () => filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize),
    [filtered, pageClamped, pageSize]
  )
  const mapPts = useMemo(
    () => filtered
      .filter(p => coordIds.has(p.id))
      .map(p => {
        const found = coordIds.has(p.id)
        return found ? { ...p, ...(allItems.find(a => a.id === p.id)) } : p
      }),
    [filtered, coordIds, allItems]
  )

  const handleApply = () => { setFilters({ ...pending }); setPage(1); syncUrl(pending, 1, pageSize, viewMode) }
  const handleReset = () => {
    setPending(EMPTY); setFilters(EMPTY); setPage(1); syncUrl(EMPTY, 1, pageSize, viewMode)
  }
  const handleSort = (sort) => {
    const f = { ...filters, sort }; setFilters(f); setPending(f); setPage(1); syncUrl(f, 1, pageSize, viewMode)
  }
  const handlePageSize = (ps) => { setPageSize(ps); setPage(1); syncUrl(filters, 1, ps, viewMode) }
  const handlePage = (p) => { setPage(p); syncUrl(filters, p, pageSize, viewMode) }
  const handleViewMode = (vm) => { setViewMode(vm); syncUrl(filters, page, pageSize, vm) }

  const busy = idsLoading || loading

  return (
    <div className="search-page-new">
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px 0' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
          ทรัพย์ที่บันทึกไว้
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 12 }}>
          {busy ? 'กำลังโหลด...' : `${allItems.length} รายการที่บันทึกไว้`}
        </p>
      </div>

      {!busy && allItems.length === 0 ? (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px 40px' }}>
          <div className="state-box" style={{ paddingTop: 60 }}>
            <p style={{ color: 'var(--text-3)' }}>
              ยังไม่มีทรัพย์ที่บันทึกไว้ — กด ♡ บนการ์ดทรัพย์ที่สนใจเพื่อบันทึกไว้ที่นี่
            </p>
            <Link to="/" className="abtn primary" style={{ marginTop: 12, display: 'inline-flex' }}>
              ไปหน้าค้นหาทรัพย์
            </Link>
          </div>
        </div>
      ) : (
        <>
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
                    {busy ? 'กำลังโหลด...' : (
                      <>พบ <strong>{filtered.length.toLocaleString()}</strong> รายการ
                        {pageClamped > 1 && <span style={{ color: 'var(--text-3)' }}> · หน้า {pageClamped}/{totalPages}</span>}
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

          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px 40px' }}>
            {busy ? (
              <div className="state-box"><div className="dots"><span/><span/><span/></div></div>
            ) : filtered.length === 0 ? (
              <div className="state-box" style={{ paddingTop: 40 }}>
                <p style={{ color: 'var(--text-3)' }}>ไม่พบทรัพย์ที่ตรงกับตัวกรอง</p>
                <button className="filter-reset-btn" style={{ width: 'auto', padding: '7px 20px' }}
                  onClick={handleReset}>ล้างตัวกรองทั้งหมด</button>
              </div>
            ) : viewMode === 'map' ? (
              <div className="map-cards-layout">
                <div className="map-sticky-container" style={{ marginTop: 16 }}>
                  <LeafletMap
                    properties={mapPts}
                    selectedId={hoverId || selId}
                    onMarkerClick={p => setSelId(prev => prev === p.id ? null : p.id)}
                  />
                </div>
                <div className="cards-grid">
                  {pageItems.map(p => (
                    <PropertyCard key={p.id} property={p} hasCoord={coordIds.has(p.id)} variant="grid"
                      onMouseEnter={() => setHoverId(p.id)} onMouseLeave={() => setHoverId(null)} />
                  ))}
                </div>
                <Pagination page={pageClamped} totalPages={totalPages} onPageChange={handlePage} />
              </div>
            ) : viewMode === 'list' ? (
              <>
                <div className="cards-list" style={{ marginTop: 12 }}>
                  {pageItems.map(p => (
                    <PropertyCard key={p.id} property={p} hasCoord={coordIds.has(p.id)} variant="list" />
                  ))}
                </div>
                <Pagination page={pageClamped} totalPages={totalPages} onPageChange={handlePage} />
              </>
            ) : (
              <>
                <div className="cards-grid" style={{ marginTop: 16 }}>
                  {pageItems.map(p => (
                    <PropertyCard key={p.id} property={p} hasCoord={coordIds.has(p.id)} variant="grid" />
                  ))}
                </div>
                <Pagination page={pageClamped} totalPages={totalPages} onPageChange={handlePage} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
