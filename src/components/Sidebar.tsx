import React, { useState } from 'react'
import { LogOut, Sun, Moon, UserCircle2, KeyRound, ShieldAlert, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePortalView } from '../contexts/PortalViewContext'
import { useTheme } from '../contexts/ThemeContext'
import { SessionExpiryHint } from './SessionExpiryHint'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { profile, signOut, isGestorSetor, updatePassword } = useAuth()
  const portalView = usePortalView()
  const { theme, toggleTheme } = useTheme()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<{ text: string; error: boolean } | null>(null)
  const [passwordPending, setPasswordPending] = useState(false)

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) {
      setPasswordStatus({ text: 'Mínimo 6 caracteres.', error: true })
      return
    }
    setPasswordPending(true)
    setPasswordStatus(null)
    const result = await updatePassword(newPassword)
    setPasswordPending(false)
    if (result.error) {
      setPasswordStatus({ text: result.error, error: true })
    } else {
      setPasswordStatus({ text: 'Senha atualizada!', error: false })
      setNewPassword('')
      setTimeout(() => setShowPasswordForm(false), 1500)
    }
  }

  return (
    <aside className={`sidebar${isOpen ? ' is-open' : ''}`}>
      <div>
        {/* Close button (mobile only) */}
        <div className="sidebar-close">
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="brand">
          <div className="brand-mark">STP</div>
          <div>
            <h2>Sistema STP</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500 }}>
              Troca de Plantão
            </p>
          </div>
        </div>

        <div className="profile-card">
          <UserCircle2 size={36} style={{ color: 'var(--primary-strong)' }} />
          <div className="profile-info">
            <span className="profile-name" title={profile?.nome_completo}>
              {profile?.nome_completo}
            </span>
            <span className="profile-role">
              Matrícula: {profile?.matricula}
            </span>
            <span className="badge" style={{ marginTop: '6px', alignSelf: 'flex-start' }}>
              {profile?.role}
              {isGestorSetor && portalView ? ' · Gestor de setor' : ''}
            </span>
          </div>
        </div>

        {showPasswordForm && (
          <form className="sidebar-password-form" onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
              autoFocus
            />
            {newPassword && newPassword.length < 6 && (
              <span style={{ fontSize: '0.7rem', color: 'var(--danger-strong)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldAlert size={12} /> Mínimo 6 caracteres
              </span>
            )}
            {passwordStatus && (
              <span style={{ fontSize: '0.7rem', color: passwordStatus.error ? 'var(--danger-strong)' : 'var(--success-strong)' }}>
                {passwordStatus.text}
              </span>
            )}
            <button type="submit" className="primary-button" disabled={passwordPending || newPassword.length < 6} style={{ fontSize: '0.75rem', padding: '6px 12px', width: '100%' }}>
              {passwordPending ? 'Salvando...' : 'Atualizar Senha'}
            </button>
          </form>
        )}

        {isGestorSetor && portalView && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '16px',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Área de trabalho
            </span>
            <button
              type="button"
              className={portalView.view === 'funcionario' ? 'primary-button' : 'ghost-button'}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
              onClick={() => portalView.setView('funcionario')}
            >
              Minhas trocas
            </button>
            <button
              type="button"
              className={portalView.view === 'gestor' ? 'primary-button' : 'ghost-button'}
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
              onClick={() => portalView.setView('gestor')}
            >
              Homologação
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="sidebar-actions-row">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            type="button"
            className="sidebar-password-btn"
            onClick={() => { setShowPasswordForm(v => !v); setPasswordStatus(null); setNewPassword('') }}
            title="Alterar senha"
            aria-label="Alterar senha"
          >
            <KeyRound size={15} />
          </button>
        </div>

        <button
          className="ghost-button"
          onClick={() => void signOut()}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <LogOut size={18} /> Sair
        </button>

        <SessionExpiryHint />
      </div>
    </aside>
  )
}
