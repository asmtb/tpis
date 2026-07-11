import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import SearchFilters from '../components/SearchFilters.jsx'
import PropertyCard from '../components/PropertyCard.jsx'
import LeafletMap from '../components/LeafletMap.jsx'

const PAGE_SIZE = 20

const EMPTY_FILTERS = {
  city:          '',
  ampur:         '',
  asset_type_id: '',
  price_min:     '',
  price_max:     '',
  status:        'all',
  sort:          'scraped_at.desc',
}

/** สร้าง Supabase query จาก filter object */
function buildQuery(f, offset = 0) {
  const [field, dir] = (f.sort || 'scraped_at.desc').split('.')

  let q = supabase
    .from('assets')
    .select(
      'id, str_bid_num, deedno_raw, deedno_count,' +
      'city, ampur, tumbol, asset_type_id, asset_type_desc,' +
      'rai, ngan, wa, assetprice3, assetprice1, reserve_fund,' +
      'is_closed, is_sold, latest_status, latest_round_no,' +
      'url_picture, ischeck_date, scraped_at',
      { count: 'exact' }
    )
    .order(field, { ascending: dir === 'asc' })
    .range(offset, offset + PAGE_SIZE - 1)

  if (f.city)           q = q.eq('city', f.city)
  if (f.ampur)          q = q.ilike('ampur', `%${f.ampur}%`)
  if (f.asset_type_id)  q = q.eq('asset_type_id', f.asset_type_id)
  if (f.price_min)      q = q.gte('assetprice3', parseFloat(f.price_min.replace(/,/g, '')))
  if (f.price_max)      q = q.lte('assetprice3', parseFloat(f.price_max.replace(/,/g, '')))
  if (f.status === 'open')   q = q.eq('is_closed', false)
  if (f.status === 'closed') q = q.eq('is_closed', true)

  return q
}

/** ดึง map points แยกจาก results เพราะ limit ต่างกัน */
async function fetchMapPoints(f) {
  let q = supabase
    .from('assets_map')
    .select('id, city, ampur, asset_type_id, asset_type_desc, assetprice3, is_sold, is_closed, latitude, longitude')
    .not('latitude', 'is', null)
    .limit(800)

  if (f.city)          q = q.eq('city', f.city)
  if (f.asset_type_id) q = q.eq('asset_type_id', f.asset_type_id)
  if (f.status === 'open')   q = q.eq('is_closed', false)
  if (f.status === 'closed') q = q.eq('is_closed', true)

  const { data } = await q
  return data || []
}

