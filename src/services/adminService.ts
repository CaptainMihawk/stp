import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`

/**
 * Helper compartilhado para chamar Supabase Edge Functions.
 * Injeta JWT do usuário autenticado e passa a apikey via query parameter 
 * para contornar restrições de cabeçalhos do CORS no gateway do Supabase.
 */
export async function callEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  options?: { readOnly?: boolean },
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  const url = `${FUNCTIONS_URL}/${name}?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}`

  // Retry apenas para operações de leitura (evita executar escrita 2x)
  const maxAttempts = options?.readOnly ? 2 : 1

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 8_000)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      window.clearTimeout(timeoutId)
      const json: unknown = await res.json()

      if (!res.ok) {
        const err = json as { error?: string; code?: string }
        if (res.status >= 500 && attempt < maxAttempts - 1) {
          console.warn(`[${name}] Erro ${res.status}, tentando novamente...`)
          continue
        }
        throw new Error(err.error ?? `Erro ao chamar ${name}`)
      }

      return json as T
    } catch (err) {
      window.clearTimeout(timeoutId)
      if (err instanceof DOMException && err.name === 'AbortError' && attempt < maxAttempts - 1) {
        console.warn(`[${name}] Timeout, tentando novamente...`)
        continue
      }
      throw err
    }
  }

  throw new Error(`Falha ao chamar ${name} após ${maxAttempts} tentativas.`)
}

// ---------------------------------------------------------------------------
// Criar usuário (ADMIN only) — chama /functions/v1/create-user
// ---------------------------------------------------------------------------

export interface CreateUserPayload {
  matricula: string
  nome_completo: string
  password: string
  role: 'ADMIN' | 'FUNCIONARIO' | 'GESTOR'
  /** Opcional: vincula ao setor imediatamente. Deve vir com role_setor. */
  setor_id?: number
  /** Opcional: obrigatório se setor_id for enviado. */
  role_setor?: 'MEMBRO' | 'GESTOR'
}

export interface CreateUserResponse {
  success: boolean
  user_id: string
  email: string
  setor: { setor_id: number; role_setor: string } | null
}

export async function createUser(data: CreateUserPayload): Promise<CreateUserResponse> {
  return callEdgeFunction<CreateUserResponse>('create-user', data as unknown as Record<string, unknown>)
}

// ---------------------------------------------------------------------------
// Admin — /functions/v1/admin
// ---------------------------------------------------------------------------

export interface AdminUsuario {
  id: string
  nome_completo: string
  matricula: string
  role: 'ADMIN' | 'FUNCIONARIO' | 'GESTOR'
  ativo: boolean
  email: string
  ultimo_login: string | null
  criado_em: string
}

export async function listarUsuarios(): Promise<AdminUsuario[]> {
  return callEdgeFunction('admin', { action: 'listar_usuarios' }, { readOnly: true })
}

export interface ResetarSenhaPayload {
  profile_id: string
  nova_senha: string
}

export async function resetarSenha(
  data: ResetarSenhaPayload,
): Promise<{ success: boolean }> {
  return callEdgeFunction('admin', {
    action: 'resetar_senha',
    ...data,
  })
}

export async function ativarUsuario(
  profile_id: string,
): Promise<{ profile_id: string; ativo: boolean }> {
  return callEdgeFunction('admin', {
    action: 'ativar_usuario',
    profile_id,
  })
}

export async function desativarUsuario(
  profile_id: string,
): Promise<{ profile_id: string; ativo: boolean }> {
  return callEdgeFunction('admin', {
    action: 'desativar_usuario',
    profile_id,
  })
}

// ---------------------------------------------------------------------------
// Editar usuário (ADMIN only)
// ---------------------------------------------------------------------------

export interface EditarUsuarioPayload {
  profile_id: string
  nome_completo?: string
  matricula?: string
}

export interface EditarUsuarioResponse {
  id: string
  matricula: string
  nome_completo: string
  role: string
  ativo: boolean
}

export async function editarUsuario(
  data: EditarUsuarioPayload,
): Promise<EditarUsuarioResponse> {
  return callEdgeFunction('admin', {
    action: 'editar_usuario',
    ...data,
  })
}

export interface Configuracao {
  chave: string
  valor: string
  descricao: string
  atualizado_em: string
}

export async function listarConfiguracoes(): Promise<Configuracao[]> {
  return callEdgeFunction('admin', { action: 'listar_configuracoes' }, { readOnly: true })
}

export async function atualizarConfiguracao(
  chave: string,
  valor: string,
): Promise<{ chave: string; valor: string; atualizado_em: string }> {
  return callEdgeFunction('admin', {
    action: 'atualizar_configuracao',
    chave,
    valor,
  })
}

// ---------------------------------------------------------------------------
// Histórico de Solicitações (Admin)
// ---------------------------------------------------------------------------

export interface AdminHistoricoItem {
  id: number
  status_anterior: string | null
  status_novo: string
  alterado_em: string
  alterado_por_profile: { nome_completo: string; matricula: string }
  solicitacao: { id: number; setor: { nome: string } }
}

export interface AdminHistoricoResponse {
  data: AdminHistoricoItem[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export async function listarHistoricoAdmin(
  page = 1,
  per_page = 50,
): Promise<AdminHistoricoResponse> {
  return callEdgeFunction('admin', {
    action: 'listar_historico_admin',
    page,
    per_page,
  }, { readOnly: true })
}