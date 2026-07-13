import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

/** Animated counter */
function Counter({ target }) {
  const [val, setVal] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (!target || started.current) return
    started.current = true
    const dur = 1200
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target])

  return val.toLocaleString()
}

const STATS = [
  {
    key: 'total',
    label: 'ทรัพย์ทั้งหมด',
    color: 'c-accent',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    key: 'today',
    label: 'ประมูลวันนี้',
    color: 'c-orange',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    key: 'provinces',
    label: 'จังหวัดที่มีทรัพย์',
    color: 'c-blue',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    key: 'active',
    label: 'เปิดประมูลอยู่',
    color: 'c-green',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
]

export default function HeroStats() {
  const [data, setData] = useState({ total: 0, today: 0, provinces: 0, active: 0 })

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    Promise.all([
      supabase.from('assets').select('*', { count: 'exact', head: true }),
      supabase.from('asset_bid_rounds').select('*', { count: 'exact', head: true })
        .eq('bid_date', todayStr).eq('issale_code', '0'),
      supabase.from('province_summary').select('led_province_id'),
      supabase.from('assets').select('*', { count: 'exact', head: true }).eq('is_closed', false),
    ]).then(([r1, r2, r3, r4]) => {
      setData({
        total:     r1.count || 0,
        today:     r2.count || 0,
        provinces: r3.data?.length || 0,
        active:    r4.count || 0,
      })
    })
  }, [])

  return (
    <div className="hero-stats">
      {STATS.map(s => (
        <div key={s.key} className="hero-stat">
          <div className={`hero-stat-icon ${s.color}`}>{s.icon}</div>
          <div className="hero-stat-info">
            <div className="hero-stat-val"><Counter target={data[s.key]} /></div>
            <div className="hero-stat-lbl">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
