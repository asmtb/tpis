import { useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

/**
 * หน้า "จัดการบัญชี" — ตอนนี้มีแค่เปลี่ยนรหัสผ่าน (ฟีเจอร์อื่นเช่นแก้ชื่อ/
 * ลบบัญชี ค่อยเพิ่มทีหลังถ้าต้องการ) ใช้ supabase.auth.updateUser() ตรงๆ
 * ไม่ต้องผ่าน RLS เพราะเป็น Auth API ไม่ใช่ table query
 */
export default function AccountPage() {
  const { user } = useAuth()
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(false)
  const [submitting, setSubmit]   = useState(false)

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
      setError(err.message)
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
