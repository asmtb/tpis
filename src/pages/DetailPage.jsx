import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import LeafletMap from '../components/LeafletMap.jsx'
import {
  fmtPrice, fmtArea, fmtDate, fmtDateTime,
  typeClass, typeLabel, statusInfo, issaleInfo,
  calcDiscount, discountClass,
} from '../lib/utils.js'

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

export default function DetailPage() {
  const { id } = useParams()
  const [asset, setAsset]   = useState(null)
  const [rounds, setRounds] = useState([])
  const [mapPt, setMapPt]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    Promise.all([
      supabase.from('assets').select('*').eq('id', id).single(),
      supabase.from('asset_bid_rounds').select('*').eq('asset_id', id).order('round_no'),
      supabase.from('assets_map')
        .select('latitude, longitude, land_price_per_sqw, coord_verify_status')
        .eq('id', id)
        .maybeSingle(),
    ])
      .then(([r1, r2, r3]) => {
        if (r1.error) throw r1.error
        setAsset(r1.data)
        setRounds(r2.data || [])
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
      <Link to="/" className="detail-back">← กลับค้นหา</Link>
    </div>
  )
  if (!asset) return null

  const { cls: stCls, label: stLabel } = statusInfo(asset)
  const tc = typeClass(asset.asset_type_id)
  const tl = typeLabel(asset.asset_type_id, asset.asset_type_desc)

  // หาราคาประมูลล่าสุดจาก rounds
  const lastRound   = rounds.filter(r => r.bid_date).slice(-1)[0]
  const latestPrice = lastRound?.asset_price
  const discPct     = calcDiscount(asset.assetprice3, latestPrice)
  const dc          = discountClass(discPct)

  const location = [asset.tumbol, asset.ampur, asset.city].filter(Boolean).join(' › ')
  const deedLocation = [asset.deedtumbol, asset.deedampur, asset.deedcity].filter(Boolean).join(' › ')

  return (
    <div className="detail-wrap">

      <Link to="/" className="detail-back">{BACK} กลับผลการค้นหา</Link>

      <div className="detail-grid">

        {/* ── LEFT — ข้อมูลหลัก ── */}
        <div className="detail-main">

          {/* Hero */}
          <div className="panel">
            <div className="panel-body">
              <div className="detail-hero">
                <div className="detail-hero-img">
                  {asset.url_picture
                    ? <img src={asset.url_picture} alt="ทรัพย์" onError={e => e.target.style.display='none'} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-alt)', color: 'var(--text-3)', fontSize: 13 }}>ไม่มีรูปภาพ</div>
                  }
                </div>
                <div className="detail-hero-info">
                  <div className="detail-badges">
                    <span className={`type-badge ${tc}`}>{tl}</span>
                    <span className={`status-badge ${stCls}`}>{stLabel}</span>
                    {asset.saletypename && (
                      <span style={{ fontSize: '0.72rem', padding: '2px 7px', background: 'var(--amber-lt)', color: 'var(--amber)', borderRadius: 2, fontWeight: 600 }}>
                        {asset.saletypename}
                      </span>
                    )}
                  </div>
                  <div className="detail-title">
                    {tl} — {asset.city}
                    {asset.ampur ? `, ${asset.ampur}` : ''}
                  </div>
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
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.83rem' }}>{asset.deedno_raw || '—'}</div>
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

              {/* Image row */}
              {(asset.url_map || asset.url_mapjot) && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {asset.url_map && (
                    <a href={asset.url_map} target="_blank" rel="noopener">
                      <img src={asset.url_map} alt="แผนที่"
                        style={{ height: 80, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', cursor: 'pointer' }}
                        onError={e => e.target.style.display='none'}
                      />
                    </a>
                  )}
                  {asset.url_mapjot && (
                    <a href={asset.url_mapjot} target="_blank" rel="noopener">
                      <img src={asset.url_mapjot} alt="แผนผัง"
                        style={{ height: 80, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', cursor: 'pointer' }}
                        onError={e => e.target.style.display='none'}
                      />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ข้อมูลทรัพย์ */}
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
                  <dd>{asset.person2 || '—'}</dd>
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
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--amber-lt)', borderRadius: 'var(--r-sm)', fontSize: '0.85rem', color: 'var(--amber)' }}>
                  <strong>หมายเหตุ:</strong> {asset.remark}
                </div>
              )}
            </div>
          </div>

          {/* ข้อมูลหนี้ */}
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
                    <dd style={{ fontWeight: 700, color: 'var(--red)' }}>{fmtPrice(asset.debtprice)}</dd>
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
                    borderRadius: 2, background: 'var(--green-lt)', color: 'var(--green)', fontWeight: 600,
                  }}>
                    {mapPt.coord_verify_status}
                  </span>
                )}
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <div className="detail-map">
                  <LeafletMap
                    properties={[{ ...asset, latitude: mapPt.latitude, longitude: mapPt.longitude }]}
                    selectedId={asset.id}
                  />
                </div>
                {mapPt.land_price_per_sqw > 0 && (
                  <div style={{ padding: '10px 16px', fontSize: '0.83rem', color: 'var(--text-2)' }}>
                    ราคาประเมินที่ดินกรมที่ดิน: <strong>{fmtPrice(mapPt.land_price_per_sqw)}</strong> / ตร.วา
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT — Sidebar ── */}
        <div className="detail-aside">

          {/* วิเคราะห์ราคา */}
          <div className="panel">
            <div className="panel-hd">
              {ICON('M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6')}
              <span className="panel-title">วิเคราะห์ราคา</span>
            </div>
            <div className="panel-body">
              <div className="price-analysis">
                <div className="price-row">
                  <span className="lbl">ราคาประเมิน (เจ้าพนักงาน)</span>
                  <span className="val accent">{fmtPrice(asset.assetprice3)}</span>
                </div>
                {latestPrice && (
                  <>
                    <hr className="price-divider"/>
                    <div className="price-row">
                      <span className="lbl">ราคาประมูลล่าสุด (นัดที่ {lastRound?.round_no})</span>
                      <span className="val bid">{fmtPrice(latestPrice)}</span>
                    </div>
                    {discPct && (
                      <>
                        <hr className="price-divider"/>
                        <div className="price-row">
                          <span className="lbl">ส่วนลดจากราคาประเมิน</span>
                          <span className={`val ${dc === 'd0' ? '' : 'green'}`} style={{ fontSize: '1.3rem' }}>-{discPct}%</span>
                        </div>
                        <div className="price-discount-bar">
                          <div className="price-discount-fill" style={{ width: `${Math.min(discPct, 60)}%` }}/>
                        </div>
                      </>
                    )}
                  </>
                )}
                {mapPt?.land_price_per_sqw > 0 && (
                  <>
                    <hr className="price-divider"/>
                    <div className="price-row">
                      <span className="lbl">ราคาที่ดินกรมที่ดิน (ต่อ ตร.วา)</span>
                      <span className="val" style={{ fontSize: '0.9rem' }}>{fmtPrice(mapPt.land_price_per_sqw)}</span>
                    </div>
                  </>
                )}
              </div>

              {asset.reserve_fund > 0 && (
                <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 'var(--r-sm)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>เงินมัดจำที่ต้องวาง</div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', fontFamily: 'var(--mono)' }}>
                    {fmtPrice(asset.reserve_fund)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* นัดประมูล */}
          <div className="panel">
            <div className="panel-hd">
              {ICON('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01')}
              <span className="panel-title">นัดประมูล</span>
            </div>
            <div className="panel-body">
              {rounds.length === 0
                ? <div style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>ไม่มีข้อมูลนัดประมูล</div>
                : (
                  <div className="bid-rounds">
                    {rounds.map(r => {
                      const { label, cls } = issaleInfo(r.issale_code)
                      const isUpcoming = r.issale_code === '0' && r.bid_date
                      return (
                        <div key={r.round_no} className={`bid-round${isUpcoming ? ' upcoming' : ''}`}>
                          <div className="bid-round-num">{r.round_no}</div>
                          <div className="bid-date">{fmtDate(r.bid_date)}</div>
                          {r.asset_price && (
                            <div className="bid-price">{fmtPrice(r.asset_price)}</div>
                          )}
                          <div className={`bid-status ${cls}`}>{label}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              }

              {(asset.sale_location1 || asset.sale_time1) && (
                <div style={{ marginTop: 12, fontSize: '0.83rem', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {asset.sale_location1 && (
                    <div>📍 {asset.sale_location1}</div>
                  )}
                  {asset.sale_time1 && (
                    <div>🕐 เวลา {asset.sale_time1} น.</div>
                  )}
                  {asset.tel && (
                    <div>📞 {asset.tel}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ลิงก์ต้นทาง */}
          {asset.form_action && (
            <a
              href={asset.form_action}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', padding: '10px 16px', textAlign: 'center',
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
                fontSize: '0.875rem', color: 'var(--text-2)', background: 'var(--surface)',
                transition: 'all 0.14s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
            >
              ดูข้อมูลต้นฉบับบน LED ↗
            </a>
          )}

        </div>
      </div>
    </div>
  )
}
