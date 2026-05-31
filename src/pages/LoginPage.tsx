import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, User } from 'lucide-react'

export function LoginPage() {
  const { signIn, loading } = useAuth()
  const [matricula, setMatricula] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const result = await signIn(matricula, password)
    if (result.error) setError('Matrícula ou senha inválidas.')
    setPending(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div className="brand-mark" style={{ margin: '0 auto 12px' }}>STP</div>
          <span className="eyebrow" style={{ background: 'var(--primary-soft)', color: 'var(--primary-strong)' }}>
            Acesso Restrito
          </span>
          <h1 style={{ fontSize: '1.6rem', marginTop: '6px' }}>Troca de Plantão</h1>
          <p style={{ fontSize: '0.825rem', color: 'var(--muted)', maxWidth: '320px', margin: '0 auto' }}>
            Faça login com sua matrícula institucional. A autenticação e segurança são gerenciadas via Supabase.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} style={{ color: 'var(--muted)' }} />
              Matrícula
            </div>
            <input
              required
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Digite sua matrícula (ex: 1001)"
            />
          </label>

          <label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={14} style={{ color: 'var(--muted)' }} />
              Senha
            </div>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button className="primary-button" style={{ marginTop: '10px' }} disabled={pending || loading}>
            {pending ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}