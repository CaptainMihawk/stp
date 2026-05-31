import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { KeyRound, ShieldAlert } from 'lucide-react'

export function PasswordPanel({ adminMode = false }: { adminMode?: boolean }) {
  const { updatePassword } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword.length < 6) {
      setStatus({ text: 'A senha deve conter no mínimo 6 caracteres.', error: true })
      return
    }

    setPending(true)
    setStatus(null)
    const result = await updatePassword(newPassword)
    setPending(false)
    
    if (result.error) {
      setStatus({ text: result.error, error: true })
    } else {
      setStatus({ text: 'Senha atualizada com sucesso!', error: false })
      setNewPassword('')
    }
  }

  return (
    <section className="panel" style={{ height: 'fit-content' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <KeyRound size={20} style={{ color: 'var(--primary)' }} />
        {adminMode ? 'Alterar Minha Senha' : 'Segurança da Conta'}
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '4px 0 16px' }}>
        {adminMode
          ? 'Este painel atualiza a credencial de segurança do usuário atual conectado.'
          : 'Atualize sua credencial de acesso direto. A nova senha será válida no seu próximo login.'}
      </p>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Nova Senha
          <input
            required
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </label>

        {newPassword && newPassword.length < 6 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--danger-strong)' }}>
            <ShieldAlert size={14} />
            Mínimo 6 caracteres obrigatório
          </div>
        )}

        {status && (
          <div className={status.error ? 'error-box' : 'info-box'}>
            {status.text}
          </div>
        )}

        <button className="primary-button" disabled={pending || newPassword.length < 6}>
          {pending ? 'Salvando...' : 'Atualizar Senha'}
        </button>
      </form>
    </section>
  )
}