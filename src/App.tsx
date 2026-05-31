import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { AdminPage } from './pages/AdminPage'
import { StaffPortal } from './pages/StaffPortal'

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

  if (profile.role === 'ADMIN') return <AdminPage />
  // Gestor operacional = role_setor GESTOR (AUTH.md), não profiles.role global
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