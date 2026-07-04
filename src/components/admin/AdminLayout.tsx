import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (profile?.role !== 'ADMIN') {
    return (
      <div className="admin-denied">
        <h2>Acesso negado</h2>
        <p>Você não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <button
        className="admin-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`admin-sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
        <AdminSidebar />
      </div>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
