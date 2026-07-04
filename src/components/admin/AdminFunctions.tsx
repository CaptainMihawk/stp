import { useEffect, useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { listarFuncoes, desativarFuncao } from '../../services/adminService';
import type { TipoFuncao } from '../../services/adminService';
import { useToast } from '../Toast';
import { ConfirmDialog } from '../ConfirmDialog';
import FunctionForm from './FunctionForm';
import FunctionTable from './FunctionTable';

export default function AdminFunctions() {
  const toast = useToast();
  const [funcoes, setFuncoes] = useState<TipoFuncao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);

  async function loadFuncoes() {
    setLoading(true);
    try {
      const data = await listarFuncoes();
      setFuncoes(data);
    } catch {
      toast.error('Erro ao carregar funções');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFuncoes(); }, []);

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    try {
      const result = await desativarFuncao(deactivateTarget);
      if (result.aviso) {
        toast.warning(result.aviso);
      } else {
        toast.success('Função desativada');
      }
      loadFuncoes();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao desativar');
    }
    setDeactivateTarget(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Briefcase size={24} /> Funções Profissionais
        </h1>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Nova Função
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <FunctionForm onCreated={() => { loadFuncoes(); setShowForm(false); }} />
        </div>
      )}

      {loading ? (
        <div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton skeleton-cell" style={{ width: 60 }} />
              <div className="skeleton skeleton-cell" style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      ) : (
        <FunctionTable funcoes={funcoes} onDeactivate={(codigo) => setDeactivateTarget(codigo)} />
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Desativar Função"
        message={`Desativar a função ${deactivateTarget}?`}
        confirmLabel="Desativar"
        confirmClass="danger-button"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
