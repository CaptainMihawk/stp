import React from 'react'
import { LogOut, Sun, Moon, UserCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePortalView } from '../contexts/PortalViewContext'
import { useTheme } from '../contexts/ThemeContext'
import { SessionExpiryHint } from './SessionExpiryHint'

export const Sidebar: React.FC = () => {
  const { profile, signOut, isGestorSetor } = useAuth()
  const portalView = usePortalView()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="sidebar">
      <div>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SessionExpiryHint />

        <div className="theme-toggle-container">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="theme-toggle-label">
            Modo {theme === 'dark' ? 'Escuro' : 'Claro'}
          </span>
        </div>

        <button
          className="ghost-button"
          onClick={() => void signOut()}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <LogOut size={18} /> Sair
        </button>
      </div>
    </aside>
  )
}
