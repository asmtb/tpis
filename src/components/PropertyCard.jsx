import { Link } from 'react-router-dom'
import { fmtPrice, fmtArea, fmtDate, typeClass, typeLabel, statusInfo, calcDiscount, discountClass } from '../lib/utils.js'

const PIN = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

const IMG_PH = (
  <div className="card-img-placeholder">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9l5-5 4 4 3-3 6 5"/>
      <circle cx="8.5" cy="6.5" r="1.5"/>
    </svg>
    ไม่มีรูปภาพ
  </div>
)

export default function PropertyCard({ property: p }) {
  const tc  = typeClass(p.asset_type_id)
  const tl  = typeLabel(p.asset_type_id, p.asset_type_desc)
  const { cls: stCls, label: stLabel } = statusInfo(p)

  // ส่วนลด: ใช้ราคา round ล่าสุด vs assetprice3 (ราคาประเมิน)
  // ถ้ายังไม่มีข้อมูล round ราคา ใช้ assetprice1 (ราคาประเมินรอบแรก) vs assetprice3
  const latestPrice = p.latest_round_price || p.assetprice1 || null
  const discountPct = calcDiscount(p.assetprice3, latestPrice)
  const dc = discountClass(discountPct)

  const location = [p.tumbol, p.ampur, p.city].filter(Boolean).join(' • ')

  return (
    <Link to={`/property/${p.id}`} className={`property-card${p.is_closed ? ' is-closed' : ''}`}>
      <div className="card-img">
        {p.url_picture
          ? <img
              src={p.url_picture}
              alt={`ทรัพย์ ${p.str_bid_num}`}
              loading="lazy"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }}
            />
          : IMG_PH
        }
      </div>

      <div className="card-body">
        <div className="card-top">
          <span className={`type-badge ${tc}`}>{tl}</span>
          <span className={`status-badge ${stCls}`}>{stLabel}</span>
        </div>

        <div className="card-location">
          {PIN}
          <span>{location || '—'}</span>
        </div>

        <div className="card-deed">
          โฉนด: {p.deedno_raw || '—'}
          {p.deedno_count > 1 ? ` (${p.deedno_count} แปลง)` : ''}
        </div>

        <div className="card-area">
          พื้นที่: {fmtArea(p.rai, p.ngan, p.wa)}
        </div>

        <div className="card-footer">
          <div className="card-price">
            <div className="card-price-lbl">ราคาประเมิน</div>
            <div className="card-price-val">{fmtPrice(p.assetprice3)}</div>
            {p.reserve_fund > 0 && (
              <div className="card-price-sub">มัดจำ {fmtPrice(p.reserve_fund)}</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {discountPct && (
              <div className={`discount ${dc}`}>
                <span className="d-pct">-{discountPct}%</span>
                <span className="d-lbl">ต่ำกว่าประเมิน</span>
              </div>
            )}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'right' }}>
              นัดที่ {p.latest_round_no || '—'}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
