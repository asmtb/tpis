import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase.js'
import { fmtNum, fmtDateTime, fmtRelative } from '../lib/utils.js'

/** run เป็นรอบ LED หรือไม่ (มีแค่รอบ LED เท่านั้นที่มีแนวคิด "รายการใหม่" ของ assets) */
const isLedRun = (r) => r.run_mode === 'led' || r.run_mode === 'upload' || !r.run_mode

/** ราคาแบบจำนวนเต็มจริง มีคอมม่าคั่นหลัก ไม่ย่อเป็นล้าน/K */
const fmtBahtExact = (n) => (n == null ? '—' : `${Number(n).toLocaleString('en-US')} ฿`)

/** พิกัดจาก parcels — โชว์ทศนิยม 6 ตำแหน่ง, ว่างไว้ "—" ถ้ายังไม่มี (ยังไม่ได้รัน landsmaps) */
const fmtLatLng = (v) => (v == null ? '—' : Number(v).toFixed(6))

export default function AdminPage() {
  const [runs, setRuns]             = useState([])
  const [session, setSession]       = useState(null)
  const [pendingStats, setPending]  = useState(null)
  const [loading, setLoading]       = useState(true)
  const [sessionNote, setSessionNote] = useState('')
  const [uploading, setUploading]   = useState(false)
  const [uploadMsg, setUploadMsg]   = useState(null)
  const [cookieText, setCookieText] = useState('')

  // รายการใหม่ต่อรอบ — modal ดูรายละเอียด
  const [newModalRun, setNewModalRun]     = useState(null)
  const [newAssets, setNewAssets]         = useState([])
  const [newAssetsLoading, setNewLoading] = useState(false)
  const [newAssetsError, setNewError]     = useState(null)
  const [exporting, setExporting]         = useState(false)
  // พิกัดของแต่ละ asset (asset_id -> [{parcelno, latitude, longitude}]) — มาจาก parcels
  // ผ่าน asset_parcels, ยังไม่มีถ้า asset นั้นยังไม่เคยรัน landsmaps
  const [parcelsByAsset, setParcelsByAsset]     = useState({})
  // asset ไหนที่กด "เลขโฉนด" ขยายดู sub-row พิกัดรายแปลงอยู่บ้าง (รองรับขยายได้หลายแถวพร้อมกัน)
  const [expandedDeedRows, setExpandedDeedRows] = useState(() => new Set())

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: runsData },
          { data: sessionData },
          { count: totalAssets },
          { count: withCoords },
        ] = await Promise.all([
          supabase.from('crawler_runs')
            .select('id, started_at, finished_at, status, run_mode, total_records_fetched, total_records_new, total_provinces_success, total_provinces_failed, duration_sec, code_version, error_message, triggered_by')
            .order('started_at', { ascending: false })
            .limit(15),
          supabase.from('landsmaps_sessions')
            .select('uploaded_at, note, is_active')
            .eq('is_active', true)
            .maybeSingle(),
          supabase.from('assets').select('*', { count: 'exact', head: true }),
          supabase.from('asset_parcels').select('*', { count: 'exact', head: true }),
        ])

        setRuns(runsData || [])
        setSession(sessionData)
        setPending({
          total: totalAssets || 0,
          withCoords: withCoords || 0,
          pending: Math.max(0, (totalAssets || 0) - (withCoords || 0)),
        })
      } catch (e) {
        console.error('Admin load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleUploadSession = async () => {
    setUploading(true)
    setUploadMsg(null)
    try {
      let cookies
      try {
        cookies = JSON.parse(cookieText)
      } catch {
        throw new Error('รูปแบบ JSON ไม่ถูกต้อง — ต้องเป็น JSON object เช่น {"INGRESSCOOKIE": "abc123", ...}')
      }

      // Deactivate existing
      await supabase.from('landsmaps_sessions')
        .update({ is_active: false })
        .eq('is_active', true)

      // Insert new
      const { error } = await supabase.from('landsmaps_sessions').insert({
        cookies_json: cookies,
        note: sessionNote || `Uploaded ${new Date().toLocaleString('th-TH')}`,
        is_active: true,
      })
      if (error) throw error

      setUploadMsg({ type: 'success', text: 'Upload cookies สำเร็จ ✓ พร้อมใช้งานแล้ว' })
      setCookieText('')
      setSessionNote('')

      // Refresh session
      const { data } = await supabase.from('landsmaps_sessions')
        .select('uploaded_at, note, is_active').eq('is_active', true).single()
      setSession(data)
    } catch (e) {
      setUploadMsg({ type: 'error', text: `Upload ไม่สำเร็จ: ${e.message}` })
    } finally {
      setUploading(false)
    }
  }

  /** field ที่ query มาโชว์ในตาราง + ใช้ export ให้ landsmaps collector ได้เลย
   *  (ตรงกับที่ landsmaps_supabase.get_new_assets() ดึงปกติ) */
  const NEW_ASSETS_FIELDS =
    'id, str_bid_num, led_province_id, led_province_name, city, ampur, ' +
    'deedcity, deedampur, deedtumbol, deedno, deedno_raw, deedno_count, ' +
    'asset_type_id, asset_type_desc, assetprice3, rai, ngan, wa, url_picture, created_at'

  /** ดึงพิกัดของ asset ชุดนี้จาก parcels (ผ่าน asset_parcels) เป็น map asset_id -> parcels[]
   *  แบ่ง chunk กัน URL ยาวเกินตอน asset เยอะ (.in() หลายร้อย id) */
  const fetchParcelsForAssets = async (assetIds) => {
    const map = {}
    const chunkSize = 200
    for (let i = 0; i < assetIds.length; i += chunkSize) {
      const chunk = assetIds.slice(i, i + chunkSize)
      const { data, error } = await supabase
        .from('asset_parcels')
        .select('asset_id, parcels(parcelno, latitude, longitude)')
        .in('asset_id', chunk)
      if (error) throw error
      for (const row of data || []) {
        if (!row.parcels) continue
        if (!map[row.asset_id]) map[row.asset_id] = []
        map[row.asset_id].push({
          parcelno:  row.parcels.parcelno,
          latitude:  row.parcels.latitude,
          longitude: row.parcels.longitude,
        })
      }
    }
    return map
  }

  /** เปิด modal ดูรายการ asset ใหม่ของรอบนั้นๆ
   *  "ใหม่" = assets.created_at อยู่ในช่วง [started_at, finished_at] ของ run
   *  (created_at ตั้งครั้งเดียวตอน insert แรก ไม่ถูกเขียนทับตอน upsert ซ้ำ) */
  const openNewItems = async (run) => {
    setNewModalRun(run)
    setNewLoading(true)
    setNewError(null)
    setNewAssets([])
    setParcelsByAsset({})
    setExpandedDeedRows(new Set())
    try {
      const gte = run.started_at
      const lte = run.finished_at || new Date().toISOString()
      const { data, error, count } = await supabase
        .from('assets')
        .select(NEW_ASSETS_FIELDS, { count: 'exact' })
        .gte('created_at', gte)
        .lte('created_at', lte)
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      setNewAssets(data || [])

      // รอบเก่าที่ยังไม่มี total_records_new ใน DB (deploy ก่อนหน้านี้) — เติมค่าจาก query จริงแทน
      if (run.total_records_new == null && count != null) {
        setRuns(prev => prev.map(x => (x.id === run.id ? { ...x, total_records_new: count } : x)))
      }

      // ดึงพิกัด — ถ้ายังไม่เคยรัน landsmaps ให้ asset ชุดนี้ จะได้ map ว่างๆ กลับมา
      // (ไม่ throw ให้ modal เปิดไม่ได้ทั้งที่รายการหลักโหลดสำเร็จแล้ว)
      const ids = (data || []).map(x => x.id)
      if (ids.length) {
        try {
          setParcelsByAsset(await fetchParcelsForAssets(ids))
        } catch (pe) {
          console.error('โหลดพิกัด parcels ไม่สำเร็จ:', pe)
        }
      }
    } catch (e) {
      setNewError(e.message)
    } finally {
      setNewLoading(false)
    }
  }

  const toggleDeedExpand = (assetId) => {
    setExpandedDeedRows(prev => {
      const next = new Set(prev)
      if (next.has(assetId)) next.delete(assetId)
      else next.add(assetId)
      return next
    })
  }

  const closeNewItems = () => {
    setNewModalRun(null)
    setNewAssets([])
    setNewError(null)
    setParcelsByAsset({})
    setExpandedDeedRows(new Set())
  }

  /** Export รายการใหม่ทั้งหมดของรอบนี้เป็นไฟล์ JSON — ดึงทุกแถวจริง (ไม่ตัดที่ 500
   *  แบบตอนโชว์ในตาราง) แบ่งหน้าด้วย .range() กันโดน PostgREST cap ที่ 1,000 แถว/ครั้ง
   *  field ที่ได้ตรงกับที่ landsmaps_collector_local.py ต้องใช้ ให้เอาไฟล์นี้ไปรัน
   *  บนเครื่องตัวเองด้วย: python landsmaps_collector_local.py --file <ไฟล์นี้> */
  const exportNewAssetsJson = async () => {
    if (!newModalRun) return
    setExporting(true)
    setNewError(null)
    try {
      const gte = newModalRun.started_at
      const lte = newModalRun.finished_at || new Date().toISOString()
      const pageSize = 1000
      let from = 0
      let all = []
      while (true) {
        const { data, error } = await supabase
          .from('assets')
          .select(NEW_ASSETS_FIELDS)
          .gte('created_at', gte)
          .lte('created_at', lte)
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1)
        if (error) throw error
        all = all.concat(data || [])
        if (!data || data.length < pageSize) break
        from += pageSize
      }

      const payload = {
        run_id:      newModalRun.id,
        started_at:  newModalRun.started_at,
        finished_at: newModalRun.finished_at,
        exported_at: new Date().toISOString(),
        total:       all.length,
        assets:      all,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `tpis_new_assets_run${newModalRun.id}_${(newModalRun.started_at || '').slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setNewError('Export ไม่สำเร็จ: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <div className="state-box" style={{ paddingTop: 80 }}>
      <div className="dots"><span/><span/><span/></div>
    </div>
  )

  const lastLED = runs.find(r => r.run_mode === 'led' || !r.run_mode)
  const lastLM  = runs.find(r => r.run_mode === 'landsmaps')

  return (
    <div className="admin-wrap">

      <div>
        <div className="admin-title">Admin Panel</div>
        <div style={{ fontSize: '0.83rem', color: 'var(--text-3)' }}>
          จัดการ crawler, session cookies และดูสถิติระบบ
        </div>
      </div>

      {/* Stats overview */}
      {pendingStats && (
        <div className="admin-section">
          <div className="admin-section-hd">
            <span className="admin-section-title">สถิติระบบ</span>
          </div>
          <div className="admin-section-body">
            <div className="mini-stats">
              <div className="mini-stat">
                <div className="mini-stat-lbl">ทรัพย์ทั้งหมด</div>
                <div className="mini-stat-val" style={{ color: 'var(--accent)' }}>{fmtNum(pendingStats.total)}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-lbl">มีพิกัดแล้ว</div>
                <div className="mini-stat-val" style={{ color: 'var(--green)' }}>{fmtNum(pendingStats.withCoords)}</div>
              </div>
              <div className="mini-stat">
                <div className="mini-stat-lbl">รอดึงพิกัด</div>
                <div className="mini-stat-val" style={{ color: pendingStats.pending > 0 ? 'var(--bid)' : 'var(--text-3)' }}>
                  {fmtNum(pendingStats.pending)}
                </div>
              </div>
            </div>
            {pendingStats.pending > 0 && (
              <div className="alert warning">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>
                  มี <strong>{fmtNum(pendingStats.pending)}</strong> รายการที่ยังไม่มีพิกัด — รัน LandsMaps Collector ผ่าน <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 3 }}>run_landsmaps_local.bat</code> บนเครื่องตัวเอง
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LED Crawler status */}
      <div className="admin-section">
        <div className="admin-section-hd">
          <span className="admin-section-title">LED Crawler</span>
          {lastLED && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
              รันล่าสุด: {fmtRelative(lastLED.started_at)}
            </span>
          )}
        </div>
        <div className="admin-section-body">
          {lastLED ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>สถานะ</div>
                  <span className={`run-status ${lastLED.status}`}>
                    {lastLED.status === 'completed' ? '✓ สำเร็จ'
                      : lastLED.status === 'running' ? '⟳ กำลังรัน'
                      : lastLED.status === 'failed'  ? '✗ ล้มเหลว'
                      : lastLED.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Records ที่ดึง</div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmtNum(lastLED.total_records_fetched)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>จังหวัด</div>
                  <div style={{ fontFamily: 'var(--mono)' }}>
                    {fmtNum(lastLED.total_provinces_success)}/{fmtNum((lastLED.total_provinces_success || 0) + (lastLED.total_provinces_failed || 0))}
                  </div>
                </div>
              </div>
              <div className="alert info" style={{ fontSize: '0.82rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1"/>
                </svg>
                LED Crawler รันอัตโนมัติบน Google Cloud Run (asia-southeast3) ทุก 3 วัน ผ่าน Cloud Scheduler
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>ยังไม่มีประวัติการรัน</div>
          )}
        </div>
      </div>

      {/* LandsMaps session */}
      <div className="admin-section">
        <div className="admin-section-hd">
          <span className="admin-section-title">LandsMaps Session (Cookies)</span>
          {lastLM && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
              รันล่าสุด: {fmtRelative(lastLM.started_at)}
            </span>
          )}
        </div>
        <div className="admin-section-body">

          {/* Current session status */}
          <div className="session-card">
            <div className={`session-dot ${session ? 'active' : 'inactive'}`}/>
            <div className="session-info">
              <div className="session-label">
                {session ? 'Cookies ใช้งานได้' : 'ไม่มี Active Session'}
              </div>
              <div className="session-meta">
                {session
                  ? `อัพโหลดเมื่อ: ${fmtDateTime(session.uploaded_at)}${session.note ? ` — ${session.note}` : ''}`
                  : 'รัน run_landsmaps_local.bat บนเครื่องตัวเองเพื่อดึงข้อมูล'
                }
              </div>
            </div>
          </div>

          {!session && (
            <div className="alert warning">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
              </svg>
              Incapsula ผูก cookies กับ IP ต้นทาง — ต้องรัน LandsMaps บนเครื่องตัวเองเท่านั้น
            </div>
          )}

          {/* Upload cookies form */}
          <details style={{ marginTop: 4 }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)', userSelect: 'none' }}>
              อัพโหลด Cookies ใหม่ (หลัง solve hCaptcha)
            </summary>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                  Cookies JSON (จาก test_cookies.json)
                </label>
                <textarea
                  value={cookieText}
                  onChange={e => setCookieText(e.target.value)}
                  placeholder='{"INGRESSCOOKIE": "abc123", "visid_incap_...": "..."}'
                  rows={5}
                  style={{
                    width: '100%', padding: '8px 10px',
                    border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
                    fontFamily: 'var(--mono)', fontSize: '0.78rem',
                    resize: 'vertical', background: 'var(--bg)', color: 'var(--text)',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
                  หมายเหตุ (optional)
                </label>
                <input
                  type="text"
                  value={sessionNote}
                  onChange={e => setSessionNote(e.target.value)}
                  placeholder="เช่น Solved manually 2026-07-11"
                  className="filter-input"
                />
              </div>
              {uploadMsg && (
                <div className={`alert ${uploadMsg.type === 'success' ? 'success' : 'error'}`}>
                  {uploadMsg.text}
                </div>
              )}
              <button
                className="abtn primary"
                onClick={handleUploadSession}
                disabled={!cookieText.trim() || uploading}
              >
                {uploading ? 'กำลัง Upload...' : 'Upload Cookies'}
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* Crawler runs table */}
      <div className="admin-section">
        <div className="admin-section-hd">
          <span className="admin-section-title">Crawler Runs (15 รอบล่าสุด)</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {runs.length === 0 ? (
            <div style={{ padding: '20px 18px', color: 'var(--text-3)', fontSize: '0.875rem' }}>
              ไม่มีประวัติการรัน (ต้องการสิทธิ์ analyst/admin ในการอ่าน crawler_runs)
            </div>
          ) : (
            <table className="runs-table">
              <thead>
                <tr>
                  <th>เวลาเริ่ม</th>
                  <th>Mode</th>
                  <th>สถานะ</th>
                  <th>Records</th>
                  <th>รายการใหม่</th>
                  <th>จังหวัด</th>
                  <th>เวลา</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {fmtDateTime(r.started_at)}
                    </td>
                    <td><span className="run-mode">{r.run_mode || 'led'}</span></td>
                    <td>
                      <span className={`run-status ${r.status}`}>
                        {r.status === 'completed' ? '✓ สำเร็จ'
                          : r.status === 'running'   ? '⟳ กำลังรัน'
                          : r.status === 'failed'    ? '✗ ล้มเหลว'
                          : r.status === 'partial'   ? '⚠ บางส่วน'
                          : r.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{fmtNum(r.total_records_fetched)}</td>
                    <td>
                      {isLedRun(r) && (r.status === 'completed' || r.status === 'partial') ? (
                        <button
                          className="abtn secondary new-items-btn"
                          onClick={() => openNewItems(r)}
                        >
                          {r.total_records_new != null ? `+${fmtNum(r.total_records_new)}` : 'ดูรายการ'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-3)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)' }}>
                      {r.total_provinces_success != null
                        ? `${r.total_provinces_success}/${(r.total_provinces_success || 0) + (r.total_provinces_failed || 0)}`
                        : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                      {r.duration_sec ? `${(r.duration_sec / 60).toFixed(1)} นาที` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      {r.code_version || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal: รายการ asset ใหม่ของรอบที่เลือก */}
      {newModalRun && (
        <div className="lightbox-overlay" style={{ cursor: 'default' }} onClick={closeNewItems}>
          <div className="new-items-modal" onClick={e => e.stopPropagation()}>
            <div className="new-items-modal-hd">
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  รายการใหม่ — {fmtDateTime(newModalRun.started_at)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                  {newAssetsLoading
                    ? 'กำลังโหลด...'
                    : `พบ ${fmtNum(newModalRun.total_records_new ?? newAssets.length)} รายการ`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="abtn secondary" onClick={exportNewAssetsJson} disabled={exporting || newAssetsLoading}>
                  {exporting ? 'กำลัง Export...' : '⬇ Export JSON'}
                </button>
                <button className="abtn secondary" onClick={closeNewItems}>ปิด</button>
              </div>
            </div>
            <div className="new-items-modal-body">
              {newAssetsLoading && (
                <div className="state-box" style={{ padding: '30px 0' }}>
                  <div className="dots"><span/><span/><span/></div>
                </div>
              )}
              {newAssetsError && <div className="alert error">{newAssetsError}</div>}
              {!newAssetsLoading && !newAssetsError && newAssets.length === 0 && (
                <div style={{ color: 'var(--text-3)', fontSize: '0.875rem', padding: '20px 0' }}>
                  ไม่มีรายการใหม่ในรอบนี้
                </div>
              )}
              {!newAssetsLoading && newAssets.length > 0 && (
                <>
                  <table className="runs-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>เลขที่</th>
                        <th>จังหวัด</th>
                        <th>อำเภอ / ตำบล</th>
                        <th>เลขโฉนด</th>
                        <th>Lat</th>
                        <th>Long</th>
                        <th>ประเภท</th>
                        <th>ราคาประเมิน</th>
                        <th>เพิ่มเมื่อ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newAssets.map((a, i) => {
                        const deedList = Array.isArray(a.deedno) ? a.deedno.filter(Boolean) : []
                        const parcels  = parcelsByAsset[a.id] || []
                        const findParcel = (dn) => parcels.find(p => p.parcelno === dn)
                        const isMulti  = deedList.length > 1
                        const isExpanded = expandedDeedRows.has(a.id)
                        const singleParcel = deedList.length === 1 ? findParcel(deedList[0]) : null

                        return (
                          <Fragment key={a.id}>
                            <tr>
                              <td style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-3)' }}>
                                {i + 1}
                              </td>
                              <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                {a.str_bid_num || '—'}
                              </td>
                              <td>{a.led_province_name || '—'}</td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                                {[a.deedampur, a.deedtumbol].filter(Boolean).join(' / ') || '—'}
                              </td>
                              <td
                                className={isMulti ? 'deedno-cell clickable' : 'deedno-cell'}
                                onClick={isMulti ? () => toggleDeedExpand(a.id) : undefined}
                                title={isMulti ? (isExpanded ? 'กดเพื่อยุบ' : 'กดเพื่อดูพิกัดรายแปลง') : undefined}
                              >
                                {deedList.length === 0 ? (
                                  '—'
                                ) : isMulti ? (
                                  <>
                                    <span className="deedno-toggle-icon">{isExpanded ? '▾' : '▸'}</span>
                                    {deedList.length} แปลง ({deedList.slice(0, 2).join(', ')}
                                    {deedList.length > 2 ? ', …' : ''})
                                  </>
                                ) : (
                                  deedList[0]
                                )}
                              </td>
                              <td style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                                {isMulti ? '—' : fmtLatLng(singleParcel?.latitude)}
                              </td>
                              <td style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                                {isMulti ? '—' : fmtLatLng(singleParcel?.longitude)}
                              </td>
                              <td style={{ fontSize: '0.8rem' }}>{a.asset_type_desc || '—'}</td>
                              <td style={{ fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{fmtBahtExact(a.assetprice3)}</td>
                              <td style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                                {fmtDateTime(a.created_at)}
                              </td>
                            </tr>
                            {isMulti && isExpanded && deedList.map((dn, di) => {
                              const p = findParcel(dn)
                              return (
                                <tr key={`${a.id}-${dn}-${di}`} className="deedno-subrow">
                                  <td colSpan={4} className="deedno-subrow-spacer" />
                                  <td className="deedno-subrow-value">{dn}</td>
                                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                                    {fmtLatLng(p?.latitude)}
                                  </td>
                                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                                    {fmtLatLng(p?.longitude)}
                                  </td>
                                  <td colSpan={3} />
                                </tr>
                              )
                            })}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                  {newAssets.length === 500 && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 10 }}>
                      ตารางนี้แสดงแค่ 500 รายการแรก — Export JSON จะได้ครบทุกรายการจริง
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="alert info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <circle cx="12" cy="16" r="1"/>
        </svg>
        <div style={{ fontSize: '0.83rem', lineHeight: 1.6 }}>
          <strong>หน้า Admin ใช้ anon key</strong> — ข้อมูล crawler_runs ต้องการ role analyst/admin
          หากไม่เห็นข้อมูล runs ให้เพิ่ม policy ใน Supabase Dashboard หรือล็อกอินด้วย user ที่มี role analyst ขึ้นไป
        </div>
      </div>

    </div>
  )
}