export default function SearchPage() {
  const [filters, setFilters]         = useState(EMPTY_FILTERS)
  const [pending, setPending]         = useState(EMPTY_FILTERS)
  const [properties, setProperties]   = useState([])
  const [mapPoints, setMapPoints]     = useState([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError]             = useState(null)
  const [selectedId, setSelectedId]   = useState(null)
  const [mapProvider, setMapProvider] = useState('leaflet')  // 'leaflet' | 'google'

  const load = useCallback(async (f, p = 1) => {
    setLoading(true)
    setError(null)
    try {
      const offset = (p - 1) * PAGE_SIZE
      const { data, count, error: e } = await buildQuery(f, offset)
      if (e) throw e
      setProperties(data || [])
      setTotal(count || 0)

      // ดึง map points แบบ async ไม่ block results
      fetchMapPoints(f).then(setMapPoints)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [])

  // โหลดครั้งแรกทันทีที่ mount
  useState(() => { load(EMPTY_FILTERS, 1) })

  const handleApply = () => {
    const f = { ...pending }
    setFilters(f)
    setPage(1)
    load(f, 1)
  }

  const handleReset = () => {
    setPending(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setPage(1)
    load(EMPTY_FILTERS, 1)
  }

  const handleSort = (sort) => {
    const f = { ...pending, sort }
    setPending(f)
    setFilters(f)
    setPage(1)
    load(f, 1)
  }

  const handlePage = (p) => {
    setPage(p)
    load(filters, p)
    // scroll results ขึ้นบน
    document.querySelector('.search-results')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="search-layout">

      {/* LEFT — Filters */}
      <SearchFilters
        filters={pending}
        onChange={setPending}
        onApply={handleApply}
        onReset={handleReset}
      />

      {/* MIDDLE — Results */}
      <div className="search-results">

        <div className="results-header">
          <div className="results-count">
            {loading ? 'กำลังโหลด...' : (
              <>พบ <strong>{total.toLocaleString()}</strong> รายการ
                {page > 1 && <span style={{ color: 'var(--text-3)' }}> (หน้า {page}/{totalPages})</span>}
              </>
            )}
          </div>
          <div className="results-sort">
            <span>เรียงตาม</span>
            <select
              className="sort-select"
              value={filters.sort}
              onChange={e => handleSort(e.target.value)}
            >
              <option value="scraped_at.desc">ล่าสุด</option>
              <option value="assetprice3.asc">ราคาต่ำสุด</option>
              <option value="assetprice3.desc">ราคาสูงสุด</option>
              <option value="ischeck_date.desc">วันที่ใหม่สุด</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="state-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <circle cx="12" cy="16" r="1"/>
            </svg>
            <p>เกิดข้อผิดพลาด: {error}</p>
          </div>
        )}

        {/* Loading */}
        {(loading || initialLoad) && !error && (
          <div className="state-box">
            <div className="dots"><span/><span/><span/></div>
          </div>
        )}

        {/* Empty */}
        {!loading && !initialLoad && !error && properties.length === 0 && (
          <div className="state-box">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <p>ไม่พบทรัพย์ที่ตรงกับเงื่อนไข</p>
            <button className="filter-reset-btn" style={{ width: 'auto', padding: '7px 16px' }} onClick={handleReset}>
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}

        {/* Cards */}
        {!initialLoad && properties.map(p => (
          <PropertyCard key={p.id} property={p} />
        ))}

        {/* Pagination */}
        {!loading && !initialLoad && totalPages > 1 && (
          <div className="pagination">
            <button className="pg-btn" onClick={() => handlePage(page - 1)} disabled={page === 1}>←</button>
            {pageBtns(page, totalPages).map((n, i) =>
              n === '…'
                ? <span key={`e${i}`} style={{ padding: '5px 4px', color: 'var(--text-3)' }}>…</span>
                : <button
                    key={n}
                    className={`pg-btn${n === page ? ' active' : ''}`}
                    onClick={() => handlePage(n)}
                  >{n}</button>
            )}
            <button className="pg-btn" onClick={() => handlePage(page + 1)} disabled={page === totalPages}>→</button>
          </div>
        )}

      </div>

      {/* RIGHT — Map */}
      <div className="search-map">
        <div className="map-provider-toggle">
          <button
            className={`map-provider-btn${mapProvider === 'leaflet' ? ' active' : ''}`}
            onClick={() => setMapProvider('leaflet')}
          >OSM</button>
          <button
            className={`map-provider-btn${mapProvider === 'google' ? ' active' : ''}`}
            onClick={() => setMapProvider('google')}
            title="ต้องตั้งค่า VITE_GOOGLE_MAPS_KEY"
          >Google</button>
        </div>

        {mapProvider === 'leaflet' && (
          <LeafletMap
            properties={mapPoints}
            selectedId={selectedId}
            onMarkerClick={p => setSelectedId(prev => prev === p.id ? null : p.id)}
          />
        )}
        {mapProvider === 'google' && (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-alt)', color: 'var(--text-3)', fontFamily: 'var(--font)', fontSize: 14 }}>
            Google Maps — ตั้งค่า VITE_GOOGLE_MAPS_KEY
          </div>
        )}
      </div>

    </div>
  )
}

/** สร้าง array เลขหน้าพร้อม "…" */
function pageBtns(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter(n => n >= 1 && n <= total).sort((a, b) => a - b)
  const result = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push('…')
    result.push(n)
  })
  return result
}
