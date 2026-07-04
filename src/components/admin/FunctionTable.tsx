import { Trash2 } from 'lucide-react';
import type { TipoFuncao } from '../../services/adminService';

interface FunctionTableProps {
  funcoes: TipoFuncao[];
  onDeactivate: (codigo: string) => void;
}

export default function FunctionTable({ funcoes, onDeactivate }: FunctionTableProps) {
  if (funcoes.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Nenhuma função cadastrada.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Descrição</th>
          <th>Status</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        {funcoes.map((f) => (
          <tr key={f.codigo} className={f.ativo ? '' : 'inativo'}>
            <td className="td-matricula" data-label="Código">{f.codigo}</td>
            <td className="td-nome" data-label="Descrição">{f.descricao}</td>
            <td data-label="Status">
              <span className={`badge ${f.ativo ? 'badge-active' : 'badge-inactive'}`}>
                {f.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </td>
            <td data-label="Ação">
              {f.ativo && (
                <button className="admin-btn-icon" title="Desativar" onClick={() => onDeactivate(f.codigo)}>
                  <Trash2 size={15} />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
