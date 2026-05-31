import React, { useState } from 'react'
import { Shield, Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
  title: string
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ title, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      {/* Mobile header with hamburger */}
      <header className="mobile-header">
        <div className="mobile-header-brand">
          <div className="brand-mark">STP</div>
          <h2>Sistema STP</h2>
        </div>
        <div className="mobile-header-actions">
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      <div className="app-shell-body">
        {/* Overlay for mobile drawer */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' is-open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="main-content">
          <header className="page-header">
            <div>
              <h1>{title}</h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                Painel operacional integrado com Supabase.
              </p>
            </div>
            <div className="header-chip">
              <Shield size={14} /> RLS Ativo
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  )
}