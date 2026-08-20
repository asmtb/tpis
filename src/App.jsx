import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext.jsx'
import { WishlistProvider } from './lib/WishlistContext.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import Navbar from './components/Navbar.jsx'
import SearchPage from './pages/SearchPage.jsx'
import DetailPage from './pages/DetailPage.jsx'
import MapPage from './pages/MapPage.jsx'
import AdminLayout from './pages/AdminLayout.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AdminCrawlerPage from './pages/AdminCrawlerPage.jsx'
import AdminParcelsPage from './pages/AdminParcelsPage.jsx'
import SignInPage from './pages/SignInPage.jsx'
import SignUpPage from './pages/SignUpPage.jsx'
import WishlistPage from './pages/WishlistPage.jsx'
import AccountPage from './pages/AccountPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      {/* WishlistProvider อยู่ใต้ AuthProvider เพราะต้องใช้ useAuth() ข้างใน
          (ต้องรู้ user ปัจจุบันก่อนถึงจะ fetch user_watchlists ได้ถูกคน) */}
      <WishlistProvider>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/"           element={<SearchPage />} />
              <Route path="/map"        element={<MapPage />} />
              <Route path="/property/:id" element={<DetailPage />} />
              <Route path="/signin"     element={<SignInPage />} />
              <Route path="/signup"     element={<SignUpPage />} />

              <Route path="/wishlist" element={<RequireAuth><WishlistPage /></RequireAuth>} />
              <Route path="/account"  element={<RequireAuth><AccountPage /></RequireAuth>} />

              {/* /dashboard เดิมย้ายเข้าไปเป็น tab ใน /admin แล้ว — ลิงก์เก่าเด้งไปที่นั่นแทน */}
              <Route path="/dashboard"  element={<Navigate to="/admin/dashboard" replace />} />

              <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index          element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="crawler"   element={<AdminCrawlerPage />} />
                <Route path="parcels"   element={<AdminParcelsPage />} />
              </Route>

              <Route path="*"           element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </WishlistProvider>
    </AuthProvider>
  )
}
