import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Settings,
  ScrollText,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/users', icon: Users, label: 'Usuários' },
  { to: '/admin/sectors', icon: Building2, label: 'Setores' },
  { to: '/admin/functions', icon: Briefcase, label: 'Funções' },
  { to: '/admin/settings', icon: Settings, label: 'Configurações' },
  { to: '/admin/history', icon: ScrollText, label: 'Histórico' },
];

export default function AdminSidebar() {
  const { signOut } = useAuth();

  return (
    <nav className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span className="admin-sidebar-logo">STP</span>
        <span className="admin-sidebar-title">Admin</span>
      </div>

      <ul className="admin-sidebar-nav">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <button className="admin-sidebar-logout" onClick={signOut}>
        <LogOut size={18} />
        <span>Sair</span>
      </button>
    </nav>
  );
}
