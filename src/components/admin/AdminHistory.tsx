import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { listarHistoricoAdmin } from '../../services/adminService';
import { useToast } from '../Toast';
import HistoryTable from './HistoryTable';

interface AdminHistoricoEntry {
  id: number;
  status_anterior: string | null;
  status_novo: string;
  alterado_em: string;
  solicitacao: { id: number; setor: { nome: string } };
  alterado_por_profile: { nome_completo: string; matricula: string };
}

export default function AdminHistory() {
  const toast = useToast();
  const [entries, setEntries] = useState<AdminHistoricoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;

  async function loadHistory(p: number) {
    setLoading(true);
    try {
      const data = await listarHistoricoAdmin(p, perPage);
      setEntries(data.data);
      setTotalPages(data.pagination.total_pages);
      setTotal(data.pagination.total);
      setPage(p);
    } catch {
      toast.error('Erro ao carregar histórico');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(1); }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <ScrollText size={24} /> Auditoria de Solicitações
        </h1>
      </div>

      {loading ? (
        <div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton skeleton-cell" style={{ width: 100 }} />
              <div className="skeleton skeleton-cell" style={{ width: 40 }} />
              <div className="skeleton skeleton-cell" style={{ width: 60 }} />
              <div className="skeleton skeleton-cell" style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <HistoryTable entries={entries} />
          {totalPages > 1 && (
            <div className="admin-pagination">
              <span>Página {page} de {totalPages} ({total} registros)</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="admin-btn admin-btn-ghost"
                  onClick={() => loadHistory(page - 1)}
                  disabled={page <= 1}
                >
                  Anterior
                </button>
                <button
                  className="admin-btn admin-btn-ghost"
                  onClick={() => loadHistory(page + 1)}
                  disabled={page >= totalPages}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
