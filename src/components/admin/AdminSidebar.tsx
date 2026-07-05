import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Settings,
  ScrollText,
  LogOut,
  Sun,
  Moon,
  KeyRound,
  ShieldAlert,
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
  const { signOut, updatePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ text: string; error: boolean } | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordStatus({ text: 'Mínimo 6 caracteres.', error: true });
      return;
    }
    setPasswordPending(true);
    setPasswordStatus(null);
    const result = await updatePassword(newPassword);
    setPasswordPending(false);
    if (result.error) {
      setPasswordStatus({ text: result.error, error: true });
    } else {
      setPasswordStatus({ text: 'Senha atualizada!', error: false });
      setNewPassword('');
      setTimeout(() => setShowPasswordForm(false), 1500);
    }
  }

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

      {showPasswordForm && (
        <form className="sidebar-password-form" onSubmit={handlePasswordSubmit} style={{ padding: '0 16px 8px' }}>
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
          <button type="submit" className="admin-btn admin-btn-primary" disabled={passwordPending || newPassword.length < 6} style={{ fontSize: '0.75rem', padding: '6px 12px', width: '100%' }}>
            {passwordPending ? 'Salvando...' : 'Atualizar Senha'}
          </button>
        </form>
      )}

      <div className="admin-sidebar-actions">
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
            onClick={() => { setShowPasswordForm(v => !v); setPasswordStatus(null); setNewPassword(''); }}
            title="Alterar senha"
            aria-label="Alterar senha"
          >
            <KeyRound size={15} />
          </button>
        </div>

        <button className="admin-sidebar-logout" onClick={signOut}>
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
}
