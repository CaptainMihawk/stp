import { useEffect, useState } from 'react';
import { Building2, Plus, Link2 } from 'lucide-react';
import { listarSetores, desativarSetor, reativarSetor, editarSetor, desativarMembro, listarMembrosSetor, alterarRoleSetor } from '../../services/setoresService';
import type { MembroSetor, SetorListItem } from '../../services/setoresService';
import { listarFuncoes, atribuirFuncaoMassa } from '../../services/adminService';
import type { TipoFuncao } from '../../services/adminService';
import { useToast } from '../Toast';
import { ConfirmDialog } from '../ConfirmDialog';
import SectorCreateForm from './SectorCreateForm';
import SectorLinkForm from './SectorLinkForm';
import SectorCard from './SectorCard';
import SectorMembers from './SectorMembers';

export default function AdminSectors() {
  const toast = useToast();
  const [setores, setSetores] = useState<SetorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSetorId, setSelectedSetorId] = useState<number | null>(null);
  const [membros, setMembros] = useState<MembroSetor[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<SetorListItem | null>(null);
  const [editTarget, setEditTarget] = useState<SetorListItem | null>(null);
  const [editNome, setEditNome] = useState('');
  const [deactivateMemberTarget, setDeactivateMemberTarget] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);

  // Alterar role de membro
  const [alterRoleTarget, setAlterRoleTarget] = useState<{
    profile_id: string;
    nome: string;
    role_atual: string;
    novo_role: 'MEMBRO' | 'GESTOR';
  } | null>(null);

  // Atribuição em massa (dentro do modal)
  const [showInactiveMembers, setShowInactiveMembers] = useState(false);
  const [massFuncao, setMassFuncao] = useState('');
  const [massSelectedMembers, setMassSelectedMembers] = useState<string[]>([]);
  const [funcoesList, setFuncoesList] = useState<TipoFuncao[]>([]);
  const [massLoading, setMassLoading] = useState(false);

  async function loadSetores() {
    setLoading(true);
    try {
      const data = await listarSetores();
      setSetores(data);
    } catch {
      toast.error('Erro ao carregar setores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSetores(); }, []);
  useEffect(() => { listarFuncoes().then(setFuncoesList).catch(() => {}); }, []);

  async function loadMembers(setorId: number) {
    setSelectedSetorId(setorId);
    setMassSelectedMembers([]);
    setMassFuncao('');
    setLoadingMembers(true);
    try {
      const data = await listarMembrosSetor(setorId);
      setMembros(data);
    } catch {
      toast.error('Erro ao carregar membros');
      setMembros([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  function closeModal() {
    setSelectedSetorId(null);
    setMassSelectedMembers([]);
    setMassFuncao('');
    setShowInactiveMembers(false);
  }

  async function handleToggleActive(setor: SetorListItem) {
    try {
      if (setor.ativo) {
        await desativarSetor(setor.id);
        toast.success(`${setor.nome} desativado`);
      } else {
        await reativarSetor(setor.id);
        toast.success(`${setor.nome} reativado`);
      }
      loadSetores();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
    setDeactivateTarget(null);
  }

  async function handleEditSave() {
    if (!editTarget || !editNome.trim()) return;
    try {
      await editarSetor(editTarget.id, editNome.trim());
      toast.success('Setor atualizado');
      setEditTarget(null);
      loadSetores();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao editar');
    }
  }

  async function handleDeactivateMember(profileId: string) {
    if (!selectedSetorId) return;
    try {
      await desativarMembro(profileId, selectedSetorId);
      toast.success('Vínculo removido');
      loadMembers(selectedSetorId);
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
    setDeactivateMemberTarget(null);
  }

  async function handleAlterarRole(profile_id: string, novo_role_setor: 'MEMBRO' | 'GESTOR') {
    const membro = membros.find((m) => m.profile_id === profile_id);
    if (!membro || !selectedSetorId) return;
    setAlterRoleTarget({
      profile_id,
      nome: membro.nome_completo,
      role_atual: membro.role_setor,
      novo_role: novo_role_setor,
    });
  }

  async function confirmAlterarRole() {
    if (!alterRoleTarget || !selectedSetorId) return;
    try {
      await alterarRoleSetor(alterRoleTarget.profile_id, selectedSetorId, alterRoleTarget.novo_role);
      toast.success(`Papel alterado para ${alterRoleTarget.novo_role}`);
      setAlterRoleTarget(null);
      loadMembers(selectedSetorId);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar papel');
      setAlterRoleTarget(null);
    }
  }

  async function handleMassAssign() {
    if (!selectedSetorId || !massFuncao || massSelectedMembers.length === 0) {
      toast.error('Selecione função e ao menos um membro');
      return;
    }
    setMassLoading(true);
    try {
      const result = await atribuirFuncaoMassa(massSelectedMembers, selectedSetorId, massFuncao);
      if (result.aviso) {
        toast.warning(`${result.atualizados} atualizado(s). ${result.aviso}`);
      } else {
        toast.success(`${result.atualizados} membro(s) atualizado(s)`);
      }
      setMassSelectedMembers([]);
      setMassFuncao('');
      loadMembers(selectedSetorId);
    } catch (err: any) {
      toast.error(err.message || 'Erro na atribuição em massa');
    } finally {
      setMassLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Building2 size={24} /> Setores
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button 
          className={`admin-btn ${showCreateForm ? 'admin-btn-ghost' : 'admin-btn-primary'}`}
          onClick={() => { setShowCreateForm(!showCreateForm); setShowLinkForm(false); }}
        >
          <Plus size={16} /> Criar Setor
        </button>
        <button 
          className={`admin-btn ${showLinkForm ? 'admin-btn-ghost' : 'admin-btn-primary'}`}
          onClick={() => { setShowLinkForm(!showLinkForm); setShowCreateForm(false); }}
        >
          <Link2 size={16} /> Vincular Membro
        </button>
      </div>

      {showCreateForm && (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <SectorCreateForm onCreated={() => { loadSetores(); setShowCreateForm(false); }} />
        </div>
      )}

      {showLinkForm && (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <SectorLinkForm setores={setores.filter((s) => s.ativo)} onLinked={() => { if (selectedSetorId) loadMembers(selectedSetorId); setShowLinkForm(false); }} />
        </div>
      )}

      {loading ? (
        <div className="sector-cards-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="sector-card">
              <div className="skeleton skeleton-cell" style={{ width: 120, height: 18 }} />
              <div className="skeleton skeleton-cell" style={{ width: 80, height: 12, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="sector-cards-grid">
          {setores.map((s) => (
            <SectorCard
              key={s.id}
              setor={s}
              isSelected={selectedSetorId === s.id}
              onEdit={(s) => { setEditTarget(s); setEditNome(s.nome); }}
              onToggleActive={(s) => s.ativo ? setDeactivateTarget(s) : handleToggleActive(s)}
              onViewMembers={loadMembers}
            />
          ))}
        </div>
      )}

      {selectedSetorId && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" style={{ maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              Membros — {setores.find((s) => s.id === selectedSetorId)?.nome}
              {membros.length > 0 && (
                <span style={{ fontSize: '0.85rem', fontWeight: 400, marginLeft: 8, color: 'var(--text-muted)' }}>
                  ({membros.filter((m) => m.ativo).length} ativos
                  {membros.filter((m) => !m.ativo).length > 0 && `, ${membros.filter((m) => !m.ativo).length} inativos`})
                </span>
              )}
            </h3>
            {loadingMembers ? (
              <div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton-row">
                    <div className="skeleton skeleton-cell" style={{ flex: 1 }} />
                    <div className="skeleton skeleton-cell" style={{ width: 80 }} />
                  </div>
                ))}
              </div>
            ) : (
              <SectorMembers
                members={membros}
                onDeactivate={(pid) => setDeactivateMemberTarget(pid)}
                selectionMode
                selectedIds={massSelectedMembers}
                onToggleSelect={(pid) => setMassSelectedMembers((prev) =>
                  prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
                )}
                onSelectAll={(checked) => setMassSelectedMembers(checked ? membros.filter((m) => m.ativo).map((m) => m.profile_id) : [])}
                funcoes={funcoesList.filter((f) => f.ativo)}
                selectedFuncao={massFuncao}
                onSelectFuncao={setMassFuncao}
                onApplyMass={handleMassAssign}
                massLoading={massLoading}
                showInactive={showInactiveMembers}
                onToggleInactive={() => setShowInactiveMembers((prev) => !prev)}
                onAlterarRole={handleAlterarRole}
              />
            )}
            <div className="modal-actions">
              <button className="admin-btn admin-btn-ghost" onClick={closeModal}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Editar Setor</h3>
            <div className="admin-form-group">
              <label>Nome</label>
              <input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="admin-btn admin-btn-ghost" onClick={() => setEditTarget(null)}>Cancelar</button>
              <button className="admin-btn admin-btn-primary" onClick={handleEditSave}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        title={deactivateTarget?.ativo ? 'Desativar Setor' : 'Reativar Setor'}
        message={deactivateTarget?.ativo ? `Desativar ${deactivateTarget?.nome}? Todos os vínculos serão removidos.` : `Reativar ${deactivateTarget?.nome}? Os vínculos anteriores foram removidos e precisarão ser recriados.`}
        confirmLabel={deactivateTarget?.ativo ? 'Desativar' : 'Reativar'}
        confirmClass={deactivateTarget?.ativo ? 'danger-button' : 'success-button'}
        onConfirm={() => deactivateTarget && handleToggleActive(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={!!deactivateMemberTarget}
        title="Remover Vínculo"
        message="Tem certeza que deseja remover este vínculo? O usuário perderá acesso ao setor."
        confirmLabel="Remover"
        confirmClass="danger-button"
        onConfirm={() => deactivateMemberTarget && handleDeactivateMember(deactivateMemberTarget)}
        onCancel={() => setDeactivateMemberTarget(null)}
      />

      <ConfirmDialog
        open={!!alterRoleTarget}
        title="Alterar Papel"
        message={
          alterRoleTarget?.role_atual === 'GESTOR' && alterRoleTarget?.novo_role === 'MEMBRO'
            ? `Alterar papel de ${alterRoleTarget.nome} de GESTOR para MEMBRO? ${
                membros.filter((m) => m.role_setor === 'GESTOR' && m.ativo).length <= 1
                  ? 'O setor ficará sem gestor ativo até que um novo gestor seja designado.'
                  : 'O setor poderá ficar sem gestor ativo.'
              }`
            : `Alterar papel de ${alterRoleTarget?.nome} de ${alterRoleTarget?.role_atual} para ${alterRoleTarget?.novo_role}?`
        }
        confirmLabel="Alterar"
        confirmClass="primary-button"
        onConfirm={confirmAlterarRole}
        onCancel={() => setAlterRoleTarget(null)}
      />
    </div>
  );
}
