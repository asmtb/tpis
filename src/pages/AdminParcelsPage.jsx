import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { fmtNum, fmtDateTime } from '../lib/utils.js'
import { PROVINCES } from '../lib/constants.js'

const PAGE_SIZE = 50

/** field ชุดเดียวกับที่ AdminCrawlerPage.jsx export ให้ modal "รายการใหม่" — ตรงกับ
 *  ที่ landsmaps_supabase.get_new_assets() ใช้ปกติ เอาไฟล์นี้ไปรันกับ
 *  landsmaps_collector_local.py --file <ไฟล์นี้> ได้เลยไม่ต้องแปลง field เพิ่ม */
const NEW_ASSETS_FIELDS =
  'id, str_bid_num, led_province_id, led_province_name, city, ampur, ' +
  'deedcity, deedampur, deedtumbol, deedno, deedno_raw, deedno_count, ' +
  'asset_type_id, asset_type_desc, assetprice3, rai, ngan, wa, url_picture, created_at'

const VERIFY_STATUS_OPTIONS = [
  { value: '',              label: 'ทุกสถานะ' },
  { value: 'no_coords',     label: 'ยังไม่มีพิกัด' },
  { value: 'matched',       label: 'matched' },
  { value: 'partial_match', label: 'partial_match' },
  { value: 'not_verified',  label: 'not_verified (ห้องชุด)' },
  { value: 'manual',        label: 'manual (แก้เอง)' },
  { value: 'mismatch',      label: 'mismatch' },
  { value: 'not_found',     label: 'not_found' },
  { value: 'error',         label: 'error' },
]

const VERIFY_STATUS_LABEL = {
  matched: 'matched', partial_match: 'partial_match', not_verified: 'not_verified',
  manual: 'manual', mismatch: 'mismatch', not_found: 'not_found', error: 'error',
}

const fmtLatLng = (v) => (v == null ? '—' : Number(v).toFixed(6))
const fmtBahtExact = (n) => (n == null ? '—' : `${Number(n).toLocaleString('en-US')} ฿`)

/** ตรวจ lat/long คร่าวๆ ว่าอยู่ในกรอบพิกัดของไทยไหม (5–21°N, 97–106°E) — เตือนไว้
 *  ก่อน save เผื่อพิมพ์ผิด แต่ไม่ hard-block เพราะอาจมี edge case จริงๆ */
const isPlausibleThaiLatLng = (lat, lng) => {
  if (lat === '' || lng === '') return true // ปล่อยว่างได้ (ลบพิกัดออก)
  const la = Number(lat), lo = Number(lng)
  if (Number.isNaN(la) || Number.isNaN(lo)) return false
  return la >= 5 && la <= 21 && lo >= 97 && lo <= 106
}

