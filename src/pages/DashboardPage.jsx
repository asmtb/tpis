import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { supabase } from '../lib/supabase.js'
import { fmtPrice, fmtNum, fmtDateTime } from '../lib/utils.js'

const PIE_COLORS = ['#1A3A5C', '#C2410C', '#15803D', '#92400E', '#6B6560']

/** Custom tooltip สำหรับ bar chart */
function BarTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)', padding: '8px 12px',
      fontSize: 12, fontFamily: 'var(--font)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{d.payload.city || d.payload.name}</div>
      <div style={{ color: 'var(--accent)' }}>ทรัพย์ทั้งหมด: {fmtNum(d.payload.total_assets)}</div>
      {d.payload.total_active != null && (
        <div style={{ color: 'var(--green)' }}>เปิดประมูล: {fmtNum(d.payload.total_active)}</div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats]       = useState(null)
  const [provinces, setProvinces] = useState([])
  const [typeData, setTypeData] = useState([])
  const [recentRuns, setRecentRuns] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [
          { count: total },
          { count: active },
          { count: sold },
          { count: withCoords },
          { data: provData },
          { data: runData },
        ] = await Promise.all([
          supabase.from('assets').select('*', { count: 'exact', head: true }),
          supabase.from('assets').select('*', { count: 'exact', head: true }).eq('is_closed', false),
          supabase.from('assets').select('*', { count: 'exact', head: true }).eq('is_sold', true),
          supabase.from('asset_parcels').select('*', { count: 'exact', head: true }),
          supabase.from('province_summary')
            .select('led_province_name, total_assets, total_active, avg_price')
            .order('total_assets', { ascending: false })
            .limit(15),
          supabase.from('crawler_runs')
            .select('id, started_at, finished_at, status, run_mode, total_records_fetched, duration_sec, code_version')
            .order('started_at', { ascending: false })
            .limit(5),
        ])

        setStats({ total: total || 0, active: active || 0, sold: sold || 0, withCoords: withCoords || 0 })
        setProvinces(provData || [])
        setRecentRuns(runData || [])

        // Type counts: 3 separate count queries
        const [{ count: c001 }, { count: c002 }, { count: c003 }] = await Promise.all([
          supabase.from('assets').select('*', { count: 'exact', head: true }).eq('asset_type_id', '001'),
          supabase.from('assets').select('*', { count: 'exact', head: true }).eq('asset_type_id', '002'),
          supabase.from('assets').select('*', { count: 'exact', head: true }).eq('asset_type_id', '003'),
        ])
        const other = (total || 0) - (c001 || 0) - (c002 || 0) - (c003 || 0)
        setTypeData([
          { name: 'ที่ดิน',     value: c001 || 0 },
          { name: 'ห้องชุด',    value: c002 || 0 },
          { name: 'บ้าน/อาคาร', value: c003 || 0 },
          ...(other > 0 ? [{ name: 'อื่นๆ', value: other }] : []),
        ])
      } catch (e) {
        console.error('Dashboard error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="state-box" style={{ paddingTop: 80 }}>
      <div className="dots"><span/><span/><span/></div>
    </div>
  )

  const maxProv = provinces[0]?.total_assets || 1

  return (
    <div className="dash-wrap">

      {/* Header */}
      <div className="dash-hd">
        <div>
          <div className="dash-title">Dashboard</div>
          <div className="dash-sub">ข้อมูลทรัพย์ขายทอดตลาดทั่วประเทศ</div>
        </div>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card c-accent">
            <div className="stat-card-lbl">ทรัพย์ทั้งหมด</div>
            <div className="stat-card-val">{fmtNum(stats.total)}</div>
            <div className="stat-card-sub">รายการในระบบ</div>
          </div>
          <div className="stat-card c-green">
            <div className="stat-card-lbl">เปิดประมูลอยู่</div>
            <div className="stat-card-val">{fmtNum(stats.active)}</div>
            <div className="stat-card-sub">{stats.total > 0 ? `${Math.round(stats.active / stats.total * 100)}% ของทั้งหมด` : '—'}</div>
          </div>
          <div className="stat-card c-red">
            <div className="stat-card-lbl">ขายแล้ว</div>
            <div className="stat-card-val">{fmtNum(stats.sold)}</div>
            <div className="stat-card-sub">{stats.total > 0 ? `${Math.round(stats.sold / stats.total * 100)}%` : '—'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-lbl">มีพิกัด GPS</div>
            <div className="stat-card-val">{fmtNum(stats.withCoords)}</div>
            <div className="stat-card-sub">
              {stats.total > 0 ? `${Math.round(stats.withCoords / stats.total * 100)}% ของทั้งหมด` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="charts-grid">

        {/* Province bar chart */}
        <div className="chart-panel">
          <div className="chart-panel-title">ทรัพย์ตามจังหวัด (Top 15)</div>
          {provinces.length > 0 ? (
            <div className="province-rows">
              {provinces.map(p => (
                <div key={p.led_province_name} className="province-row">
                  <div className="prov-name" title={p.led_province_name}>{p.led_province_name}</div>
                  <div className="prov-bar-wrap">
                    <div className="prov-bar-fill" style={{ width: `${(p.total_assets / maxProv) * 100}%` }}/>
                  </div>
                  <div className="prov-count">{fmtNum(p.total_assets)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>ไม่มีข้อมูล</div>
          )}
        </div>

        {/* Type pie */}
        <div className="chart-panel">
          <div className="chart-panel-title">สัดส่วนประเภททรัพย์</div>
          {typeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%" cy="50%"
                    innerRadius={48} outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [fmtNum(v), 'จำนวน']}
                    contentStyle={{ fontFamily: 'var(--font)', fontSize: 12, borderRadius: 'var(--r-sm)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {typeData.map((d, i) => {
                  const total = typeData.reduce((s, x) => s + x.value, 0)
                  return (
                    <div key={d.name} className="pie-leg-row">
                      <div className="pie-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <div className="pie-leg-name">{d.name}</div>
                      <div className="pie-leg-pct">{fmtNum(d.value)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', width: 36, textAlign: 'right' }}>
                        {total > 0 ? `${Math.round(d.value / total * 100)}%` : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>ไม่มีข้อมูล</div>
          )}
        </div>
      </div>

      {/* Recent crawler runs */}
      {recentRuns.length > 0 && (
        <div className="admin-section">
          <div className="admin-section-hd">
            <span className="admin-section-title">Crawler Runs ล่าสุด</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="runs-table">
              <thead>
                <tr>
                  <th>เวลาเริ่ม</th>
                  <th>Mode</th>
                  <th>สถานะ</th>
                  <th>Records</th>
                  <th>เวลา (นาที)</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>
                      {fmtDateTime(r.started_at)}
                    </td>
                    <td><span className="run-mode">{r.run_mode || 'led'}</span></td>
                    <td>
                      <span className={`run-status ${r.status}`}>
                        {r.status === 'completed' ? '✓ สำเร็จ'
                          : r.status === 'running'   ? '⟳ กำลังรัน'
                          : r.status === 'failed'    ? '✗ ล้มเหลว'
                          :                           r.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{fmtNum(r.total_records_fetched)}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>
                      {r.duration_sec ? `${(r.duration_sec / 60).toFixed(1)}` : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                      {r.code_version || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
