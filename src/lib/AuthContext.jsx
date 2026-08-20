import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

/**
 * Auth ของ TPIS ใช้ Supabase Auth (email + password)
 *
 * เปิด public sign-up แล้ว — ใครก็สมัครผ่านหน้า /signup ได้ (บังคับยืนยันอีเมล
 * ก่อน login จริงตาม Supabase Auth setting "Confirm email") แต่ role ของคนที่
 * สมัครเองจะเป็น 'user' เสมอ ("current_user_role() = 'admin' AND ...") เพราะ
 * trigger handle_new_user() (migration 0001) insert public.users ด้วย role
 * default = 'user' เท่านั้น — ไม่มีหน้าเว็บไหนให้ตั้ง role='admin' เองได้เลย
 * ต้องรัน SQL ตรงๆ ผ่าน Supabase Dashboard (ดู README/CHANGELOG ประกอบ) —
 * เจตนาให้มี admin ได้แค่คนที่เจ้าของระบบตั้งเองเท่านั้น
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

  // สมัครสมาชิกใหม่ — trigger handle_new_user() จะ insert public.users
  // ให้อัตโนมัติด้วย role='user' เสมอ (ดู comment บนสุดของไฟล์)
  // ถ้าเปิด "Confirm email" ไว้ที่ Supabase Dashboard, session จะยังไม่ active
  // จนกว่า user จะกดยืนยันจากอีเมล — data.user จะมีค่าแต่ data.session เป็น null
  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signOut = () => supabase.auth.signOut()

  const value = {
    user,
    role,
    loading,
    isAdmin: role === 'admin',
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
