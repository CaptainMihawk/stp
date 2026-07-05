import { useState, useEffect } from 'react';
import { editarUsuario, listarFuncoes } from '../../services/adminService';
import { listarSetores, listarMembrosSetor } from '../../services/setoresService';
import { useToast } from '../Toast';
import type { AdminUsuario, TipoFuncao } from '../../services/adminService';
import type { SetorListItem } from '../../services/setoresService';

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

  const [setores, setSetores] = useState<SetorListItem[]>([]);
  const [funcoes, setFuncoes] = useState<TipoFuncao[]>([]);
  const [selectedSetorId, setSelectedSetorId] = useState<number | ''>('');
  const [funcao, setFuncao] = useState('');
  const [currentFuncao, setCurrentFuncao] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listarSetores(), listarFuncoes()]).then(([s, f]) => {
      setSetores(s.filter((s) => s.ativo));
      setFuncoes(f.filter((f) => f.ativo));
    });
  }, []);

  useEffect(() => {
    if (!selectedSetorId) {
      setCurrentFuncao(null);
      setFuncao('');
      return;
    }
    listarMembrosSetor(Number(selectedSetorId)).then((membros) => {
      const membro = membros.find((m) => m.profile_id === user.id);
      if (membro) {
        setCurrentFuncao(membro.funcao || null);
        setFuncao(membro.funcao || '');
      } else {
        setCurrentFuncao(null);
        setFuncao('');
      }
    }).catch(() => {
      setCurrentFuncao(null);
      setFuncao('');
    });
  }, [selectedSetorId, user.id]);

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
      const payload: Record<string, unknown> = { profile_id: user.id, nome_completo: nome, matricula };
      if (selectedSetorId && funcao) {
        payload.setor_id = Number(selectedSetorId);
        payload.funcao = funcao;
      }
      await editarUsuario(payload as any);
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
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Alterar função (opcional)</p>
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>Setor</label>
                <select value={selectedSetorId} onChange={(e) => setSelectedSetorId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Não alterar</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Função {currentFuncao !== null && `(atual: ${currentFuncao})`}</label>
                <select value={funcao} onChange={(e) => setFuncao(e.target.value)} disabled={!selectedSetorId}>
                  <option value="">Nenhuma</option>
                  {funcoes.map((f) => (
                    <option key={f.codigo} value={f.codigo}>{f.codigo} — {f.descricao}</option>
                  ))}
                </select>
              </div>
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
