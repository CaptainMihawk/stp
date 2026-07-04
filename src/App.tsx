import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { StaffPortal } from './pages/StaffPortal'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminUsers from './components/admin/AdminUsers'
import AdminSectors from './components/admin/AdminSectors'
import AdminFunctions from './components/admin/AdminFunctions'
import AdminSettings from './components/admin/AdminSettings'
import AdminHistory from './components/admin/AdminHistory'

function ProtectedArea() {
  const { session, profile, loading } = useAuth()

  if (loading) return <div className="center-screen">Carregando...</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    return (
      <div className="center-screen" style={{ flexDirection: 'column', gap: '12px' }}>
        <p>Não foi possível carregar seu perfil.</p>
        <a href="/login">Voltar ao login</a>
      </div>
    )
  }

  return <StaffPortal />
}

export default function App() {
  const { session, profile, loading } = useAuth()

  if (loading) return <div className="center-screen">Carregando...</div>

  const isAuthenticated = Boolean(session && profile)

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (profile?.role === 'ADMIN') {
    return (
      <Routes>
        <Route path="/login" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="sectors" element={<AdminSectors />} />
          <Route path="functions" element={<AdminFunctions />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="history" element={<AdminHistory />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/" element={<ProtectedArea />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
