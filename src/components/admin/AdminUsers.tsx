import { useEffect, useState, useMemo } from 'react';
import { Users, Plus } from 'lucide-react';
import { listarUsuarios, desativarUsuario, ativarUsuario } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import type { AdminUsuario } from '../../services/adminService';
import { useToast } from '../Toast';
import { ConfirmDialog } from '../ConfirmDialog';
import UserForm from './UserForm';
import UserTable from './UserTable';
import UserEditModal from './UserEditModal';
import UserResetModal from './UserResetModal';

export default function AdminUsers() {
  const { profile } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<AdminUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editTarget, setEditTarget] = useState<AdminUsuario | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUsuario | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUsuario | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await listarUsuarios();
      setUsers(data);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!u.nome_completo.toLowerCase().includes(term) && !u.matricula.toLowerCase().includes(term)) return false;
      }
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter === 'true' && !u.ativo) return false;
      if (statusFilter === 'false' && u.ativo) return false;
      return true;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  async function handleToggleActive(user: AdminUsuario) {
    try {
      if (user.ativo) {
        const result = await desativarUsuario(user.id);
        if (result.aviso) {
          toast.warning(result.aviso);
        } else {
          toast.success('Usuário desativado');
        }
      } else {
        await ativarUsuario(user.id);
        toast.success('Usuário ativado');
      }
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status');
    }
    setDeactivateTarget(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Users size={24} /> Usuários
        </h1>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <UserForm onCreated={() => { loadUsers(); setShowForm(false); }} />
        </div>
      )}

      <div className="admin-filters">
        <input
          placeholder="Buscar por nome ou matrícula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Todos os perfis</option>
          <option value="ADMIN">Admin</option>
          <option value="FUNCIONARIO">Funcionário</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>

      {loading ? (
        <div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton skeleton-cell" style={{ width: 80 }} />
              <div className="skeleton skeleton-cell" style={{ flex: 1 }} />
              <div className="skeleton skeleton-cell" style={{ width: 60 }} />
            </div>
          ))}
        </div>
      ) : (
        <UserTable
          users={filtered}
          currentUserId={profile?.id}
          onEdit={setEditTarget}
          onResetPassword={setResetTarget}
          onToggleActive={(u) => u.ativo ? setDeactivateTarget(u) : handleToggleActive(u)}
        />
      )}

      {editTarget && (
        <UserEditModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { loadUsers(); setEditTarget(null); }} />
      )}

      {resetTarget && (
        <UserResetModal profileId={resetTarget.id} userName={resetTarget.nome_completo} onClose={() => setResetTarget(null)} />
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Desativar Usuário"
        message={`Tem certeza que deseja desativar ${deactivateTarget?.nome_completo}?`}
        confirmLabel="Desativar"
        confirmClass="danger-button"
        onConfirm={() => deactivateTarget && handleToggleActive(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
