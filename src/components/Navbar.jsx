import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { fmtNum } from '../lib/utils.js'

export default function Navbar() {
  const [total, setTotal] = useState(null)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('assets').select('*', { count: 'exact', head: true })
      .then(({ count }) => setTotal(count))
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/?q=${encodeURIComponent(query.trim())}`)
    setQuery('')
  }

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        TPIS
        <span className="navbar-logo-sub">Thailand Property Intelligence</span>
      </div>

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

      {total !== null && (
        <div className="navbar-right">
          <div className="navbar-stat">
            <strong>{fmtNum(total)}</strong>
            <span>รายการในระบบ</span>
          </div>
        </div>
      )}
    </nav>
  )
}
