import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/crawler',   label: 'Crawler' },
  { to: '/admin/parcels',   label: 'จัดการโฉนด' },
]

/** ครอบทุก tab ย่อยของ /admin — route guard (RequireAdmin) อยู่ที่ App.jsx แล้ว
 *  ชั้นนี้มีหน้าที่แค่ render header + tab bar + <Outlet/> ของ tab ที่เลือก
 *  ใช้ route จริง (ไม่ใช่ client-side state) เพื่อให้ back/forward ของ browser
 *  ใช้งานได้ปกติ และ refresh หน้าค้างที่ tab เดิมได้ */
export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <div className="admin-shell-hd">
        <div className="admin-title">Admin Panel</div>
        <div style={{ fontSize: '0.83rem', color: 'var(--text-3)' }}>
          จัดการ crawler, โฉนด, session cookies และดูสถิติระบบ
        </div>
      </div>

      <div className="admin-tabs">
        {TABS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `admin-tab${isActive ? ' active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
