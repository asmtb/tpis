import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { supabase } from '../lib/supabase.js'
import LeafletMap from '../components/LeafletMap.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { useWishlist } from '../lib/WishlistContext.jsx'
import {
  fmtPriceFull, fmtArea, fmtDate, fmtLocation,
  typeClass, typeLabel, statusInfo, issaleInfo,
  calcDiscount, discountClass,
} from '../lib/utils.js'

/* ── เกณฑ์การลดราคาต่อนัด ──
   นัด 1: 100% ของราคาเริ่มประมูล (startPrice)
   นัดถัดไปจะ "ลด tier ลง 1 ขั้น" (สูงสุด 3 ขั้น = 70%) ก็ต่อเมื่อนัดก่อนหน้า
   มี issale_code === '3' (งดขายไม่มีผู้สู้ราคา) เท่านั้น — งดขายด้วยเหตุผล
   อื่น (คู่ความขอ/เจ้าพนักงานสั่ง/ศาลสั่ง ฯลฯ) ไม่กระตุ้นการลดราคา คง tier เดิม
   ยืนยัน algorithm นี้กับตัวอย่างจริงที่ ART ให้มาแล้ว (นัด1=100% code3,
   นัด2=90% code อื่น, นัด3=90% code อื่น, นัด4=90% code3, นัด5=80%) */
const TIER_MULTIPLIERS = [1, 0.9, 0.8, 0.7]
const TIER_COLORS      = ['var(--accent)', 'var(--teal)', 'var(--amber)', 'var(--green)']
const GREY             = 'var(--chart-grey)'

/**
 * คำนวณแท่งกราฟราคาเริ่มประมูลของแต่ละนัด
 *
 * ถ้าปิดประมูลแล้ว (isClosed): แสดง "ทุกนัดจริง" ที่มีอยู่ (ไม่จำกัด 4 แท่ง
 * เพราะเป็นข้อมูลจริงทั้งหมดแล้ว ไม่ใช่การคาดเดา) สีเทาหมดทุกแท่ง — สี tier
 * ไม่มีความหมายอีกต่อไปเมื่อประมูลจบแล้ว ไม่ว่าจะขายได้หรืองดขายจนหมดนัด
 *
 * ถ้ายังไม่ปิด: แสดงนัดที่มีข้อมูลจริง (เกิดแล้ว/กำลังรอ) สีตาม tier จริง
 * แล้ว "โปรเจกชัน" ต่อไปข้างหน้า (สมมติว่านัดที่ยังไม่ถึงจะงดขายไม่มีผู้สู้
 * ราคาไปเรื่อยๆ) จนครบ 4 แท่งเสมอ — แท่งโปรเจกชันเป็นสีเทา แยกจากสี tier
 * ของข้อมูลจริง เพื่อไม่ให้ดูเหมือนเป็นข้อมูลยืนยันแล้ว
 */
function computeChartRounds(rounds, startPrice, isClosed) {
  if (!startPrice) return []

  const byRoundNo = new Map(rounds.map(r => [r.round_no, r]))
  let tier = 0
  let lastRoundNo = 0
  const out = []

  for (const r of rounds) {
    const isUnresolved = r.issale_code === '0'
    out.push({
      round_no: r.round_no,
      bid_date: r.bid_date,
      tier,
      price: Math.round(startPrice * TIER_MULTIPLIERS[tier]),
      isProjected: false,
      isUnresolved,
    })
    lastRoundNo = r.round_no
    if (isUnresolved) break   // หยุดเดินตามข้อมูลจริง ณ นัดที่ยังไม่รู้ผล
    if (r.issale_code === '3' && tier < 3) tier += 1
  }

  if (isClosed) return out   // ปิดแล้ว — ไม่มีนัดไหนต้องโปรเจกชันต่อ

  // ยังไม่ปิด — เติมแท่งโปรเจกชันต่อจนครบ 4 แท่งเสมอ (ใช้ bid_date จริงถ้ามี
  // ข้อมูลอยู่แล้วสำหรับนัดนั้น เพราะ LED มักประกาศวันของทุกนัดไว้ล่วงหน้า)
  while (out.length < 4) {
    if (tier < 3) tier += 1
    lastRoundNo += 1
    const existing = byRoundNo.get(lastRoundNo)
    out.push({
      round_no: lastRoundNo,
      bid_date: existing?.bid_date || null,
      tier,
      price: Math.round(startPrice * TIER_MULTIPLIERS[tier]),
      isProjected: true,
      isUnresolved: true,
    })
  }

  return out
}

