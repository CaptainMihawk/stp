import type { MembroSetor } from '../../services/setoresService';
import type { TipoFuncao } from '../../services/adminService';

interface SectorMembersProps {
  members: MembroSetor[];
  onDeactivate: (profileId: string) => void;
  /** Modo de seleção em massa */
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (profileId: string) => void;
  onSelectAll?: (checked: boolean) => void;
  funcoes?: TipoFuncao[];
  selectedFuncao?: string;
  onSelectFuncao?: (codigo: string) => void;
  onApplyMass?: () => void;
  massLoading?: boolean;
}

export default function SectorMembers({
  members,
  onDeactivate,
  selectionMode,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  funcoes = [],
  selectedFuncao = '',
  onSelectFuncao,
  onApplyMass,
  massLoading,
}: SectorMembersProps) {
  const activeMembers = selectionMode ? members.filter((m) => m.ativo) : members;

  if (members.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Nenhum membro neste setor.</p>;
  }

  return (
    <div>
      {selectionMode && activeMembers.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={activeMembers.length > 0 && selectedIds.length === activeMembers.length}
              onChange={(e) => onSelectAll?.(e.target.checked)}
            />
            Selecionar todos ({activeMembers.length})
          </label>
          <select
            value={selectedFuncao}
            onChange={(e) => onSelectFuncao?.(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--input-bg, var(--panel-bg))', color: 'var(--text)' }}
          >
            <option value="">Função...</option>
            {funcoes.map((f) => (
              <option key={f.codigo} value={f.codigo}>{f.codigo} — {f.descricao}</option>
            ))}
          </select>
          <button
            className="admin-btn admin-btn-primary"
            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
            disabled={massLoading || selectedIds.length === 0 || !selectedFuncao}
            onClick={onApplyMass}
          >
            {massLoading ? 'Aplicando...' : `Aplicar a ${selectedIds.length}`}
          </button>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            {selectionMode && <th style={{ width: 40 }}></th>}
            <th>Nome</th>
            <th>Matrícula</th>
            <th>Papel</th>
            <th>Função</th>
            <th>Status</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {activeMembers.map((m) => (
            <tr key={m.profile_id} className={m.ativo ? '' : 'inativo'}>
              {selectionMode && (
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.profile_id)}
                    onChange={() => onToggleSelect?.(m.profile_id)}
                    disabled={!m.ativo}
                  />
                </td>
              )}
              <td className="td-nome" data-label="Nome">{m.nome_completo}</td>
              <td className="td-matricula" data-label="Matrícula">{m.matricula}</td>
              <td data-label="Papel">
                <span className={`badge ${m.role_setor === 'GESTOR' ? 'badge-gestor' : 'badge-membro'}`}>
                  {m.role_setor}
                </span>
              </td>
              <td data-label="Função">{m.funcao || '—'}</td>
              <td data-label="Status">
                <span className={`badge ${m.ativo ? 'badge-active' : 'badge-inactive'}`}>
                  {m.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td data-label="Ação">
                {m.ativo && (
                  <button
                    className="admin-btn admin-btn-danger"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={() => onDeactivate(m.profile_id)}
                  >
                    Desativar vínculo
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
