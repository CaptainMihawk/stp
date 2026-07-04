import { useState } from 'react';
import { criarFuncao } from '../../services/adminService';
import { useToast } from '../Toast';

interface FunctionFormProps {
  onCreated: () => void;
}

export default function FunctionForm({ onCreated }: FunctionFormProps) {
  const toast = useToast();
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim() || !descricao.trim()) {
      toast.error('Código e descrição são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await criarFuncao({ codigo: codigo.trim(), descricao: descricao.trim() });
      toast.success('Função criada com sucesso');
      setCodigo('');
      setDescricao('');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar função');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form-grid">
      <div className="admin-form-group">
        <label>Código</label>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Ex: ENFA"
          maxLength={10}
        />
      </div>
      <div className="admin-form-group">
        <label>Descrição</label>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Enfermeiro(a)"
          maxLength={64}
        />
      </div>
      <div className="admin-form-group full-width">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Função'}
        </button>
      </div>
    </form>
  );
}
