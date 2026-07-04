import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { listarConfiguracoes } from '../../services/adminService';
import type { Configuracao } from '../../services/adminService';
import { useToast } from '../Toast';
import ConfigCard from './ConfigCard';

export default function AdminSettings() {
  const toast = useToast();
  const [configs, setConfigs] = useState<Configuracao[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadConfigs() {
    setLoading(true);
    try {
      const data = await listarConfiguracoes();
      setConfigs(data);
    } catch {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadConfigs(); }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Settings size={24} /> Configurações
        </h1>
      </div>

      {loading ? (
        <div>
          {[1, 2].map((i) => (
            <div key={i} className="config-card">
              <div className="skeleton skeleton-cell" style={{ width: 200, height: 16 }} />
              <div className="skeleton skeleton-cell" style={{ width: 300, height: 12, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : configs.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Nenhuma configuração encontrada.</p>
      ) : (
        configs.map((c) => (
          <ConfigCard key={c.chave} config={c} onSaved={loadConfigs} />
        ))
      )}
    </div>
  );
}
