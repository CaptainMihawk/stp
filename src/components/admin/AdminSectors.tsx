import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { listarSetores, desativarSetor, reativarSetor, editarSetor, desativarMembro, listarMembrosSetor } from '../../services/setoresService';
import type { MembroSetor, SetorListItem } from '../../services/setoresService';
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

  async function loadMembers(setorId: number) {
    setSelectedSetorId(setorId);
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
      toast.success('Vínculo desativado');
      loadMembers(selectedSetorId);
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
    setDeactivateMemberTarget(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Building2 size={24} /> Setores
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Criar Setor</h3>
          <SectorCreateForm onCreated={loadSetores} />
        </div>
        <div style={{ padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Vincular Membro</h3>
          <SectorLinkForm setores={setores.filter((s) => s.ativo)} onLinked={() => { if (selectedSetorId) loadMembers(selectedSetorId); }} />
        </div>
      </div>

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
        <div className="modal-overlay" onClick={() => setSelectedSetorId(null)}>
          <div className="modal-content" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              Membros — {setores.find((s) => s.id === selectedSetorId)?.nome}
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
              <SectorMembers members={membros} onDeactivate={(pid) => setDeactivateMemberTarget(pid)} />
            )}
            <div className="modal-actions">
              <button className="admin-btn admin-btn-ghost" onClick={() => setSelectedSetorId(null)}>Fechar</button>
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
        message={deactivateTarget?.ativo ? `Desativar ${deactivateTarget?.nome}? Todos os vínculos serão desativados.` : `Reativar ${deactivateTarget?.nome}?`}
        confirmLabel={deactivateTarget?.ativo ? 'Desativar' : 'Reativar'}
        confirmClass={deactivateTarget?.ativo ? 'danger-button' : 'success-button'}
        onConfirm={() => deactivateTarget && handleToggleActive(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={!!deactivateMemberTarget}
        title="Desativar Vínculo"
        message="Tem certeza que deseja desativar este vínculo?"
        confirmLabel="Desativar"
        confirmClass="danger-button"
        onConfirm={() => deactivateMemberTarget && handleDeactivateMember(deactivateMemberTarget)}
        onCancel={() => setDeactivateMemberTarget(null)}
      />
    </div>
  );
}