/** ราคาแบบย่อสำหรับ label บนแท่งกราฟ — ไม่มี ฿ เช่น 1.8M, 750K */
function fmtCompactPrice(v) {
  if (v == null) return ''
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (abs >= 1_000)     return `${Math.round(v / 1000)}K`
  return String(v)
}

/** วันที่แบบย่อ DD/MM/YY (พ.ศ. 2 หลัก) — เฉพาะใน chart นี้จุดเดียว
 *  ไม่กระทบ fmtDate() ที่ใช้รูปแบบเต็ม (เช่น "29 พ.ค. 2569") ทั่วทั้งหน้า */
function fmtDateShort(str) {
  if (!str) return ''
  try {
    const d = new Date(str)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear() + 543).slice(-2)
    return `${dd}/${mm}/${yy}`
  } catch {
    return str
  }
}

/* ── Info popover — ไอคอน ⓘ อธิบายเกณฑ์ลดราคาแบบละเอียด
   PC: hover เปิดได้เลย / มือถือ: แตะ toggle (คลิกได้ทั้งคู่)
   click-outside ปิด — render ผ่าน React Portal ไปที่ document.body แล้วใช้
   position:fixed คำนวณจาก getBoundingClientRect() ของปุ่ม เพราะ .panel
   (การ์ดครอบ) มี overflow:hidden ถ้าลอย position:absolute ธรรมดาจะโดนตัด
   ขอบตามกรอบการ์ดทันที (เจอปัญหานี้จริงตอนทดสอบ) ── */
function PriceRuleInfoPopover() {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState(null)
  const btnRef   = useRef(null)
  const panelRef = useRef(null)

  const openPanel = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const panelWidth = 300
      const left = Math.min(r.left, window.innerWidth - panelWidth - 16)
      setPos({ top: r.bottom + 8, left: Math.max(16, left) })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      const inBtn   = btnRef.current   && btnRef.current.contains(e.target)
      const inPanel = panelRef.current && panelRef.current.contains(e.target)
      if (!inBtn && !inPanel) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="info-popover-btn"
        onClick={() => (open ? setOpen(false) : openPanel())}
        onMouseEnter={openPanel}
        aria-label="อธิบายเกณฑ์การลดราคาแต่ละนัด"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="11"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="info-popover-panel"
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          onMouseLeave={() => setOpen(false)}
        >
          <strong>เกณฑ์การลดราคาแต่ละนัด</strong>
          <ul>
            <li>นัดที่ 1: เริ่มต้นที่ 100% ของราคาประเมิน</li>
            <li>นัดที่ 2: ลดเหลือ 90% ของราคาประเมิน (ลดลง 10%)</li>
            <li>นัดที่ 3: ลดเหลือ 80% ของราคาประเมิน (ลดลง 20%)</li>
            <li>นัดที่ 4 เป็นต้นไป: ลดเหลือ 70% ของราคาประเมิน (ลดลงสูงสุด 30%)
              ซึ่งเป็นราคาต่ำสุดที่จะไม่มีการปรับลดราคาลงอีก</li>
          </ul>
          <strong>ข้อควรระวังเรื่องสถานะ "งดขาย"</strong>
          <p style={{ margin: '6px 0 0' }}>
            หากในนัดก่อนหน้ามีสถานะ "งดขาย" เนื่องจากคู่ความขอให้งด หรือ
            เจ้าพนักงานมีเหตุต้องงดขาย โดยที่ยังไม่มีการเปิดประมูลขายจริง
            (ไม่ใช่เพราะไม่มีคนสู้ราคา) การนัดขายครั้งต่อไปจะยังนับราคาเริ่มต้น
            เท่ากับนัดก่อนหน้า ไม่ถือว่าเป็นการลดราคา
          </p>
        </div>,
        document.body
      )}
    </>
  )
}

