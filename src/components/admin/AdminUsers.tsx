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
import { useSearchParams } from 'react-router-dom';

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 4) pages.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 3) pages.push('ellipsis');

  pages.push(total);
  return pages;
}

export default function AdminUsers() {
  const { profile } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editTarget, setEditTarget] = useState<AdminUsuario | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUsuario | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUsuario | null>(null);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(p));
    setSearchParams(params, { replace: true });
  }

  async function loadUsers(p: number) {
    setLoading(true);
    try {
      const res = await listarUsuarios({ page: p, per_page: perPage });
      setUsers(res.data);
      setTotalPages(Math.ceil(res.meta.total / res.meta.per_page));
      setTotal(res.meta.total);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(page); }, [page]);

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
      loadUsers(page);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status');
    }
    setDeactivateTarget(null);
  }

  const pageNumbers = getPageNumbers(page, totalPages);

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
          <UserForm onCreated={() => { loadUsers(page); setShowForm(false); }} />
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
        <>
          <UserTable
            users={filtered}
            currentUserId={profile?.id}
            onEdit={setEditTarget}
            onResetPassword={setResetTarget}
            onToggleActive={(u) => u.ativo ? setDeactivateTarget(u) : handleToggleActive(u)}
          />
          {totalPages > 1 && (
            <div className="admin-pagination">
              <span>{total} registros</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  className="admin-btn admin-btn-ghost pagination-page"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </button>
                {pageNumbers.map((num, i) =>
                  num === 'ellipsis' ? (
                    <span key={`e${i}`} className="pagination-ellipsis">…</span>
                  ) : (
                    <button
                      key={num}
                      className={`admin-btn admin-btn-ghost pagination-page${num === page ? ' active' : ''}`}
                      disabled={num === page}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  ),
                )}
                <button
                  className="admin-btn admin-btn-ghost pagination-page"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {editTarget && (
        <UserEditModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { loadUsers(page); setEditTarget(null); }} />
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
