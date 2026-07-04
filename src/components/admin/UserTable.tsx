import { Shield, ShieldOff, Lock, Pencil } from 'lucide-react';
import type { AdminUsuario } from '../../services/adminService';

interface UserTableProps {
  users: AdminUsuario[];
  currentUserId?: string;
  onEdit: (user: AdminUsuario) => void;
  onResetPassword: (user: AdminUsuario) => void;
  onToggleActive: (user: AdminUsuario) => void;
}

export default function UserTable({ users, currentUserId, onEdit, onResetPassword, onToggleActive }: UserTableProps) {
  if (users.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>Nenhum usuário encontrado.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Matrícula</th>
          <th>Nome</th>
          <th>Perfil</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className={u.ativo ? '' : 'inativo'}>
            <td className="td-matricula" data-label="Matrícula">{u.matricula}</td>
            <td className="td-nome" data-label="Nome">{u.nome_completo}</td>
            <td data-label="Perfil">
              <span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-funcionario'}`}>
                {u.role}
              </span>
            </td>
            <td data-label="Status">
              <span className={`badge ${u.ativo ? 'badge-active' : 'badge-inactive'}`}>
                {u.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </td>
            <td className="td-actions" data-label="Ações">
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="admin-btn-icon" title="Editar" onClick={() => onEdit(u)}>
                  <Pencil size={15} />
                </button>
                <button className="admin-btn-icon" title="Resetar senha" onClick={() => onResetPassword(u)}>
                  <Lock size={15} />
                </button>
                {u.id !== currentUserId && (
                  <button
                    className="admin-btn-icon"
                    title={u.ativo ? 'Desativar' : 'Ativar'}
                    onClick={() => onToggleActive(u)}
                  >
                    {u.ativo ? <ShieldOff size={15} /> : <Shield size={15} />}
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
