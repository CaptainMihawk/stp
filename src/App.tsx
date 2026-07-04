import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { AdminPage } from './pages/AdminPage'
import { StaffPortal } from './pages/StaffPortal'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminUsers from './components/admin/AdminUsers'
import AdminSectors from './components/admin/AdminSectors'
import AdminFunctions from './components/admin/AdminFunctions'
import AdminSettings from './components/admin/AdminSettings'
import AdminHistory from './components/admin/AdminHistory'

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="sectors" element={<AdminSectors />} />
        <Route path="functions" element={<AdminFunctions />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="history" element={<AdminHistory />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}

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

  if (profile.role === 'ADMIN') return <AdminRoutes />
  return <StaffPortal />
}

export default function App() {
  const { session, profile, loading } = useAuth()

  if (loading) return <div className="center-screen">Carregando...</div>

  const isAuthenticated = Boolean(session && profile)

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/" element={<ProtectedArea />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
