import { ASSET_TYPE_LABELS, ISSALE_STATUS } from './constants.js'

/** ราคา → string ย่อ เช่น "2.50 ล้าน ฿" */
export function fmtPrice(val) {
  if (!val || val <= 0) return '—'
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)} ล้าน ฿`
  if (val >= 100_000)   return `${(val / 1_000).toFixed(0)} K ฿`
  return `${Number(val).toLocaleString()} ฿`
}

/** ราคา → string สั้น สำหรับ tooltip แผนที่ */
export function fmtPriceShort(val) {
  if (!val || val <= 0) return '—'
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M ฿`
  return `${(val / 1_000).toFixed(0)}K ฿`
}

/** พื้นที่ → string เช่น "2 ไร่ 1 งาน 50.5 ตร.วา" */
export function fmtArea(rai, ngan, wa) {
  const p = []
  if (Number(rai)  > 0) p.push(`${rai} ไร่`)
  if (Number(ngan) > 0) p.push(`${ngan} งาน`)
  if (Number(wa)   > 0) p.push(`${Number(wa).toFixed(2).replace(/\.?0+$/, '')} ตร.วา`)
  return p.join(' ') || '—'
}

/** พื้นที่รวมเป็นตารางวา (สำหรับเปรียบเทียบ) */
export function totalSqw(rai, ngan, wa) {
  return (Number(rai) || 0) * 400 + (Number(ngan) || 0) * 100 + (Number(wa) || 0)
}

/** วันที่ไทย เช่น "15 ม.ค. 2568" */
export function fmtDate(str) {
  if (!str) return '—'
  try {
    return new Date(str).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return str
  }
}

/** วันที่ + เวลา */
export function fmtDateTime(str) {
  if (!str) return '—'
  try {
    return new Date(str).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return str
  }
}

/** เวลาผ่านมา เช่น "3 ชั่วโมงที่แล้ว" */
export function fmtRelative(str) {
  if (!str) return '—'
  const diff = Date.now() - new Date(str).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)   return `${m} นาทีที่แล้ว`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h} ชม.ที่แล้ว`
  const d = Math.floor(h / 24)
  if (d < 30)   return `${d} วันที่แล้ว`
  return fmtDate(str)
}

/** ส่วนลดจากราคาประเมิน (%) — ใช้ราคารอบล่าสุดเปรียบเทียบกับ appraisal */
export function calcDiscount(appraisalPrice, latestRoundPrice) {
  if (!appraisalPrice || !latestRoundPrice) return null
  const pct = Math.round((1 - latestRoundPrice / appraisalPrice) * 100)
  return pct > 0 ? pct : null
}

/** discount % → CSS class */
export function discountClass(pct) {
  if (!pct || pct <= 0) return 'd0'
  if (pct >= 30) return 'd30'
  if (pct >= 20) return 'd20'
  if (pct >= 10) return 'd10'
  return 'd0'
}

/** asset_type_id → CSS class สำหรับ badge */
export function typeClass(id) {
  return { '001': 't001', '002': 't002', '003': 't003' }[id] || 't_x'
}

/** asset_type_id → label */
export function typeLabel(id, fallback = '') {
  return ASSET_TYPE_LABELS[id] || fallback || 'ทรัพย์อื่น'
}

/** property → { cls, label } สำหรับ status badge */
export function statusInfo(p) {
  if (p.is_sold)   return { cls: 'sold',   label: 'ขายแล้ว' }
  if (p.is_closed) return { cls: 'closed', label: 'ปิดแล้ว' }
  return               { cls: 'open',   label: 'เปิดประมูล' }
}

/** issale code → { label, cls } */
export function issaleInfo(code) {
  return ISSALE_STATUS[String(code)] || { label: `ไม่ทราบ (${code})`, cls: 's0' }
}

/** ตัวเลข → format comma */
export function fmtNum(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString()
}

/** ราคาเต็ม พร้อม comma เช่น "772,000 ฿" (ใช้ใน Detail page) */
export function fmtPriceFull(val) {
  if (!val || val <= 0) return '—'
  return `${Math.round(val).toLocaleString()} ฿`
}

/** ที่อยู่ — deed fields เป็นหลัก fallback ไป asset fields
 *  ใช้กับ PropertyCard, LeafletMap tooltip, DetailPage, MapPage popup */
export function fmtLocation(p) {
  const t = p.deedtumbol || p.tumbol || ''
  const a = p.deedampur  || p.ampur  || ''
  const c = p.deedcity   || p.city   || ''
  return [t, a, c].filter(Boolean).join(' › ')
}
