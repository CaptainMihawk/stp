import { useState } from 'react';
import { atualizarConfiguracao } from '../../services/adminService';
import { useToast } from '../Toast';
import type { Configuracao } from '../../services/adminService';

interface ConfigCardProps {
  config: Configuracao;
  onSaved: () => void;
}

export default function ConfigCard({ config, onSaved }: ConfigCardProps) {
  const toast = useToast();
  const [value, setValue] = useState(config.valor);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function handleSave() {
    if (value === config.valor) return;

    setLoading(true);
    try {
      await atualizarConfiguracao(config.chave, value);
      toast.success(`${config.chave} atualizada`);
      setDirty(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="config-card">
      <div className="config-card-title">{config.chave}</div>
      {config.descricao && <div className="config-card-desc">{config.descricao}</div>}
      <div className="config-card-edit">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setDirty(true); }}
        />
        <button
          className={`admin-btn ${dirty ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
          onClick={handleSave}
          disabled={loading || !dirty}
        >
          {loading ? '...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
