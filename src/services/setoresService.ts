import { callEdgeFunction } from './adminService'
import type { BloqueioTrocaMes } from '../lib/types'

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
  bloqueado_mes?: boolean
  bloqueio?: BloqueioTrocaMes | null
}

// ---------------------------------------------------------------------------
// Listar setores
// Respects role:
//   ADMIN → todos os setores
//   GESTOR/MEMBRO → apenas setores com vínculo ativo
// ---------------------------------------------------------------------------

export async function listarSetores(): Promise<SetorListItem[]> {
  return callEdgeFunction('setores', { action: 'listar_setores' }, { readOnly: true })
}

// ---------------------------------------------------------------------------
// Listar membros de um setor (ADMIN + GESTOR do setor)
// ---------------------------------------------------------------------------

export async function listarMembrosSetor(setor_id: number): Promise<MembroSetor[]> {
  return callEdgeFunction('setores', { action: 'listar_membros_setor', setor_id }, { readOnly: true })
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
  }, { readOnly: true })
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

// ---------------------------------------------------------------------------
// Editar setor (ADMIN only)
// Nome deve ser único — erro CONFLICT se já em uso
// ---------------------------------------------------------------------------

export async function editarSetor(
  setor_id: number,
  nome: string,
): Promise<{ id: number; nome: string; ativo: boolean }> {
  return callEdgeFunction('setores', { action: 'editar_setor', setor_id, nome })
}

// ---------------------------------------------------------------------------
// Desativar setor (ADMIN only)
// Define ativo = false no setor + desativa todos os vínculos automaticamente
// Erro INVALID_STATUS se já estiver inativo
// ---------------------------------------------------------------------------

export async function desativarSetor(
  setor_id: number,
): Promise<{ setor_id: number; ativo: boolean }> {
  return callEdgeFunction('setores', { action: 'desativar_setor', setor_id })
}

// ---------------------------------------------------------------------------
// Reativar setor (ADMIN only)
// Reativa apenas o setor — vínculos devem ser reativados separadamente
// Erro INVALID_STATUS se já estiver ativo
// ---------------------------------------------------------------------------

export async function reativarSetor(
  setor_id: number,
): Promise<{ setor_id: number; ativo: boolean }> {
  return callEdgeFunction('setores', { action: 'reativar_setor', setor_id })
}
