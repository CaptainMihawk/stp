import { callEdgeFunction } from './adminService'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface SetorListItem {
  id: number
  nome: string
  ativo: boolean
  gestor: { nome_completo: string; matricula: string } | null
  total_membros: number
}

export interface MembroSetor {
  profile_id: string
  nome_completo: string
  matricula: string
  role_setor: 'MEMBRO' | 'GESTOR'
  ativo: boolean
}

// ---------------------------------------------------------------------------
// Listar setores
// Respects role:
//   ADMIN → todos os setores
//   GESTOR/MEMBRO → apenas setores com vínculo ativo
// ---------------------------------------------------------------------------

export async function listarSetores(): Promise<SetorListItem[]> {
  return callEdgeFunction('setores', { action: 'listar_setores' })
}

// ---------------------------------------------------------------------------
// Listar membros de um setor (ADMIN + GESTOR do setor)
// ---------------------------------------------------------------------------

export async function listarMembrosSetor(setor_id: number): Promise<MembroSetor[]> {
  return callEdgeFunction('setores', { action: 'listar_membros_setor', setor_id })
}

/**
 * Colegas do setor para escolher cedente na troca.
 * Usa a edge function (bypass RLS) para funcionários sem acesso direto à tabela.
 */
export async function listarColegasSetor(
  setor_id: number,
): Promise<MembroSetor[]> {
  return callEdgeFunction('setores', {
    action: 'listar_membros_setor',
    setor_id,
  })
}

// ---------------------------------------------------------------------------
// Criar setor (ADMIN only)
// ---------------------------------------------------------------------------

export async function criarSetor(
  nome: string,
): Promise<{ id: number; nome: string; ativo: boolean }> {
  return callEdgeFunction('setores', { action: 'criar_setor', nome })
}

// ---------------------------------------------------------------------------
// Vincular membro ao setor (ADMIN only)
// Se role_setor = 'GESTOR' e já houver gestor ativo → erro SETOR_GESTOR_DUPLICADO
// Se o vínculo existir com ativo = false → reativa em vez de inserir
// ---------------------------------------------------------------------------

export async function vincularMembro(data: {
  profile_id: string
  setor_id: number
  role_setor: 'MEMBRO' | 'GESTOR'
}): Promise<{ profile_id: string; setor_id: number; role_setor: string; ativo: boolean }> {
  return callEdgeFunction('setores', { action: 'vincular_membro', ...data })
}

// ---------------------------------------------------------------------------
// Desativar membro (ADMIN only) — soft delete, preserva histórico
// ---------------------------------------------------------------------------

export async function desativarMembro(
  profile_id: string,
  setor_id: number,
): Promise<{ profile_id: string; setor_id: number; ativo: boolean }> {
  return callEdgeFunction('setores', { action: 'desativar_membro', profile_id, setor_id })
}
