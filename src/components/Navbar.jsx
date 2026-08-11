import { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

export default function Navbar() {
  const [query, setQuery] = useState('')
  const [dark, setDark]   = useState(() =>
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('tpis-theme') === 'dark'
      : false
  )
  const navigate = useNavigate()
  const { user, isAdmin, signOut } = useAuth()

  useEffect(() => {
    const theme = dark ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tpis-theme', theme)
  }, [dark])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/?q=${encodeURIComponent(query.trim())}`)
    setQuery('')
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
      {/* Logo — กดกลับหน้าหลัก */}
      <Link to="/" className="navbar-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        TPIS
        <span className="navbar-logo-sub">Thailand Property Intelligence</span>
      </Link>

      {/* Global Search */}
      <form className="navbar-search" onSubmit={handleSearch}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="ค้นหาโฉนด, จังหวัด, เจ้าของ..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </form>

      {/* Nav links */}
      <div className="navbar-nav">
        {[
          { to: '/',          label: 'ค้นหา',     end: true },
          { to: '/map',       label: 'GIS Map' },
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/admin',     label: 'Admin' },
        ].map(({ to, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            {label}
          </NavLink>
        ))}
      </div>

      {/* Auth widget */}
      {user ? (
        <div className="navbar-auth">
          <span className="navbar-auth-email" title={user.email}>
            {isAdmin ? '👤 ' : ''}{user.email}
          </span>
          <button
            className="navbar-auth-btn"
            onClick={async () => { await signOut(); navigate('/') }}
          >
            ออกจากระบบ
          </button>
        </div>
      ) : (
        <NavLink to="/signin" className="navbar-auth-btn">เข้าสู่ระบบ</NavLink>
      )}

      {/* Dark mode toggle */}
      <button
        className="dark-toggle"
        onClick={() => setDark(d => !d)}
        title={dark ? 'เปลี่ยนเป็น Light mode' : 'เปลี่ยนเป็น Dark mode'}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>
      </div>
    </nav>
  )
}
