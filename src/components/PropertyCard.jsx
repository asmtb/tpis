import { Link } from 'react-router-dom'
import {
  fmtPrice, fmtArea, fmtLocation,
  typeClass, typeLabel, statusInfo,
  calcDiscount, discountClass,
} from '../lib/utils.js'

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

function mockScore(id) { return 55 + ((id * 2654435761) >>> 0) % 41 }
function scoreClass(s) { return s >= 78 ? 's-high' : s >= 65 ? 's-mid' : 's-low' }
function scoreStars(s) {
  const n = s >= 85 ? 5 : s >= 75 ? 4 : s >= 65 ? 3 : s >= 55 ? 2 : 1
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}
function mockAI(id) {
  const s = mockScore(id)
  if (s >= 80) return 'ทำเลดี · ราคาน่าสนใจ · ความเสี่ยงต่ำ'
  if (s >= 70) return 'น่าพิจารณา · ควรตรวจสอบภาระก่อน'
  if (s >= 60) return 'ผ่านหลายนัดแล้ว · ราคาลดลงตามลำดับ'
  return 'ควรประเมินความเสี่ยงเพิ่มเติม'
}

/* ── Card แนวนอน (default) ── */
function CardHorizontal({ p, tc, tl, stCls, stLabel, score, sc, discPct, dc, location, hasCoord, onMouseEnter, onMouseLeave }) {
  return (
    <Link to={`/property/${p.id}`}
      className={`property-card${p.is_closed ? ' is-closed' : ''}`}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="card-img">
        {p.url_picture
          ? <img src={p.url_picture} alt="" loading="lazy"
              onError={e => { e.target.style.display = 'none' }} />
          : IMG_PH}
      </div>

      <div className="card-body">
        <div className="card-row1">
          <div className="card-badges">
            <span className={`type-badge ${tc}`}>{tl}</span>
            <span className={`status-badge ${stCls}`}>{stLabel}</span>
            {hasCoord && <span className="coord-badge">📍 แสดงพิกัด</span>}
          </div>
          <div className={`score-badge ${sc}`} title="Investment Score (mock)">
            <span className="s-val">{score}</span>
            <span className="s-star">{scoreStars(score)}</span>
          </div>
        </div>

        {/* Location */}
        <div className="card-location">
          {PIN}<span>{location || '—'}</span>
        </div>

        {/* Deed + round */}
        <div className="card-deed">
          โฉนด: {p.deedno_raw || '—'}
          {p.deedno_count > 1 ? ` (${p.deedno_count} แปลง)` : ''}
          {p.latest_round_no && (
            <span style={{ marginLeft:8, color:'var(--text-3)', fontSize:'0.75rem' }}>
              · นัดที่ {p.latest_round_no}
            </span>
          )}
        </div>

        {/* Area */}
        <div className="card-area">พื้นที่: {fmtArea(p.rai, p.ngan, p.wa)}</div>

        {/* AI */}
        <div className="ai-summary">
          <div className="ai-dot"/>
          <span>{mockAI(p.id)}</span>
        </div>

        {/* Footer */}
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

/* ── Card แนวตั้ง (Grid view) ── */
function CardGrid({ p, tc, tl, stCls, stLabel, score, sc, discPct, dc, location, hasCoord, onMouseEnter, onMouseLeave }) {
  return (
    <Link to={`/property/${p.id}`}
      className={`property-card-grid${p.is_closed ? ' is-closed' : ''}`}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="card-grid-img">
        {p.url_picture
          ? <img src={p.url_picture} alt="" loading="lazy"
              onError={e => { e.target.style.display = 'none' }} />
          : IMG_PH}
        <div className="card-grid-badges">
          <span className={`type-badge ${tc}`}>{tl}</span>
          <span className={`status-badge ${stCls}`}>{stLabel}</span>
          {hasCoord && <span className="coord-badge">📍</span>}
        </div>
        <div className={`score-badge ${sc} card-grid-score`}>
          <span className="s-val">{score}</span>
          <span className="s-star">{scoreStars(score)}</span>
        </div>
      </div>

      <div className="card-grid-body">
        <div className="card-location" style={{ fontSize:'0.8rem' }}>
          {PIN}<span>{location || '—'}</span>
        </div>
        <div className="card-area" style={{ fontSize:'0.8rem' }}>
          {fmtArea(p.rai, p.ngan, p.wa)}
          {p.latest_round_no && (
            <span style={{ marginLeft:6, color:'var(--text-3)', fontSize:'0.72rem' }}>
              · นัดที่ {p.latest_round_no}
            </span>
          )}
        </div>
        <div className="ai-summary" style={{ fontSize:'0.72rem' }}>
          <div className="ai-dot"/><span>{mockAI(p.id)}</span>
        </div>
        <div className="card-price" style={{ marginTop:'auto', paddingTop:6, borderTop:'1px solid var(--border)' }}>
          <div className="card-price-lbl">ราคาประเมิน</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <div className="card-price-val">{fmtPrice(p.assetprice3)}</div>
            {discPct && (
              <span style={{ fontSize:'0.72rem', fontWeight:700,
                color: dc === 'd0' ? 'var(--text-3)' : 'var(--green-dark)' }}>
                -{discPct}%
              </span>
            )}
          </div>
          {p.reserve_fund > 0 && (
            <div className="card-price-sub">มัดจำ {fmtPrice(p.reserve_fund)}</div>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ── Row (List view) ── */
function CardList({ p, tc, tl, stCls, stLabel, score, sc, discPct, location, hasCoord, onMouseEnter, onMouseLeave }) {
  return (
    <Link to={`/property/${p.id}`}
      className={`property-card-list${p.is_closed ? ' is-closed' : ''}`}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className="card-list-img">
        {p.url_picture
          ? <img src={p.url_picture} alt="" loading="lazy"
              onError={e => { e.target.style.display = 'none' }} />
          : <div style={{ width:'100%', height:'100%', background:'var(--surface-alt)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--text-3)', fontSize:11 }}>ไม่มีรูป</div>
        }
      </div>
      <div className="card-list-badges">
        <span className={`type-badge ${tc}`}>{tl}</span>
        <span className={`status-badge ${stCls}`}>{stLabel}</span>
        {hasCoord && <span className="coord-badge">📍</span>}
      </div>
      <div className="card-list-loc">
        <div style={{ fontSize:'0.82rem', color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {location || '—'}
        </div>
        <div style={{ fontSize:'0.72rem', color:'var(--text-3)' }}>
          {fmtArea(p.rai, p.ngan, p.wa)}
          {p.latest_round_no && ` · นัดที่ ${p.latest_round_no}`}
        </div>
      </div>
      <div className="card-list-price">
        <div className="card-price-val" style={{ fontSize:'0.95rem' }}>{fmtPrice(p.assetprice3)}</div>
        {discPct && <div style={{ fontSize:'0.72rem', color:'var(--green-dark)', fontWeight:700 }}>-{discPct}%</div>}
      </div>
      <div className={`score-badge ${sc}`} style={{ flexShrink:0 }}>
        <span className="s-val">{score}</span>
        <span className="s-star">{scoreStars(score)}</span>
      </div>
    </Link>
  )
}

/* ── Export หลัก ── */
export default function PropertyCard({
  property: p, hasCoord = false,
  variant = 'horizontal',  // 'horizontal' | 'grid' | 'list'
  onMouseEnter, onMouseLeave,
}) {
  const tc      = typeClass(p.asset_type_id)
  const tl      = typeLabel(p.asset_type_id, p.asset_type_desc)
  const { cls: stCls, label: stLabel } = statusInfo(p)
  const score   = mockScore(p.id)
  const sc      = scoreClass(score)
  const discPct = calcDiscount(p.assetprice3, p.assetprice1)
  const dc      = discountClass(discPct)
  const location = fmtLocation(p)

  const shared = { p, tc, tl, stCls, stLabel, score, sc, discPct, dc, location, hasCoord, onMouseEnter, onMouseLeave }

  if (variant === 'grid') return <CardGrid {...shared} />
  if (variant === 'list') return <CardList {...shared} />
  return <CardHorizontal {...shared} />
}
