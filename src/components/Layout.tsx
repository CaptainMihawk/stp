import React from 'react'
import { Shield } from 'lucide-react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
  title: string
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ title, children }) => {
  return (
    <div className="app-shell">
      <Sidebar />
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
  )
}