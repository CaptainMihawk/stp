import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { listarSetores, desativarSetor, reativarSetor, editarSetor, desativarMembro, listarMembrosSetor } from '../../services/setoresService';
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
  const [massFuncao, setMassFuncao] = useState('');
  const [massSetorId, setMassSetorId] = useState<number | ''>('');
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

  async function handleMassAssign() {
    if (!massSetorId || !massFuncao || massSelectedMembers.length === 0) {
      toast.error('Selecione setor, função e ao menos um membro');
      return;
    }
    setMassLoading(true);
    try {
      const result = await atribuirFuncaoMassa(massSelectedMembers, Number(massSetorId), massFuncao);
      if (result.aviso) {
        toast.warning(`${result.atualizados} atualizado(s). ${result.aviso}`);
      } else {
        toast.success(`${result.atualizados} membro(s) atualizado(s)`);
      }
      setMassSelectedMembers([]);
      if (selectedSetorId) loadMembers(selectedSetorId);
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

      <div style={{ padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 24 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Atribuir Função em Massa</h3>
        <div className="admin-form-grid">
          <div className="admin-form-group">
            <label>Setor</label>
            <select value={massSetorId} onChange={(e) => { const id = e.target.value ? Number(e.target.value) : ''; setMassSetorId(id); setMassSelectedMembers([]); if (id) loadMembers(Number(id)); }}>
              <option value="">Selecione...</option>
              {setores.filter((s) => s.ativo).map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div className="admin-form-group">
            <label>Função</label>
            <select value={massFuncao} onChange={(e) => setMassFuncao(e.target.value)}>
              <option value="">Selecione...</option>
              {funcoesList.filter((f) => f.ativo).map((f) => (
                <option key={f.codigo} value={f.codigo}>{f.codigo} — {f.descricao}</option>
              ))}
            </select>
          </div>
          {massSetorId && (
            <div className="admin-form-group full-width">
              <label>Membros ativos do setor ({massSelectedMembers.length} selecionados)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {selectedSetorId === Number(massSetorId) ? (
                  membros.filter((m) => m.ativo).length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Nenhum membro ativo neste setor.
                    </span>
                  ) : (
                    membros.filter((m) => m.ativo).map((m) => (
                      <label key={m.profile_id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={massSelectedMembers.includes(m.profile_id)}
                          onChange={(e) => {
                            setMassSelectedMembers((prev) =>
                              e.target.checked ? [...prev, m.profile_id] : prev.filter((id) => id !== m.profile_id)
                            );
                          }}
                        />
                        {m.nome_completo}
                      </label>
                    ))
                  )
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Clique em "Ver membros" no card do setor primeiro.
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="admin-form-group full-width">
            <button
              className="admin-btn admin-btn-primary"
              disabled={massLoading || !massSetorId || !massFuncao || massSelectedMembers.length === 0}
              onClick={handleMassAssign}
            >
              {massLoading ? 'Atribuindo...' : `Atribuir a ${massSelectedMembers.length} membro(s)`}
            </button>
          </div>
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
