import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'

/** ครอบ route ที่ต้องการแค่ "login แล้ว" ไม่จำกัด role (ต่างจาก RequireAdmin
 *  ที่ต้องเป็น role='admin' เท่านั้น) — ใช้กับหน้าที่ user ทั่วไปเข้าได้ เช่น
 *  /wishlist, /account — ยังไม่ login → เด้งไป /signin (จำหน้าที่ตั้งใจจะมา
 *  ไว้ใน location.state.from เพื่อเด้งกลับมาอัตโนมัติหลัง login สำเร็จ) */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
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

  return children
}
