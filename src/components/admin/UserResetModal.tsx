import { useState } from 'react';
import { resetarSenha } from '../../services/adminService';
import { useToast } from '../Toast';

interface UserResetModalProps {
  profileId: string;
  userName: string;
  onClose: () => void;
}

export default function UserResetModal({ profileId, userName, onClose }: UserResetModalProps) {
  const toast = useToast();
  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await resetarSenha({ profile_id: profileId, nova_senha: novaSenha });
      toast.success(`Senha de ${userName} resetada com sucesso`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao resetar senha');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Resetar Senha — {userName}</h3>
        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label>Nova Senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
              {loading ? 'Resetando...' : 'Resetar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
