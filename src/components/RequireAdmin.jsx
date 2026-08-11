import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

/** ครอบ route ที่ต้องการสิทธิ์ admin — ยังไม่ login → เด้งไป /signin (จำหน้าที่ตั้งใจ
 *  จะมาไว้ใน location.state.from เพื่อเด้งกลับมาอัตโนมัติหลัง login สำเร็จ)
 *  login แล้วแต่ role ไม่ใช่ admin → โชว์ข้อความแจ้งเตือนแทนหน้าเปล่าๆ */
export default function RequireAdmin({ children }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="state-box" style={{ paddingTop: 80 }}>
        <div className="dots"><span/><span/><span/></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />
  }

  if (role !== 'admin') {
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 20px' }}>
        <div className="alert error">
          บัญชีนี้ไม่มีสิทธิ์เข้าหน้า Admin (role ปัจจุบัน: {role || 'ไม่ทราบ'})
          <br />ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ role admin
        </div>
      </div>
    )
  }

  return children
}
