import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from './AuthContext.jsx'

/**
 * Wishlist ใช้ตาราง public.user_watchlists ที่มีอยู่แล้วตั้งแต่ baseline schema
 * (0001) — RLS policy "own watchlist" + table grant ให้ authenticated (0012)
 * มีครบแล้ว ไม่ต้องมี migration ใหม่
 *
 * ทำเป็น Context (ไม่ใช่ hook เดี่ยวๆ) เพราะต้อง share state เดียวกันข้าม
 * component — กด ♡ ใน PropertyCard ต้องอัปเดต badge count ใน Navbar ทันที
 * โดยไม่ต้อง refetch ทั้งก้อนใหม่ ถ้าแต่ละ component เรียก hook แยกกันเอง
 * จะได้ state คนละชุด ไม่ sync กัน
 */
const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [ids, setIds]         = useState(new Set())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setIds(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('user_watchlists')
      .select('asset_id')
      .eq('user_id', user.id)
    if (!error && data) {
      setIds(new Set(data.map(r => r.asset_id)))
    }
    setLoading(false)
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const isSaved = useCallback((assetId) => ids.has(assetId), [ids])

  // toggle คืนค่า { error } เผื่อ component เรียกอยากโชว์ error เอง
  // (เช่น popup "เข้าสู่ระบบก่อนบันทึก" ถ้า !user)
  const toggle = useCallback(async (assetId, note = null) => {
    if (!user) {
      return { error: new Error('not_authenticated') }
    }

    const alreadySaved = ids.has(assetId)

    // optimistic update ก่อนยิง request จริง
    setIds(prev => {
      const next = new Set(prev)
      alreadySaved ? next.delete(assetId) : next.add(assetId)
      return next
    })

    if (alreadySaved) {
      const { error } = await supabase
        .from('user_watchlists')
        .delete()
        .eq('user_id', user.id)
        .eq('asset_id', assetId)
      if (error) {
        setIds(prev => new Set(prev).add(assetId))  // rollback
        return { error }
      }
    } else {
      const { error } = await supabase
        .from('user_watchlists')
        .insert({ user_id: user.id, asset_id: assetId, note })
      if (error) {
        setIds(prev => {                              // rollback
          const next = new Set(prev)
          next.delete(assetId)
          return next
        })
        return { error }
      }
    }
    return { error: null }
  }, [user, ids])

  const value = { ids, count: ids.size, isSaved, toggle, loading, refresh }

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export const useWishlist = () => useContext(WishlistContext)
