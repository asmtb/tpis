import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useWishlist } from '../lib/WishlistContext.jsx'
import PropertyCard from '../components/PropertyCard.jsx'

/**
 * หน้า /wishlist — ครอบด้วย RequireAuth ที่ App.jsx แล้ว จึงมั่นใจได้ว่า
 * user login อยู่เสมอตอนมาถึงหน้านี้ (ไม่ต้องเช็ค user ซ้ำในนี้)
 *
 * ids มาจาก WishlistContext (โหลดไว้แล้วตอน login สำหรับ badge นับใน Navbar)
 * — หน้านี้แค่เอา ids ไป fetch รายละเอียด asset เต็มจากตาราง assets เพิ่ม
 * (เหมือน SearchPage) แล้วโยนเข้า PropertyCard เดิม ไม่ต้องสร้าง card ใหม่
 */
export default function WishlistPage() {
  const { ids, loading: idsLoading } = useWishlist()
  const [items, setItems]     = useState([])
  const [coordIds, setCoordIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const idList = useMemo(() => [...ids], [ids])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (idsLoading) return
      if (idList.length === 0) {
        setItems([])
        setCoordIds(new Set())
        setLoading(false)
        return
      }

      setLoading(true)
      const [{ data: assets }, { data: mapPts }] = await Promise.all([
        supabase
          .from('assets')
          .select(
            'id,str_bid_num,deedno_raw,deedno_count,' +
            'city,ampur,tumbol,deedcity,deedampur,deedtumbol,' +
            'asset_type_id,asset_type_desc,' +
            'rai,ngan,wa,assetprice3,assetprice1,reserve_fund,' +
            'is_closed,is_sold,latest_status,latest_round_no,' +
            'url_picture,ischeck_date,scraped_at'
          )
          .in('id', idList),
        supabase
          .from('assets_map')
          .select('id')
          .in('id', idList)
          .not('latitude', 'is', null),
      ])

      if (cancelled) return
      setItems(assets || [])
      setCoordIds(new Set((mapPts || []).map(r => r.id)))
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [idList, idsLoading])

  return (
    <div className="search-page">
      <div className="search-body" style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
          ทรัพย์ที่บันทึกไว้
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 20 }}>
          {idsLoading || loading ? 'กำลังโหลด...' : `${items.length} รายการ`}
        </p>

        {!idsLoading && !loading && items.length === 0 && (
          <div className="state-box" style={{ paddingTop: 60 }}>
            <p style={{ color: 'var(--text-3)' }}>
              ยังไม่มีทรัพย์ที่บันทึกไว้ — กด ♡ บนการ์ดทรัพย์ที่สนใจเพื่อบันทึกไว้ที่นี่
            </p>
            <Link to="/" className="abtn primary" style={{ marginTop: 12, display: 'inline-flex' }}>
              ไปหน้าค้นหาทรัพย์
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <div className="cards-grid">
            {items.map(p => (
              <PropertyCard
                key={p.id}
                property={p}
                hasCoord={coordIds.has(p.id)}
                variant="grid"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
