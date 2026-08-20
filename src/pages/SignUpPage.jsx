import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

/**
 * สมัครสมาชิกสาธารณะ — role ของทุกคนที่สมัครผ่านหน้านี้จะเป็น 'user' เสมอ
 * (ดู comment ใน AuthContext.jsx / trigger handle_new_user() ฝั่ง DB)
 *
 * ถ้า Supabase Auth ตั้ง "Confirm email" ไว้ (ตั้งค่าไว้แล้วที่ Dashboard):
 *   signUp() สำเร็จแต่ data.session จะเป็น null จนกว่า user จะกดลิงก์ยืนยัน
 *   ในอีเมล — เพราะฉะนั้นหลัง submit สำเร็จ "ห้าม" navigate ไปหน้า login ทันที
 *   ต้องโชว์ข้อความ "เช็คอีเมลเพื่อยืนยัน" ค้างไว้แทน
 */
export default function SignUpPage() {
  const { user, loading, signUp } = useAuth()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError]         = useState(null)
  const [submitting, setSubmit]   = useState(false)
  const [done, setDone]           = useState(false)
  const navigate = useNavigate()

  // login อยู่แล้ว — ไม่ต้องมาหน้าสมัครสมาชิกอีก
  if (!loading && user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (password !== password2) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }

    setSubmit(true)
    setError(null)
    const { data, error: err } = await signUp(email.trim(), password)
    setSubmit(false)

    if (err) {
      // log raw error ไว้ debug ใน console เสมอ — err.message อาจไม่มี
      // (เช่น Auth server ส่ง error กลับมาไม่ครบ ตอนที่ custom SMTP ส่งอีเมล
      // ไม่สำเร็จ) กัน user เห็นข้อความที่อ่านไม่รู้เรื่องอย่าง "{}" หรือ "undefined"
      console.error('[SignUp] error:', err)
      let msg = 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
      if (err.message === 'User already registered') {
        msg = 'อีเมลนี้มีบัญชีอยู่แล้ว'
      } else if (typeof err.message === 'string' && err.message.trim()) {
        msg = err.message
      }
      setError(msg)
      return
    }

    // มี session ทันที = ปิด "Confirm email" ไว้ที่ Dashboard → เข้าระบบได้เลย
    // ไม่มี session = ต้องรอ user กดยืนยันจากอีเมลก่อน
    if (data?.session) {
      navigate('/', { replace: true })
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="signin-wrap">
        <div className="signin-card">
          <div className="signin-logo">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>TPIS</span>
          </div>
          <div className="signin-title">สมัครสมาชิกสำเร็จ</div>
          <div className="signin-sub" style={{ marginTop: 4 }}>
            กรุณาเช็คอีเมล <strong>{email}</strong> เพื่อกดยืนยันตัวตน
            ก่อนเข้าสู่ระบบครั้งแรก
          </div>
          <div className="signin-switch" style={{ marginTop: 20 }}>
            <Link to="/signin">กลับไปหน้าเข้าสู่ระบบ</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="signin-wrap">
      <form className="signin-card" onSubmit={handleSubmit}>
        <div className="signin-logo">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>TPIS</span>
        </div>
        <div className="signin-title">สมัครสมาชิก</div>
        <div className="signin-sub">Thailand Property Intelligence System</div>

        {error && <div className="alert error" style={{ marginTop: 14 }}>{error}</div>}

        <label className="signin-label" htmlFor="signup-email">อีเมล</label>
        <input
          id="signup-email"
          className="signin-input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
          required
        />

        <label className="signin-label" htmlFor="signup-password">รหัสผ่าน</label>
        <input
          id="signup-password"
          className="signin-input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <label className="signin-label" htmlFor="signup-password2">ยืนยันรหัสผ่าน</label>
        <input
          id="signup-password2"
          className="signin-input"
          type="password"
          autoComplete="new-password"
          value={password2}
          onChange={e => setPassword2(e.target.value)}
          required
          minLength={6}
        />

        <button className="abtn primary signin-submit" type="submit" disabled={submitting}>
          {submitting ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
        </button>

        <div className="signin-switch">
          มีบัญชีอยู่แล้ว? <Link to="/signin">เข้าสู่ระบบ</Link>
        </div>
      </form>
    </div>
  )
}
