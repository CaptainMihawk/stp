import { useState, useEffect } from 'react';
import { vincularMembro } from '../../services/setoresService';
import { listarUsuarios, listarFuncoes } from '../../services/adminService';
import { useToast } from '../Toast';
import type { AdminUsuario } from '../../services/adminService';
import type { TipoFuncao } from '../../services/adminService';

interface SectorLinkFormProps {
  setores: { id: number; nome: string }[];
  onLinked: () => void;
}

export default function SectorLinkForm({ setores, onLinked }: SectorLinkFormProps) {
  const toast = useToast();
  const [setorId, setSetorId] = useState<number | ''>('');
  const [profileId, setProfileId] = useState('');
  const [roleSetor, setRoleSetor] = useState<'MEMBRO' | 'GESTOR'>('MEMBRO');
  const [funcao, setFuncao] = useState('');
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [funcoes, setFuncoes] = useState<TipoFuncao[]>([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    Promise.all([listarUsuarios(), listarFuncoes()]).then(([res, f]) => {
      setUsuarios(res.data.filter((u) => u.ativo));
      setFuncoes(f.filter((f) => f.ativo));
    });
  }, []);

  const filteredUsers = usuarios.filter((u) => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return u.nome_completo.toLowerCase().includes(term) || u.matricula.toLowerCase().includes(term);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!setorId || !profileId) {
      toast.error('Selecione setor e usuário');
      return;
    }

    setLoading(true);
    try {
      await vincularMembro({
        profile_id: profileId,
        setor_id: Number(setorId),
        role_setor: roleSetor,
        funcao: funcao || undefined,
      });
      toast.success('Membro vinculado com sucesso');
      setProfileId('');
      setUserSearch('');
      onLinked();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao vincular');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form-grid">
      <div className="admin-form-group">
        <label>Setor</label>
        <select value={setorId} onChange={(e) => setSetorId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Selecione...</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </div>
      <div className="admin-form-group">
        <label>Usuário</label>
        <input
          placeholder="Buscar por nome ou matrícula..."
          value={userSearch}
          onChange={(e) => { setUserSearch(e.target.value); setProfileId(''); }}
        />
        {userSearch && !profileId && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 150, overflow: 'auto', marginTop: 4 }}>
            {filteredUsers.slice(0, 10).map((u) => (
              <div
                key={u.id}
                style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
                onClick={() => { setProfileId(u.id); setUserSearch(`${u.matricula} — ${u.nome_completo}`); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                {u.matricula} — {u.nome_completo}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="admin-form-group">
        <label>Papel no Setor</label>
        <select value={roleSetor} onChange={(e) => setRoleSetor(e.target.value as 'MEMBRO' | 'GESTOR')}>
          <option value="MEMBRO">Membro</option>
          <option value="GESTOR">Gestor</option>
        </select>
      </div>
      <div className="admin-form-group">
        <label>Função</label>
        <select value={funcao} onChange={(e) => setFuncao(e.target.value)}>
          <option value="">Nenhuma</option>
          {funcoes.map((f) => (
            <option key={f.codigo} value={f.codigo}>{f.codigo} — {f.descricao}</option>
          ))}
        </select>
      </div>
      <div className="admin-form-group full-width">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? 'Vinculando...' : 'Vincular Membro'}
        </button>
      </div>
    </form>
  );
}
