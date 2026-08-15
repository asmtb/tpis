import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import Navbar from './components/Navbar.jsx'
import SearchPage from './pages/SearchPage.jsx'
import DetailPage from './pages/DetailPage.jsx'
import MapPage from './pages/MapPage.jsx'
import AdminLayout from './pages/AdminLayout.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AdminCrawlerPage from './pages/AdminCrawlerPage.jsx'
import AdminParcelsPage from './pages/AdminParcelsPage.jsx'
import SignInPage from './pages/SignInPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/"           element={<SearchPage />} />
            <Route path="/map"        element={<MapPage />} />
            <Route path="/property/:id" element={<DetailPage />} />
            <Route path="/signin"     element={<SignInPage />} />

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
    </AuthProvider>
  )
}
