import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

export default function SignInPage() {
  const { user, loading, signIn } = useAuth()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState(null)
  const [submitting, setSubmit]   = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/admin'

  // login อยู่แล้ว (เช่นเปิดแท็บใหม่ หรือ refresh หน้า) — เด้งกลับไปหน้าที่ตั้งใจจะมาเลย
  if (!loading && user) return <Navigate to={from} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmit(true)
    setError(null)
    const { error: err } = await signIn(email.trim(), password)
    setSubmit(false)
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        : err.message)
      return
    }
    navigate(from, { replace: true })
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
        <div className="signin-title">เข้าสู่ระบบ Admin</div>
        <div className="signin-sub">Thailand Property Intelligence System</div>

        {error && <div className="alert error" style={{ marginTop: 14 }}>{error}</div>}

        <label className="signin-label" htmlFor="signin-email">อีเมล</label>
        <input
          id="signin-email"
          className="signin-input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
          required
        />

        <label className="signin-label" htmlFor="signin-password">รหัสผ่าน</label>
        <input
          id="signin-password"
          className="signin-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button className="abtn primary signin-submit" type="submit" disabled={submitting}>
          {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