/* ── Bar chart ราคาเริ่มประมูลต่อนัด ── */
function PriceTierChart({ rounds, startPrice, todayStr, isClosed }) {
  const tiers = computeChartRounds(rounds, startPrice, isClosed)
  if (tiers.length === 0) return null

  const data = tiers.map(t => ({
    name:  `นัดที่ ${t.round_no}`,
    sub:   t.tier === 0 ? '' : `(ลด ${t.tier * 10}%)`,
    price: t.price,
    line1: t.tier === 0 ? `นัด ${t.round_no}` : `นัด ${t.round_no} · -${t.tier * 10}%`,
    dateLabel: fmtDateShort(t.bid_date),
    tier: t.tier,
    isProjected: t.isProjected,
    // กระพริบเฉพาะ "นัดถัดไปที่ใกล้ที่สุด" ที่เป็นข้อมูลจริง (ไม่ใช่โปรเจกชัน)
    // และวันยังไม่ผ่าน — ไม่ใช่ทุกแท่งที่ยังไม่รู้ผล
    isBlinking: !isClosed && !t.isProjected && t.isUnresolved && t.bid_date && t.bid_date >= todayStr,
  }))

  // ทรัพย์ที่ปิดแล้วอาจมีได้ถึง 8 แท่ง — บีบให้พอดี sidebar แคบๆ เสมอทำให้
  // label ล้น/ทับกัน จึงให้ scroll แนวนอนได้แทน กำหนดความกว้างขั้นต่ำต่อแท่ง
  const MIN_BAR_WIDTH = 76
  const needsScroll = data.length > 4
  const chartWidth  = Math.max(data.length * MIN_BAR_WIDTH, 300)

  return (
    <div className="price-tier-chart-wrap">
      <div className="price-tier-chart-hd">
        <span>ราคาเริ่มต้นของแต่ละนัด</span>
        <PriceRuleInfoPopover />
      </div>
      <div style={needsScroll ? { overflowX: 'auto' } : undefined}>
        <div style={{ width: needsScroll ? chartWidth : '100%', minWidth: '100%' }}>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 8 }}>
              <XAxis
                dataKey="name"
                interval={0}
                tick={({ x, y, payload, index }) => (
                  <g transform={`translate(${x},${y})`}>
                    <text dy={14} textAnchor="middle" className="price-tier-round-label">
                      {data[index].line1}
                    </text>
                    {data[index].dateLabel && (
                      <text dy={28} textAnchor="middle" className="price-tier-round-label" opacity={0.7}>
                        {data[index].dateLabel}
                      </text>
                    )}
                  </g>
                )}
                height={44}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis hide />
              <Bar dataKey="price" radius={[6, 6, 0, 0]} maxBarSize={64}>
                <LabelList
                  dataKey="price"
                  position="top"
                  className="price-tier-bar-label"
                  formatter={(v) => fmtCompactPrice(v)}
                />
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={isClosed || d.isProjected ? GREY : TIER_COLORS[d.tier]}
                    className={d.isBlinking ? 'blink-slow' : ''}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

/* ── Icons ── */
const BACK = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const ICON = (path) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="panel-hd-icon">
    <path d={path}/>
  </svg>
)

