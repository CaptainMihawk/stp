import { useState, useEffect } from 'react';
import { listarSetores } from '../../services/setoresService';
import { listarFuncoes, createUser } from '../../services/adminService';
import { useToast } from '../Toast';
import type { SetorListItem, TipoFuncao } from '../../lib/types';

interface UserFormProps {
  onCreated: () => void;
}

export default function UserForm({ onCreated }: UserFormProps) {
  const toast = useToast();
  const [matricula, setMatricula] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'FUNCIONARIO' | 'ADMIN'>('FUNCIONARIO');
  const [setorId, setSetorId] = useState<number | ''>('');
  const [roleSetor, setRoleSetor] = useState<'MEMBRO' | 'GESTOR'>('MEMBRO');
  const [funcao, setFuncao] = useState('');
  const [setores, setSetores] = useState<SetorListItem[]>([]);
  const [funcoes, setFuncoes] = useState<TipoFuncao[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([listarSetores(), listarFuncoes()]).then(([s, f]) => {
      setSetores(s.filter((s) => s.ativo));
      setFuncoes(f.filter((f) => f.ativo));
    });
  }, []);

  function validate(): boolean {
    if (matricula.length < 4 || matricula.length > 12) {
      toast.error('Matrícula deve ter 4-12 caracteres');
      return false;
    }
    if (nomeCompleto.length < 10 || nomeCompleto.length > 64) {
      toast.error('Nome deve ter 10-64 caracteres');
      return false;
    }
    if (password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await createUser({
        matricula,
        nome_completo: nomeCompleto,
        password,
        role,
        setor_id: setorId !== '' ? Number(setorId) : undefined,
        role_setor: setorId !== '' ? roleSetor : undefined,
        funcao: setorId !== '' && funcao ? funcao : undefined,
      });
      toast.success('Usuário criado com sucesso');
      setMatricula('');
      setNomeCompleto('');
      setPassword('');
      setRole('FUNCIONARIO');
      setSetorId('');
      setRoleSetor('MEMBRO');
      setFuncao('');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form-grid">
      <div className="admin-form-group">
        <label>Matrícula</label>
        <input
          value={matricula}
          onChange={(e) => setMatricula(e.target.value.toUpperCase())}
          placeholder="MAT001"
          maxLength={12}
        />
      </div>
      <div className="admin-form-group">
        <label>Nome Completo</label>
        <input
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          placeholder="Nome completo"
          maxLength={64}
        />
      </div>
      <div className="admin-form-group">
        <label>Senha Inicial</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <div className="admin-form-group">
        <label>Perfil</label>
        <select value={role} onChange={(e) => setRole(e.target.value as 'FUNCIONARIO' | 'ADMIN')}>
          <option value="FUNCIONARIO">Funcionário</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>
      {role === 'FUNCIONARIO' && (
        <>
          <div className="admin-form-group">
            <label>Setor</label>
            <select value={setorId} onChange={(e) => setSetorId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Nenhum</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          {setorId !== '' && (
            <>
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
            </>
          )}
        </>
      )}
      <div className="admin-form-group full-width">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Usuário'}
        </button>
      </div>
    </form>
  );
}
