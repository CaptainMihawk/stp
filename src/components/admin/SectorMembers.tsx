import type { MembroSetor } from '../../services/setoresService';

interface SectorMembersProps {
  members: MembroSetor[];
  onDeactivate: (profileId: string) => void;
}

export default function SectorMembers({ members, onDeactivate }: SectorMembersProps) {
  if (members.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Nenhum membro neste setor.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Matrícula</th>
          <th>Papel</th>
          <th>Função</th>
          <th>Status</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.profile_id} className={m.ativo ? '' : 'inativo'}>
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
  );
}
