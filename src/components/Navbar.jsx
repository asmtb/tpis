import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { fmtNum } from '../lib/utils.js'

export default function Navbar() {
  const [total, setTotal] = useState(null)

  useEffect(() => {
    supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setTotal(count))
  }, [])

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

      <div className="navbar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          ค้นหาทรัพย์
        </NavLink>
        <NavLink to="/map" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          แผนที่
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Admin
        </NavLink>
      </div>

      {total !== null && (
        <div className="navbar-right">
          <div className="navbar-stat">
            <strong>{fmtNum(total)}</strong>
            รายการในระบบ
          </div>
        </div>
      )}
    </nav>
  )
}