/* ── Lightbox ── */
function Lightbox({ src, onClose }) {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const rotate = (e) => {
    e.stopPropagation()
    setRotation(r => r + 90)
  }

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-rotate" onClick={rotate} title="หมุนรูป 90°">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <img
        className="lightbox-img"
        src={src}
        alt="ขยายรูปภาพ"
        style={{ transform: `rotate(${rotation}deg)` }}
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

/* ── Thumbnail ── */
function Thumb({ src, alt, height = 80, onClick }) {
  const [err, setErr] = useState(false)
  if (err || !src) return null
  return (
    <img
      src={src} alt={alt}
      className="img-thumb"
      style={{ height, cursor: 'zoom-in' }}
      onClick={() => onClick(src)}
      onError={() => setErr(true)}
    />
  )
}

export default function DetailPage() {
  const { id } = useParams()
  const [asset, setAsset]     = useState(null)
  const [rounds, setRounds]   = useState([])
  const [mapPt, setMapPt]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [lightbox, setLightbox] = useState(null)   // URL ที่จะแสดงใน lightbox

  const { user } = useAuth()
  const { isSaved, toggle } = useWishlist()
  const navigate = useNavigate()
  const location2 = useLocation()   // ตั้งชื่อ location2 กัน shadow ตัวแปร location (fmtLocation) ด้านล่าง

  const openLightbox  = useCallback((url) => setLightbox(url), [])
  const closeLightbox = useCallback(() => setLightbox(null), [])

  const assetIdNum = Number(id)
  const saved = isSaved(assetIdNum)
  const handleWishlistClick = () => {
    if (!user) {
      navigate('/signin', { state: { from: location2 } })
      return
    }
    toggle(assetIdNum)
  }

  // วันที่วันนี้แบบ string "YYYY-MM-DD" (local) — ใช้เทียบกับ bid_date ตรงๆ
  // แบบ string แทนที่จะสร้าง Date object มาเทียบกัน เพราะ bid_date จาก Supabase
  // เป็น string รูปแบบ "YYYY-MM-DD" ซึ่ง JS's `new Date(str)` ตีความเป็น UTC
  // midnight เสมอ ถ้าเอามาเทียบกับ Date ท้องถิ่นตรงๆ อาจเพี้ยนวันได้ตอนใกล้
  // เที่ยงคืน — เทียบ string ตามรูปแบบเดียวกันปลอดภัยกว่าและง่ายกว่า
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      supabase.from('assets').select('*').eq('id', id).single(),
      supabase.from('asset_bid_rounds')
        .select('round_no, bid_date, issale_code, status_text')  // ไม่ดึง asset_price
        .eq('asset_id', id)
        .order('round_no'),
      supabase.from('assets_map')
        .select('latitude, longitude, land_price_per_sqw, coord_verify_status')
        .eq('id', id)
        .maybeSingle(),
    ])
      .then(([r1, r2, r3]) => {
        if (r1.error) throw r1.error
        setAsset(r1.data)
        // แสดงเฉพาะ round ที่มี bid_date จริง (ตัด round ว่างทิ้ง)
        setRounds((r2.data || []).filter(r => r.bid_date))
        setMapPt(r3.data || null)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="state-box" style={{ paddingTop: 80 }}>
      <div className="dots"><span/><span/><span/></div>
    </div>
  )
  if (error) return (
    <div className="state-box" style={{ paddingTop: 80 }}>
      <p>เกิดข้อผิดพลาด: {error}</p>
      <button onClick={() => navigate(-1)} className="detail-back" style={{ background:'none', border:'none', cursor:'pointer' }}>← กลับค้นหา</button>
    </div>
  )
  if (!asset) return null

  const { cls: stCls, label: stLabel } = statusInfo(asset)
  const tc = typeClass(asset.asset_type_id)
  const tl = typeLabel(asset.asset_type_id, asset.asset_type_desc)

  const location     = fmtLocation(asset)
  const deedLocation = [asset.deedtumbol, asset.deedampur, asset.deedcity].filter(Boolean).join(' › ')

  // ราคาประมูลล่าสุด: ใช้ assetprice3 เป็น appraisal, ไม่มีราคาประมูลจาก bid rounds แล้ว
  const discPct = null  // จะคำนวณได้เมื่อมีข้อมูลราคาจริง

  // ── ราคาเริ่มประมูล — priority: assetprice5 > 4 > 3 > 2 ──
  let startPrice = null, startPriceLabel = ''
  if (asset.assetprice5 > 0) {
    startPrice = asset.assetprice5; startPriceLabel = 'คณะกรรมการ'
  } else if (asset.assetprice4 > 0) {
    startPrice = asset.assetprice4; startPriceLabel = 'เจ้าพนักงานประเมินราคาทรัพย์'
  } else if (asset.assetprice3 > 0) {
    startPrice = asset.assetprice3; startPriceLabel = 'เจ้าพนักงานบังคับคดี'
  } else if (asset.assetprice2 > 0) {
    startPrice = asset.assetprice2; startPriceLabel = 'ผู้เชี่ยวชาญ'
  }

  return (
    <>
      {/* Lightbox overlay */}
      {lightbox && <Lightbox src={lightbox} onClose={closeLightbox} />}

      <div className="detail-wrap">
        <button onClick={() => navigate(-1)} className="detail-back"
          style={{ background:'none', border:'none', cursor:'pointer' }}>{BACK} กลับผลการค้นหา</button>

        <div className="detail-grid">

          {/* ── LEFT ── */}
          <div className="detail-main">

            {/* Hero */}
            <div className="panel">
              <div className="panel-body">
                <div className="detail-hero">

                  {/* รูปหลัก — คลิกเพื่อ lightbox */}
                  <div
                    className="detail-hero-img"
                    style={{ cursor: asset.url_picture ? 'zoom-in' : 'default' }}
                    onClick={() => asset.url_picture && openLightbox(asset.url_picture)}
                  >
                    {asset.url_picture
                      ? <img src={asset.url_picture} alt="ทรัพย์"
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      : <div style={{
                          height: '100%', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', background: 'var(--surface-alt)',
                          color: 'var(--text-3)', fontSize: 13,
                        }}>ไม่มีรูปภาพ</div>
                    }
                  </div>

                  <div className="detail-hero-info">
                    <div className="detail-badges">
                      <span className={`type-badge ${tc}`}>{tl}</span>
                      <span className={`status-badge ${stCls}`}>{stLabel}</span>
                      {asset.saletypename && (
                        <span style={{
                          fontSize: '0.72rem', padding: '2px 7px',
                          background: 'var(--amber-lt)', color: 'var(--amber)',
                          borderRadius: 4, fontWeight: 600,
                        }}>{asset.saletypename}</span>
                      )}
                      {/* แสดง badge ว่ามีพิกัด
                      {mapPt?.latitude && (
                        <span className="coord-badge">📍 แสดงพิกัด</span>
                      )}
                      */}
                      <button
                        type="button"
                        className={`detail-wishlist-btn${saved ? ' active' : ''}`}
                        onClick={handleWishlistClick}
                        title={saved ? 'ลบออกจากรายการบันทึก' : 'บันทึกทรัพย์นี้'}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'}
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        {saved ? 'บันทึกแล้ว' : 'บันทึกรายการนี้'}
                      </button>
                    </div>
                    <div className="detail-title">{tl}</div>
                    <div className="detail-location">📍 {location}</div>
                    {deedLocation && deedLocation !== location && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
                        ที่ตั้งตามโฉนด: {deedLocation}
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>พื้นที่</div>
                        <div style={{ fontWeight: 600 }}>{fmtArea(asset.rai, asset.ngan, asset.wa)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>โฉนด</div>
                        <div style={{ fontSize: '0.83rem' }}>
                          {Array.isArray(asset.deedno) && asset.deedno.length > 0
                            ? asset.deedno.join(', ')
                            : (asset.deedno_raw || '—')}
                        </div>
                      </div>
                      {asset.deedno_count > 1 && (
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>จำนวนโฉนด</div>
                          <div style={{ fontWeight: 600 }}>{asset.deedno_count} แปลง</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* รูปเล็ก: แผนที่ + โฉนด — คลิก lightbox */}
                {(asset.url_map || asset.url_mapjot) && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <Thumb src={asset.url_map}    alt="แผนที่"  height={80} onClick={openLightbox} />
                    <Thumb src={asset.url_mapjot} alt="แผนผัง" height={80} onClick={openLightbox} />
                  </div>
                )}
              </div>
            </div>

            {/* รายละเอียดทรัพย์ */}
            <div className="panel">
              <div className="panel-hd">
                {ICON('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z')}
                <span className="panel-title">รายละเอียดทรัพย์</span>
              </div>
              <div className="panel-body">
                <div className="dl-grid">
                  <div className="dl">
                    <dt>เลขคดี</dt>
                    <dd>{asset.law_suit_no ? `${asset.law_suit_no}/${asset.law_suit_year}` : '—'}</dd>
                  </div>
                  <div className="dl">
                    <dt>ศาล</dt>
                    <dd>{asset.law_court_name || '—'}</dd>
                  </div>
                  <div className="dl">
                    <dt>สำนักงาน</dt>
                    <dd>{asset.province_name || '—'}</dd>
                  </div>
                  <div className="dl">
                    <dt>ลำดับการขาย</dt>
                    <dd className="mono">{asset.str_bid_num || '—'}</dd>
                  </div>
                  <div className="dl">
                    <dt>โจทก์</dt>
                    <dd>{asset.person1 || '—'}</dd>
                  </div>
                  <div className="dl">
                    <dt>จำเลย</dt>
                    <dd style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>
                      ตรวจสอบได้จากทรัพย์ประกาศขายทอดตลาดกรมบังคับคดี
                    </dd>
                  </div>
                  <div className="dl">
                    <dt>เจ้าของกรรมสิทธิ์</dt>
                    <dd>{asset.ownername || '—'}</dd>
                  </div>
                  <div className="dl">
                    <dt>ผู้ครอบครอง</dt>
                    <dd>{asset.occupant || '—'}</dd>
                  </div>
                  {asset.addrno && (
                    <div className="dl">
                      <dt>เลขที่บ้าน</dt>
                      <dd>{asset.addrno}</dd>
                    </div>
                  )}
                  <div className="dl">
                    <dt>ประเภทเอกสาร</dt>
                    <dd>{asset.landtype || '—'}</dd>
                  </div>
                  <div className="dl">
                    <dt>วันที่ประกาศ</dt>
                    <dd>{fmtDate(asset.ischeck_date)}</dd>
                  </div>
                  <div className="dl">
                    <dt>วันที่อัพเดท</dt>
                    <dd>{fmtDate(asset.scraped_at)}</dd>
                  </div>
                </div>
                {asset.remark && (
                  <div style={{
                    marginTop: 12, padding: '10px 12px',
                    background: 'var(--amber-lt)', borderRadius: 'var(--r-sm)',
                    fontSize: '0.85rem', color: 'var(--amber)',
                  }}>
                    <strong>หมายเหตุ:</strong> {asset.remark}
                  </div>
                )}
              </div>
            </div>

            {/* หนี้สิน */}
            {(asset.debtname || asset.debtprice) && (
              <div className="panel">
                <div className="panel-hd">
                  {ICON('M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5')}
                  <span className="panel-title">ข้อมูลหนี้สิน</span>
                </div>
                <div className="panel-body">
                  <div className="dl-grid">
                    <div className="dl">
                      <dt>เจ้าหนี้ / ผู้รับจำนอง</dt>
                      <dd>{asset.debtname || '—'}</dd>
                    </div>
                    <div className="dl">
                      <dt>ยอดหนี้</dt>
                      <dd style={{ fontWeight: 700, color: 'var(--red)' }}>
                        {fmtPriceFull(asset.debtprice)}
                      </dd>
                    </div>
                  </div>
                  {asset.debtdetail && (
                    <div style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--text-2)' }}>
                      {asset.debtdetail}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* แผนที่ */}
            {mapPt?.latitude && (
              <div className="panel">
                <div className="panel-hd">
                  {ICON('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z')}
                  <span className="panel-title">ตำแหน่งทรัพย์</span>
                  {mapPt.coord_verify_status && (
                    <span style={{
                      marginLeft: 'auto', fontSize: '0.7rem', padding: '1px 7px',
                      borderRadius: 4, background: 'var(--green-lt)',
                      color: 'var(--green-dark)', fontWeight: 600,
                    }}>{mapPt.coord_verify_status}</span>
                  )}
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                  <div className="detail-map-actions">
                    <a
                      className="detail-map-action-btn"
                      href={`https://www.google.com/maps?q=${mapPt.latitude},${mapPt.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      🗺️ แผนที่
                    </a>
                    <a
                      className="detail-map-action-btn"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${mapPt.latitude},${mapPt.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      🧭 นำทาง
                    </a>
                    <a
                      className="detail-map-action-btn"
                      href={`https://www.google.com/maps?layer=c&cbll=${mapPt.latitude},${mapPt.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      👁️ Street View
                    </a>
                  </div>
                  <div className="detail-map">
                    <LeafletMap
                      properties={[{ ...asset, latitude: mapPt.latitude, longitude: mapPt.longitude }]}
                      selectedId={asset.id}
                    />
                  </div>
                  {mapPt.land_price_per_sqw > 0 && (
                    <div style={{ padding: '10px 16px', fontSize: '0.83rem', color: 'var(--text-2)' }}>
                      ราคาประเมินที่ดินกรมที่ดิน:{' '}
                      <strong>{fmtPriceFull(mapPt.land_price_per_sqw)}</strong> / ตร.วา
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT Sidebar ── */}
          <div className="detail-aside">

            {/* วิเคราะห์ราคา */}
            <div className="panel">
              <div className="panel-hd">
                {ICON('M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6')}
                <span className="panel-title">วิเคราะห์ราคา</span>
              </div>
              <div className="panel-body">
                {/* ── กรอบ 1: ราคาเริ่มประมูล ── */}
                <div className="price-analysis" style={{ marginBottom: 12 }}>
                  <div className="price-row">
                    <span className="lbl">💰 ราคาเริ่มประมูล</span>
                    <span className="val accent" style={{ fontSize: '1.1rem' }}>
                      {fmtPriceFull(startPrice)}
                    </span>
                  </div>
                  <PriceTierChart rounds={rounds} startPrice={startPrice} todayStr={todayStr} isClosed={asset.is_closed} />
                </div>

                {/* ── กรอบ 2: ราคาประเมินทั้ง 4 แหล่ง (เรียง assetprice2→5) ── */}
                {/* label เต็มความกว้างบรรทัดบน, ราคาบรรทัดล่างชิดขวา */}
                <div className="price-analysis">
                  <div className="price-row-v2">
                    <span className="lbl">ราคาประเมิน (ผู้เชี่ยวชาญการประเมินราคา)</span>
                    <span className="val" style={{ fontSize: '0.88rem' }}>
                      {asset.assetprice2 > 0 ? fmtPriceFull(asset.assetprice2) : '-'}
                    </span>
                  </div>

                  <hr className="price-divider"/>
                  <div className="price-row-v2">
                    <span className="lbl">ราคาประเมิน (เจ้าพนักงานบังคับคดี)</span>
                    <span className="val" style={{ fontSize: '0.88rem' }}>
                      {asset.assetprice3 > 0 ? fmtPriceFull(asset.assetprice3) : '-'}
                    </span>
                  </div>

                  <hr className="price-divider"/>
                  <div className="price-row-v2">
                    <span className="lbl">ราคาประเมิน (เจ้าพนักงานประเมินราคาทรัพย์)</span>
                    <span className="val" style={{ fontSize: '0.88rem' }}>
                      {asset.assetprice4 > 0 ? fmtPriceFull(asset.assetprice4) : '-'}
                    </span>
                  </div>

                  <hr className="price-divider"/>
                  <div className="price-row-v2">
                    <span className="lbl">ราคาที่กำหนดโดยคณะกรรมการ</span>
                    <span className="val" style={{ fontSize: '0.88rem' }}>
                      {asset.assetprice5 > 0 ? fmtPriceFull(asset.assetprice5) : '-'}
                    </span>
                  </div>

                  {/* ราคาที่ดินกรมที่ดิน — คงไว้ท้ายสุด */}
                  {mapPt?.land_price_per_sqw > 0 && (
                    <>
                      <hr className="price-divider"/>
                      <div className="price-row-v2">
                        <span className="lbl">ราคาที่ดินกรมที่ดิน (ต่อ ตร.วา)</span>
                        <span className="val" style={{ fontSize: '0.88rem' }}>
                          {fmtPriceFull(mapPt.land_price_per_sqw)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {asset.reserve_fund > 0 && (
                  <div style={{
                    marginTop: 12, padding: '10px 12px',
                    background: 'var(--surface-alt)', borderRadius: 'var(--r-sm)',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>เงินมัดจำที่ต้องวาง</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', fontFamily: 'var(--mono)' }}>
                      {fmtPriceFull(asset.reserve_fund)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* นัดประมูล — เฉพาะ round ที่มี bid_date, ไม่แสดงราคา */}
            <div className="panel">
              <div className="panel-hd">
                {ICON('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01')}
                <span className="panel-title">นัดประมูล</span>
                {rounds.length > 0 && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.72rem',
                    color: 'var(--text-3)',
                  }}>{rounds.length} นัด</span>
                )}
              </div>
              <div className="panel-body">
                {rounds.length === 0
                  ? <div style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>ไม่มีข้อมูลนัดประมูล</div>
                  : (() => {
                    // หา "นัดถัดไปที่ใกล้ที่สุด" นัดเดียว (code='0' + วันยังไม่ผ่าน)
                    // ให้กระพริบแค่นัดนี้นัดเดียว — เดิมกระพริบทุกนัดที่ยังไม่ถึง
                    // คิว เพราะ LED ประกาศวันของทุกนัดไว้ล่วงหน้าเป็น code='0'
                    // เหมือนกันหมดจนกว่าจะถึงวันจริง ทำให้ดูเหมือนกระพริบทั้งชุด
                    const nextUpcomingRoundNo = rounds.find(
                      r => r.issale_code === '0' && r.bid_date >= todayStr
                    )?.round_no ?? null

                    return (
                    <div className="bid-rounds">
                      {rounds.map(r => {
                        // นัดที่ code='0' ต้องเช็ค bid_date ประกอบด้วย ไม่ใช่ดู
                        // code อย่างเดียว — เพราะ LED บางครั้ง "ลืม" อัปเดต code
                        // หลังวันนัดผ่านไปแล้ว (เจอเคสจริง: นัดที่ 2 วันผ่านไปแล้ว
                        // แต่ code ยังเป็น 0 ค้างอยู่) ถ้าปล่อยไว้จะขึ้น "รอประมูล"
                        // ทั้งที่วันผ่านไปแล้ว ทำให้เข้าใจผิดว่ายังไม่ถึงวันนัด
                        // เว็บ LED เองก็แสดง "-" สำหรับกรณีนี้เหมือนกัน (ไม่ใช่
                        // "รอประมูล") จึงทำตามเพื่อให้สอดคล้องกับต้นทาง
                        const hasRealDate = !!r.bid_date
                        const isPastDue   = hasRealDate && r.bid_date < todayStr
                        const isPending0  = r.issale_code === '0'

                        let label, cls
                        if (isPending0 && isPastDue) {
                          label = '-'
                          cls   = 's-elapsed'   // เทา — แก้บั๊กที่เคยใช้ s0 (ส้ม) ค้างอยู่
                        } else {
                          ({ label, cls } = issaleInfo(r.issale_code))
                        }

                        const isUpcoming = isPending0 && !isPastDue
                        const isNextRound = r.round_no === nextUpcomingRoundNo
                        return (
                          <div key={r.round_no}
                            className={`bid-round${isUpcoming ? ' upcoming' : ''}${isNextRound ? ' blink-slow' : ''}`}>
                            <div className="bid-round-num">{r.round_no}</div>
                            <div className="bid-date">{fmtDate(r.bid_date)}</div>
                            {/* ลบ asset_price ออก — ราคาอยู่ในช่อง "วิเคราะห์ราคา" แล้ว */}
                            <div className={`bid-status ${cls}`}>{label}</div>
                          </div>
                        )
                      })}
                    </div>
                    )
                  })()
                }

                {(asset.sale_location1 || asset.sale_time1 || asset.tel) && (
                  <div style={{
                    marginTop: 12, fontSize: '0.83rem',
                    color: 'var(--text-2)', display: 'flex',
                    flexDirection: 'column', gap: 4,
                    paddingTop: 10, borderTop: '1px solid var(--border)',
                  }}>
                    {asset.sale_location1 && <div>📍 {asset.sale_location1}</div>}
                    {asset.sale_time1     && <div>🕐 เวลา {asset.sale_time1} น.</div>}
                    {asset.tel            && <div>📞 {asset.tel}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* ปุ่ม LED ถูกลบออกแล้ว */}

          </div>
        </div>
      </div>
    </>
  )
}
