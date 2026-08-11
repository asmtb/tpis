import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext.jsx'
import RequireAdmin from './components/RequireAdmin.jsx'
import Navbar from './components/Navbar.jsx'
import SearchPage from './pages/SearchPage.jsx'
import DetailPage from './pages/DetailPage.jsx'
import MapPage from './pages/MapPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
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
            <Route path="/dashboard"  element={<DashboardPage />} />
            <Route path="/signin"     element={<SignInPage />} />
            <Route path="/admin"      element={<RequireAdmin><AdminPage /></RequireAdmin>} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}
