import { useState } from 'react';
import { editarUsuario } from '../../services/adminService';
import { useToast } from '../Toast';
import type { AdminUsuario } from '../../services/adminService';

interface UserEditModalProps {
  user: AdminUsuario;
  onClose: () => void;
  onSaved: () => void;
}

export default function UserEditModal({ user, onClose, onSaved }: UserEditModalProps) {
  const toast = useToast();
  const [nome, setNome] = useState(user.nome_completo);
  const [matricula, setMatricula] = useState(user.matricula);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nome.length < 10 || nome.length > 64) {
      toast.error('Nome deve ter 10-64 caracteres');
      return;
    }
    if (matricula.length < 4 || matricula.length > 12) {
      toast.error('Matrícula deve ter 4-12 caracteres');
      return;
    }

    setLoading(true);
    try {
      await editarUsuario({ profile_id: user.id, nome_completo: nome, matricula });
      toast.success('Usuário atualizado');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao editar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Editar Usuário</h3>
        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label>Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={64} />
            </div>
            <div className="admin-form-group">
              <label>Matrícula</label>
              <input
                value={matricula}
                onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                maxLength={12}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
