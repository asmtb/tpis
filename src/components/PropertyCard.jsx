import { Link } from 'react-router-dom'
import { fmtPrice, fmtArea, typeClass, typeLabel, statusInfo, calcDiscount, discountClass } from '../lib/utils.js'

const PIN = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const IMG_PH = (
  <div className="card-img-ph">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9l5-5 4 4 3-3 6 5"/>
    </svg>
    ไม่มีรูป
  </div>
)

/** Mock Investment Score 55–95 จาก id (deterministic) */
function mockScore(id) {
  return 55 + ((id * 2654435761) >>> 0) % 41
}
function scoreClass(s) {
  if (s >= 78) return 's-high'
  if (s >= 65) return 's-mid'
  return 's-low'
}
function scoreStars(s) {
  const stars = s >= 85 ? 5 : s >= 75 ? 4 : s >= 65 ? 3 : s >= 55 ? 2 : 1
  return '★'.repeat(stars) + '☆'.repeat(5 - stars)
}

/** Mock AI summary */
function mockAI(id, roundNo) {
  const score = mockScore(id)
  if (score >= 80) return 'ทำเลดี · ราคาน่าสนใจ · ความเสี่ยงต่ำ'
  if (score >= 70) return 'น่าพิจารณา · ควรตรวจสอบภาระก่อนตัดสินใจ'
  if (score >= 60) return 'ผ่านหลายนัดแล้ว · ราคาลดลงตามลำดับ'
  return 'ควรประเมินความเสี่ยงเพิ่มเติม'
}

export default function PropertyCard({ property: p }) {
  const tc = typeClass(p.asset_type_id)
  const tl = typeLabel(p.asset_type_id, p.asset_type_desc)
  const { cls: stCls, label: stLabel } = statusInfo(p)

  const score = mockScore(p.id)
  const sc    = scoreClass(score)

  const latestPrice = p.assetprice1 || null
  const discPct     = calcDiscount(p.assetprice3, latestPrice)
  const dc          = discountClass(discPct)

  const location = [p.tumbol, p.ampur, p.city].filter(Boolean).join(' · ')

  return (
    <Link to={`/property/${p.id}`} className={`property-card${p.is_closed ? ' is-closed' : ''}`}>
      <div className="card-img">
        {p.url_picture
          ? <img src={p.url_picture} alt="" loading="lazy"
              onError={e => { e.target.style.display = 'none' }}
            />
          : IMG_PH
        }
      </div>

      <div className="card-body">
        {/* Row 1: badges + score */}
        <div className="card-row1">
          <div className="card-badges">
            <span className={`type-badge ${tc}`}>{tl}</span>
            <span className={`status-badge ${stCls}`}>{stLabel}</span>
          </div>
          <div className={`score-badge ${sc}`} title="Investment Score (mock)">
            <span className="s-val">{score}</span>
            <span className="s-star">{scoreStars(score)}</span>
          </div>
        </div>

        {/* Location */}
        <div className="card-location">
          {PIN}
          <span>{location || '—'}</span>
        </div>

        {/* Deed */}
        <div className="card-deed">
          โฉนด: {p.deedno_raw || '—'}
          {p.deedno_count > 1 ? ` (${p.deedno_count} แปลง)` : ''}
        </div>

        {/* Area */}
        <div className="card-area">
          พื้นที่: {fmtArea(p.rai, p.ngan, p.wa)}
          {p.latest_round_no && (
            <span style={{ marginLeft: 8, color: 'var(--text-3)', fontSize: '0.78rem' }}>
              นัดที่ {p.latest_round_no}
            </span>
          )}
        </div>

        {/* AI Summary */}
        <div className="ai-summary">
          <div className="ai-dot"/>
          <span>{mockAI(p.id, p.latest_round_no)}</span>
        </div>

        {/* Footer: price + discount */}
        <div className="card-footer">
          <div className="card-price">
            <div className="card-price-lbl">ราคาประเมิน</div>
            <div className="card-price-val">{fmtPrice(p.assetprice3)}</div>
            {p.reserve_fund > 0 && (
              <div className="card-price-sub">มัดจำ {fmtPrice(p.reserve_fund)}</div>
            )}
          </div>
          {discPct && (
            <div className={`discount ${dc}`}>
              <span className="d-pct">-{discPct}%</span>
              <span className="d-lbl">ต่ำกว่าประเมิน</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
