function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface HistoryEntry {
  id: number;
  status_anterior: string | null;
  status_novo: string;
  alterado_em: string;
  solicitacao: { id: number; setor: { nome: string } };
  alterado_por_profile: { nome_completo: string; matricula: string };
}

interface HistoryTableProps {
  entries: HistoryEntry[];
}

const statusColors: Record<string, string> = {
  aguardando_cedente: '#f59e0b',
  pendente: '#3b82f6',
  aprovado: '#22c55e',
  recusado_cedente: '#ef4444',
  recusado_gestor: '#ef4444',
  cancelado: '#6b7280',
  pedido_revogacao: '#a855f7',
  revogado: '#6b7280',
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="badge badge-inactive">—</span>;
  const color = statusColors[status] || '#6b7280';
  return (
    <span
      className="badge"
      style={{ background: `${color}15`, color }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function HistoryTable({ entries }: HistoryTableProps) {
  if (entries.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Nenhum registro encontrado.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Data/Hora</th>
          <th>Solicitação</th>
          <th>Setor</th>
          <th>De → Para</th>
          <th>Responsável</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <td className="td-date" data-label="Data">{formatDateTime(e.alterado_em)}</td>
            <td data-label="Solicitação">#{e.solicitacao.id}</td>
            <td data-label="Setor">{e.solicitacao.setor.nome}</td>
            <td data-label="De → Para">
              <StatusBadge status={e.status_anterior} /> → <StatusBadge status={e.status_novo} />
            </td>
            <td data-label="Responsável">
              {e.alterado_por_profile.nome_completo}
              <br />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.alterado_por_profile.matricula}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
