import { useAuth } from '../contexts/AuthContext'
import { PortalViewProvider, usePortalView } from '../contexts/PortalViewContext'
import { FuncionarioPage } from './FuncionarioPage'
import { GestorPage } from './GestorPage'

function StaffPortalContent() {
  const { view } = usePortalView()!
  return view === 'funcionario' ? <FuncionarioPage /> : <GestorPage />
}

/**
 * Portal para quem tem role_setor GESTOR em algum setor.
 * role global e role_setor são independentes (AUTH.md).
 */
export function StaffPortal() {
  const { isGestorSetor } = useAuth()

  if (!isGestorSetor) {
    return <FuncionarioPage />
  }

  return (
    <PortalViewProvider>
      <StaffPortalContent />
    </PortalViewProvider>
  )
}
