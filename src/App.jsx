import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import SearchPage from './pages/SearchPage.jsx'
import DetailPage from './pages/DetailPage.jsx'
import MapPage from './pages/MapPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"           element={<SearchPage />} />
          <Route path="/map"        element={<MapPage />} />
          <Route path="/property/:id" element={<DetailPage />} />
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/admin"      element={<AdminPage />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
