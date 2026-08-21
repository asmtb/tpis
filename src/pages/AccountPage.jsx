import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

const REMINDER_DAY_OPTIONS = [
  { value: 7, label: '7 วันก่อนนัด' },
  { value: 3, label: '3 วันก่อนนัด' },
  { value: 1, label: '1 วันก่อนนัด' },
]

/**
 * หน้า "จัดการบัญชี" — เปลี่ยนรหัสผ่าน + preference แจ้งเตือนนัดประมูล
 * ของทรัพย์ใน wishlist ทางอีเมล (ยังไม่มี backend ส่งจริง — บันทึกแค่
 * preference ไว้ก่อน รอทำ Cloud Run Job ส่งอีเมลจริงในสเต็ปถัดไป)
 *
 * ใช้ supabase.auth.updateUser() สำหรับรหัสผ่าน (Auth API ไม่ผ่าน RLS)
 * แต่ preference แจ้งเตือนเก็บใน public.users ต้องผ่าน RLS จริง — ต้องมี
 * policy "user update own profile" ก่อน (migration 0015) ไม่งั้น update
 * จะโดน RLS บล็อกเงียบๆ (0 แถวถูกอัปเดต แต่ไม่ error)
 */
export default function AccountPage() {
  const { user } = useAuth()
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(false)
  const [submitting, setSubmit]   = useState(false)

  // ── Wishlist reminder preferences ──
  const [notifyEnabled, setNotifyEnabled] = useState(false)
  const [reminderDays, setReminderDays]   = useState([])
  const [prefsLoading, setPrefsLoading]   = useState(true)
  const [prefsSaving, setPrefsSaving]     = useState(false)
  const [prefsError, setPrefsError]       = useState(null)
  const [prefsSuccess, setPrefsSuccess]   = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadPrefs() {
      if (!user) return
      const { data, error: err } = await supabase
        .from('users')
        .select('wishlist_notify_enabled, wishlist_reminder_days')
        .eq('id', user.id)
        .single()
      if (cancelled) return
      if (err) {
        console.error('[Account] load wishlist prefs error:', err)
      } else if (data) {
        setNotifyEnabled(!!data.wishlist_notify_enabled)
        setReminderDays(data.wishlist_reminder_days || [])
      }
      setPrefsLoading(false)
    }
    loadPrefs()
    return () => { cancelled = true }
  }, [user])

  const toggleDay = (day) => {
    setReminderDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => b - a)
    )
  }

  const handleSavePrefs = async () => {
    if (prefsSaving) return
    setPrefsError(null)
    setPrefsSuccess(false)

    // เปิดแจ้งเตือนแต่ไม่เลือกวันไหนเลย — กันไว้ไม่ให้ save เป็นสถานะที่
    // เปิดไว้แต่ไม่มีทางส่งอะไรเลย เพราะ backend job จะไม่มี day มาเทียบ
    if (notifyEnabled && reminderDays.length === 0) {
      setPrefsError('กรุณาเลือกอย่างน้อย 1 ช่วงเวลาแจ้งเตือน')
      return
    }

    setPrefsSaving(true)
    const { error: err } = await supabase
      .from('users')
      .update({
        wishlist_notify_enabled: notifyEnabled,
        wishlist_reminder_days: notifyEnabled ? reminderDays : [],
      })
      .eq('id', user.id)
    setPrefsSaving(false)

    if (err) {
      console.error('[Account] save wishlist prefs error:', err)
      setPrefsError(
        typeof err.message === 'string' && err.message.trim()
          ? err.message
          : 'บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
      )
      return
    }
    setPrefsSuccess(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    setError(null)
    setSuccess(false)

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (password !== password2) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }

    setSubmit(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setSubmit(false)

    if (err) {
      console.error('[Account] update password error:', err)
      setError(
        typeof err.message === 'string' && err.message.trim()
          ? err.message
          : 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
      )
      return
    }

    setSuccess(true)
    setPassword('')
    setPassword2('')
  }

  return (
    <div style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
        จัดการบัญชี
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: 24 }}>
        {user?.email}
      </p>

      {/* ── การแจ้งเตือนนัดประมูล (wishlist) ── */}
      <div className="signin-card" style={{ padding: '24px 24px', marginBottom: 20 }}>
        <div className="signin-title" style={{ fontSize: '1rem' }}>
          แจ้งเตือนนัดประมูลทางอีเมล
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 4, marginBottom: 16 }}>
          รับอีเมลแจ้งเตือนก่อนวันนัดประมูลของทรัพย์ที่บันทึกไว้ใน
          <strong> ทรัพย์ที่บันทึกไว้ (♡)</strong>
        </p>

        {prefsLoading ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>กำลังโหลด...</div>
        ) : (
          <>
            {prefsError   && <div className="alert error"   style={{ marginBottom: 14 }}>{prefsError}</div>}
            {prefsSuccess && <div className="alert success" style={{ marginBottom: 14 }}>บันทึกการตั้งค่าสำเร็จ</div>}

            <label style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', marginBottom: notifyEnabled ? 14 : 0,
            }}>
              <input
                type="checkbox"
                checked={notifyEnabled}
                onChange={e => {
                  setNotifyEnabled(e.target.checked)
                  setPrefsSuccess(false)
                }}
                style={{ width: 16, height: 16 }}
              />
              เปิดใช้งานแจ้งเตือน
            </label>

            {notifyEnabled && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {REMINDER_DAY_OPTIONS.map(opt => {
                  const active = reminderDays.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { toggleDay(opt.value); setPrefsSuccess(false) }}
                      className={`day-chip${active ? ' active' : ''}`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              className="abtn primary signin-submit"
              style={{ marginTop: 0 }}
              onClick={handleSavePrefs}
              disabled={prefsSaving}
            >
              {prefsSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าแจ้งเตือน'}
            </button>
          </>
        )}
      </div>

      {/* ── เปลี่ยนรหัสผ่าน ── */}
      <form className="signin-card" onSubmit={handleSubmit} style={{ padding: '24px 24px' }}>
        <div className="signin-title" style={{ fontSize: '1rem' }}>เปลี่ยนรหัสผ่าน</div>

        {error   && <div className="alert error"   style={{ marginTop: 14 }}>{error}</div>}
        {success && <div className="alert success" style={{ marginTop: 14 }}>เปลี่ยนรหัสผ่านสำเร็จ</div>}

        <label className="signin-label" htmlFor="account-password">รหัสผ่านใหม่</label>
        <input
          id="account-password"
          className="signin-input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <label className="signin-label" htmlFor="account-password2">ยืนยันรหัสผ่านใหม่</label>
        <input
          id="account-password2"
          className="signin-input"
          type="password"
          autoComplete="new-password"
          value={password2}
          onChange={e => setPassword2(e.target.value)}
          required
          minLength={6}
        />

        <button className="abtn primary signin-submit" type="submit" disabled={submitting}>
          {submitting ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
        </button>
      </form>
    </div>
  )
}
