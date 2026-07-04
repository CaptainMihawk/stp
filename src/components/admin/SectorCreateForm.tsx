import { useState } from 'react';
import { criarSetor } from '../../services/setoresService';
import { useToast } from '../Toast';

interface SectorCreateFormProps {
  onCreated: () => void;
}

export default function SectorCreateForm({ onCreated }: SectorCreateFormProps) {
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Nome do setor é obrigatório');
      return;
    }

    setLoading(true);
    try {
      await criarSetor(nome.trim());
      toast.success('Setor criado com sucesso');
      setNome('');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar setor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <div className="admin-form-group" style={{ flex: 1 }}>
        <label>Nome do Setor</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: UTI" maxLength={64} />
      </div>
      <button type="submit" className="admin-btn admin-btn-primary" disabled={loading} style={{ height: 36 }}>
        {loading ? 'Criando...' : 'Criar'}
      </button>
    </form>
  );
}