export default function AdminParcelsPage() {
  // ----- filters -----
  const [provinceId, setProvinceId]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tagFilter, setTagFilter]       = useState('') // '' | 'has' | 'none'
  const [deedSearch, setDeedSearch]     = useState('')
  const [assetSearch, setAssetSearch]   = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')

  // ----- data -----
  const [rows, setRows]           = useState([])       // parcels ของหน้าปัจจุบัน (+ asset ตัวแทน)
  const [totalCount, setTotal]    = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [assetCap, setAssetCap]   = useState(false) // เตือนถ้า pre-filter asset ชนเพดาน 3000

  // ----- inline edit -----
  const [editingId, setEditingId] = useState(null)
  const [editLat, setEditLat]     = useState('')
  const [editLng, setEditLng]     = useState('')
  const [editTag, setEditTag]     = useState('')
  const [editError, setEditError] = useState(null)
  const [saving, setSaving]       = useState(false)

  const [exporting, setExporting] = useState(false)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  /** หา asset id ที่ตรง filter ฝั่ง assets (จังหวัด/ช่วงวันที่/ค้นหาเลขที่ทรัพย์)
   *  คืน null ถ้าไม่มี filter ฝั่งนี้เลย (ไม่ต้อง narrow ผ่าน assets) */
  const fetchMatchingAssetIds = useCallback(async () => {
    const active = provinceId || dateFrom || dateTo || assetSearch.trim()
    if (!active) return null

    let q = supabase.from('assets').select('id').limit(3000)
    if (provinceId) q = q.eq('led_province_id', provinceId)
    if (dateFrom) q = q.gte('created_at', `${dateFrom}T00:00:00+07:00`)
    if (dateTo) q = q.lte('created_at', `${dateTo}T23:59:59+07:00`)
    if (assetSearch.trim()) q = q.ilike('str_bid_num', `%${assetSearch.trim()}%`)

    const { data, error } = await q
    if (error) throw error
    setAssetCap((data || []).length >= 3000)
    return (data || []).map(x => x.id)
  }, [provinceId, dateFrom, dateTo, assetSearch])

  /** query หลัก: parcels + filter ผ่าน asset_parcels!inner(asset_id) — mirror
   *  pattern เดียวกับที่ AdminCrawlerPage ใช้ดึงพิกัดของ modal "รายการใหม่"
   *  (พิสูจน์แล้วว่าใช้งานได้จริงในโปรเจกต์นี้) */
  const buildParcelsQuery = (matchingAssetIds) => {
    let q = supabase
      .from('parcels')
      .select(
        'id, provid, amph2, parcelno, latitude, longitude, verify_status, tag, ' +
        'land_price_per_sqw, fetched_at, updated_at, asset_parcels!inner(asset_id)',
        { count: 'exact' }
      )

    if (matchingAssetIds !== null) {
      if (matchingAssetIds.length === 0) return null // ไม่มี asset ตรง filter เลย — ไม่ต้อง query parcels ต่อ
      q = q.in('asset_parcels.asset_id', matchingAssetIds)
    }

    if (statusFilter === 'no_coords') q = q.is('latitude', null)
    else if (statusFilter) q = q.eq('verify_status', statusFilter)

    if (tagFilter === 'has') q = q.not('tag', 'is', null)
    else if (tagFilter === 'none') q = q.is('tag', null)

    if (deedSearch.trim()) q = q.ilike('parcelno', `%${deedSearch.trim()}%`)

    return q
  }

  /** ดึง asset ตัวแทน 1 รายการต่อ parcel (โชว์ในตารางให้รู้ว่าโฉนดนี้เป็นของทรัพย์ไหน)
   *  parcel เดียวอาจผูกหลาย asset ได้ (เช่นห้องชุดในตึกเดียวกันใช้โฉนดที่ดินร่วมกัน)
   *  — เลือกโชว์ตัวแรกพอ ไม่ต้องเห็นทั้งหมด */
  const fetchRepresentativeAssets = async (parcelIds) => {
    if (!parcelIds.length) return {}
    const map = {}
    const chunkSize = 200
    for (let i = 0; i < parcelIds.length; i += chunkSize) {
      const chunk = parcelIds.slice(i, i + chunkSize)
      const { data, error } = await supabase
        .from('asset_parcels')
        .select('parcel_id, assets(id, str_bid_num, led_province_name, deedampur, deedtumbol, asset_type_desc, assetprice3, created_at)')
        .in('parcel_id', chunk)
      if (error) throw error
      for (const row of data || []) {
        if (!row.assets) continue
        if (!map[row.parcel_id]) map[row.parcel_id] = []
        map[row.parcel_id].push(row.assets)
      }
    }
    return map
  }

  const loadPage = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    setEditingId(null)
    try {
      const matchingAssetIds = await fetchMatchingAssetIds()
      const q = buildParcelsQuery(matchingAssetIds)

      if (q === null) {
        setRows([])
        setTotal(0)
        setLoading(false)
        return
      }

      const from = (page - 1) * PAGE_SIZE
      const { data, error, count } = await q
        .order('id', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)

      if (error) throw error
      setTotal(count || 0)

      const parcelIds = (data || []).map(p => p.id)
      const assetMap = await fetchRepresentativeAssets(parcelIds)

      setRows((data || []).map(p => ({
        ...p,
        _assets: assetMap[p.id] || [],
      })))
    } catch (e) {
      setLoadError(e.message)
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, tagFilter, deedSearch, fetchMatchingAssetIds]) // eslint-disable-line

  useEffect(() => { loadPage() }, [loadPage])

  // เปลี่ยน filter ใดๆ ก็ตาม → กลับไปหน้า 1 เสมอ
  const applyFilters = (fn) => {
    fn()
    setPage(1)
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setEditLat(row.latitude != null ? String(row.latitude) : '')
    setEditLng(row.longitude != null ? String(row.longitude) : '')
    setEditTag(row.tag || '')
    setEditError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  /** บันทึก lat/long/tag ที่แก้เอง — set verify_status='manual' เสมอเมื่อกรอกพิกัด
   *  เอง (กัน landsmaps_collector รอบหน้ามารันทับ ดู is_retryable() ฝั่ง backend
   *  ที่ข้าม status นี้ไปแล้ว) ถ้าลบพิกัดออกทั้งคู่ (เว้นว่าง) จะไม่บังคับ manual */
  const saveEdit = async (row) => {
    setEditError(null)
    if (!isPlausibleThaiLatLng(editLat, editLng)) {
      setEditError('lat/long ดูไม่อยู่ในกรอบพิกัดของไทย (lat 5–21, long 97–106) เช็คอีกทีก่อนบันทึก')
      return
    }
    setSaving(true)
    try {
      const lat = editLat.trim() === '' ? null : Number(editLat)
      const lng = editLng.trim() === '' ? null : Number(editLng)
      const tag = editTag.trim() === '' ? null : editTag.trim()

      const patch = { tag, updated_at: new Date().toISOString() }
      if (lat != null && lng != null) {
        patch.latitude = lat
        patch.longitude = lng
        patch.verify_status = 'manual'
      } else {
        patch.latitude = lat
        patch.longitude = lng
      }

      const { error } = await supabase.from('parcels').update(patch).eq('id', row.id)
      if (error) throw error

      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, ...patch } : r)))
      setEditingId(null)
    } catch (e) {
      setEditError(e.message)
    } finally {
      setSaving(false)
    }
  }

  /** Export parcel ทุกแถวที่ตรง filter ปัจจุบัน (ไม่ใช่แค่หน้าที่เห็น) เป็น JSON */
  /** Export asset ที่ผูกกับ parcel ที่ตรง filter ปัจจุบัน — รูปแบบเดียวกับที่
   *  AdminCrawlerPage.jsx export ให้ modal "รายการใหม่" (field ตรงกับที่
   *  landsmaps_supabase.get_new_assets() ใช้ปกติ) เอาไฟล์นี้ไปรันกับ
   *  landsmaps_collector_local.py --file <ไฟล์นี้> ได้เลย — ใช้เวลาอยากรีรัน
   *  เฉพาะโฉนดที่ mismatch/not_found ให้ landsmaps ลองดึงพิกัดใหม่ */
  const exportFilteredJson = async () => {
    setExporting(true)
    try {
      const matchingAssetIds = await fetchMatchingAssetIds()
      const q = buildParcelsQuery(matchingAssetIds)
      if (q === null) {
        alert('ไม่มีรายการที่ตรง filter ให้ export')
        return
      }

      // 1) ดึง parcel ทุกแถวที่ตรง filter จริง (ไม่ใช่แค่หน้าที่เห็น)
      const pageSize = 1000
      let from = 0
      let allParcels = []
      while (true) {
        const qq = buildParcelsQuery(matchingAssetIds) // สร้าง query builder ใหม่ทุกรอบ — ตัวเดิม reuse ข้าม .range() ไม่ได้ปลอดภัย
        const { data, error } = await qq.order('id', { ascending: true }).range(from, from + pageSize - 1)
        if (error) throw error
        allParcels = allParcels.concat(data || [])
        if (!data || data.length < pageSize) break
        from += pageSize
      }
      if (allParcels.length === 0) {
        alert('ไม่มีรายการที่ตรง filter ให้ export')
        return
      }

      // 2) หา asset id ทั้งหมดที่ผูกกับ parcel เหล่านี้ (dedupe — parcel เดียวอาจ
      //    ผูกหลาย asset ได้ เช่นห้องชุดในตึกเดียวกันใช้โฉนดที่ดินร่วมกัน)
      const parcelIds = allParcels.map(p => p.id)
      const chunkSize = 200
      const assetIdSet = new Set()
      for (let i = 0; i < parcelIds.length; i += chunkSize) {
        const chunk = parcelIds.slice(i, i + chunkSize)
        const { data, error } = await supabase.from('asset_parcels').select('asset_id').in('parcel_id', chunk)
        if (error) throw error
        for (const row of data || []) assetIdSet.add(row.asset_id)
      }
      const assetIds = [...assetIdSet]

      // 3) ดึง asset เต็มรูปแบบตาม NEW_ASSETS_FIELDS
      let allAssets = []
      for (let i = 0; i < assetIds.length; i += chunkSize) {
        const chunk = assetIds.slice(i, i + chunkSize)
        const { data, error } = await supabase.from('assets').select(NEW_ASSETS_FIELDS).in('id', chunk)
        if (error) throw error
        allAssets = allAssets.concat(data || [])
      }

      const payload = {
        exported_at: new Date().toISOString(),
        filters: {
          province_id: provinceId || null, verify_status: statusFilter || null,
          tag: tagFilter || null, deed_search: deedSearch || null,
          asset_search: assetSearch || null, date_from: dateFrom || null, date_to: dateTo || null,
        },
        total: allAssets.length,
        assets: allAssets,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tpis_parcels_export_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Export ไม่สำเร็จ: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="admin-wrap admin-wrap-wide">

      {/* Filters */}
      <div className="admin-section">
        <div className="admin-section-hd">
          <span className="admin-section-title">ตัวกรอง</span>
          <button className="abtn secondary" onClick={exportFilteredJson} disabled={exporting || loading}>
            {exporting ? 'กำลัง Export...' : '⬇ Export JSON (ตาม filter)'}
          </button>
        </div>
        <div className="admin-section-body">
          <div className="parcels-filter-grid">
            <div className="pf-field">
              <label>จังหวัด</label>
              <select value={provinceId} onChange={e => applyFilters(() => setProvinceId(e.target.value))}>
                <option value="">ทุกจังหวัด</option>
                {PROVINCES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label>สถานะพิกัด</label>
              <select value={statusFilter} onChange={e => applyFilters(() => setStatusFilter(e.target.value))}>
                {VERIFY_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label>Tag</label>
              <select value={tagFilter} onChange={e => applyFilters(() => setTagFilter(e.target.value))}>
                <option value="">ทั้งหมด</option>
                <option value="has">มี tag แล้ว</option>
                <option value="none">ยังไม่มี tag</option>
              </select>
            </div>
            <div className="pf-field">
              <label>ค้นหาเลขโฉนด</label>
              <input value={deedSearch} onChange={e => applyFilters(() => setDeedSearch(e.target.value))} placeholder="เช่น 3081" />
            </div>
            <div className="pf-field">
              <label>ค้นหาเลขที่ทรัพย์ (LED)</label>
              <input value={assetSearch} onChange={e => applyFilters(() => setAssetSearch(e.target.value))} placeholder="เช่น 93 - 1" />
            </div>
            <div className="pf-field">
              <label>รายการใหม่ตั้งแต่วันที่</label>
              <input type="date" value={dateFrom} onChange={e => applyFilters(() => setDateFrom(e.target.value))} />
            </div>
            <div className="pf-field">
              <label>ถึงวันที่</label>
              <input type="date" value={dateTo} onChange={e => applyFilters(() => setDateTo(e.target.value))} />
            </div>
          </div>
          {assetCap && (
            <div className="alert warning" style={{ marginTop: 10 }}>
              จำนวนทรัพย์ที่ตรง filter เยอะเกิน 3,000 รายการ — ผลลัพธ์อาจไม่ครบ ลองแคบช่วงวันที่/จังหวัดลง
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="admin-section">
        <div className="admin-section-hd">
          <span className="admin-section-title">
            รายการโฉนด {loading ? '' : `(พบ ${fmtNum(totalCount)} รายการ)`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem', color: 'var(--text-3)' }}>
            <button className="abtn secondary" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>‹ ก่อนหน้า</button>
            <span>หน้า {page} / {totalPages}</span>
            <button className="abtn secondary" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>ถัดไป ›</button>
          </div>
        </div>

        {loadError && <div className="alert error" style={{ margin: 18 }}>{loadError}</div>}

        {loading ? (
          <div className="state-box" style={{ padding: '30px 0' }}>
            <div className="dots"><span/><span/><span/></div>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', padding: '24px 18px' }}>
            ไม่พบรายการที่ตรงกับ filter
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="runs-table">
              <thead>
                <tr>
                  <th>เลขโฉนด</th>
                  <th>เลขที่ทรัพย์</th>
                  <th>จังหวัด</th>
                  <th>อำเภอ / ตำบล</th>
                  <th>ประเภท</th>
                  <th>ราคาประเมิน</th>
                  <th>สถานะ</th>
                  <th>Tag</th>
                  <th>Lat</th>
                  <th>Long</th>
                  <th>อัพเดตล่าสุด</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const asset = row._assets[0]
                  const extra = row._assets.length - 1
                  const isEditing = editingId === row.id
                  return (
                    <tr key={row.id} className={isEditing ? 'parcel-row-editing' : ''}>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{row.parcelno}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {asset?.str_bid_num || '—'}{extra > 0 && <span style={{ color: 'var(--text-3)' }}> +{extra} อื่นๆ</span>}
                      </td>
                      <td>{asset?.led_province_name || '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                        {[asset?.deedampur, asset?.deedtumbol].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{asset?.asset_type_desc || '—'}</td>
                      <td style={{ fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{fmtBahtExact(asset?.assetprice3)}</td>
                      <td>
                        <span className={`parcel-status parcel-status-${row.verify_status}`}>
                          {VERIFY_STATUS_LABEL[row.verify_status] || row.verify_status || '—'}
                        </span>
                      </td>

                      {isEditing ? (
                        <>
                          <td>
                            <input className="pf-inline-input" style={{ width: 130 }} value={editTag}
                              onChange={e => setEditTag(e.target.value)} placeholder="ชื่อคอนโด/สถานที่" />
                          </td>
                          <td>
                            <input className="pf-inline-input" style={{ width: 100 }} value={editLat}
                              onChange={e => setEditLat(e.target.value)} placeholder="13.xxxxxx" />
                          </td>
                          <td>
                            <input className="pf-inline-input" style={{ width: 100 }} value={editLng}
                              onChange={e => setEditLng(e.target.value)} placeholder="100.xxxxxx" />
                          </td>
                          <td colSpan={2}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="abtn primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => saveEdit(row)} disabled={saving}>
                                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                              </button>
                              <button className="abtn secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={cancelEdit} disabled={saving}>
                                ยกเลิก
                              </button>
                            </div>
                            {editError && <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: 4 }}>{editError}</div>}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontSize: '0.8rem' }}>{row.tag || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{fmtLatLng(row.latitude)}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{fmtLatLng(row.longitude)}</td>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                            {fmtDateTime(row.updated_at || row.fetched_at)}
                          </td>
                          <td>
                            <button className="abtn secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => startEdit(row)}>
                              แก้ไข
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
