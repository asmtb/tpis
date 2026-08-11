import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

/**
 * Auth ของ TPIS ใช้ Supabase Auth (email + password) แบบง่าย — มีแค่ admin คนเดียว
 * ไม่มีหน้า sign-up สาธารณะ ต้องสร้าง user ผ่าน Supabase Dashboard เอง แล้วรัน SQL
 * ตั้ง role='admin' ในตาราง public.users (ดู README/CHANGELOG ประกอบ)
 *
 * role มาจากตาราง public.users (ผูกกับ auth.users ผ่าน trigger handle_new_user())
 * RLS ของตารางที่ต้องแก้ไข (เช่น parcels) เช็ค current_user_role() = 'admin' ที่ฝั่ง
 * DB อยู่แล้ว — role ที่ context นี้เก็บไว้ใช้แค่ควบคุม UI (ซ่อน/แสดงปุ่ม, redirect)
 * ไม่ใช่ชั้นความปลอดภัยจริง ความปลอดภัยจริงอยู่ที่ RLS policy ฝั่ง Supabase
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)

  const loadRole = async (u) => {
    if (!u) {
      setRole(null)
      return
    }
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', u.id)
      .single()
    setRole(error ? null : (data?.role || null))
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user || null)
      await loadRole(session?.user)
      if (mounted) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      setUser(session?.user || null)
      await loadRole(session?.user)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const value = {
    user,
    role,
    loading,
    isAdmin: role === 'admin',
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
