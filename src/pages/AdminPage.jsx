import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { fmtNum, fmtDateTime, fmtRelative } from '../lib/utils.js'

export default function AdminPage() {
  const [runs, setRuns]             = useState([])
  const [session, setSession]       = useState(null)
  const [pendingStats, setPending]  = useState(null)
  const [loading, setLoading]       = useState(true)
  const [sessionNote, setSessionNote] = useState('')
  const [uploading, setUploading]   = useState(false)
  const [uploadMsg, setUploadMsg]   = useState(null)
  const [cookieText, setCookieText] = useState('')

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
            .select('id, started_at, finished_at, status, run_mode, total_records_fetched, total_provinces_success, total_provinces_failed, duration_sec, code_version, error_message, triggered_by')
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
