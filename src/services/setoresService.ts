import { callEdgeFunction } from './adminService'
import type { BloqueioTrocaMes } from '../lib/types'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface SetorListItem {
  id: number
  nome: string
  ativo: boolean
  gestores: { nome_completo: string; matricula: string }[]
  total_membros: number
}

export interface MembroSetor {
  profile_id: string
  nome_completo: string
  matricula: string
  role_setor: 'MEMBRO' | 'GESTOR'
  funcao?: string
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
// Alterar role de membro no setor (ADMIN only)
// Troca entre MEMBRO e GESTOR sem recriar o vínculo.
// Erro NOT_FOUND se vínculo não existir ou estiver inativo.
// Erro INVALID_PAYLOAD se novo_role for igual ao atual.
// Um GESTOR pode ser alterado para MEMBRO mesmo que seja o único gestor do setor.
// ---------------------------------------------------------------------------

export async function alterarRoleSetor(
  profile_id: string,
  setor_id: number,
  novo_role_setor: 'MEMBRO' | 'GESTOR',
): Promise<{ profile_id: string; setor_id: number; role_setor: string; ativo: boolean }> {
  return callEdgeFunction('setores', { action: 'alterar_role_setor', profile_id, setor_id, novo_role_setor })
}

// ---------------------------------------------------------------------------
// Vincular membro ao setor (ADMIN only)
// ---------------------------------------------------------------------------

export async function vincularMembro(data: {
  profile_id: string
  setor_id: number
  role_setor: 'MEMBRO' | 'GESTOR'
  funcao?: string
}): Promise<{ profile_id: string; setor_id: number; role_setor: string; funcao?: string; ativo: boolean }> {
  return callEdgeFunction('setores', { action: 'vincular_membro', ...data })
}

// ---------------------------------------------------------------------------
// Remover vínculo de membro (ADMIN only) — hard delete
// Remove completamente o vínculo. Histórico de solicitações é preservado.
// ---------------------------------------------------------------------------

export async function desativarMembro(
  profile_id: string,
  setor_id: number,
): Promise<{ profile_id: string; setor_id: number; removido: boolean }> {
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
// Define ativo = false no setor + remove todos os vínculos
// Erro INVALID_STATUS se já estiver inativo
// ---------------------------------------------------------------------------

export async function desativarSetor(
  setor_id: number,
): Promise<{ setor_id: number; ativo: boolean }> {
  return callEdgeFunction('setores', { action: 'desativar_setor', setor_id })
}

// ---------------------------------------------------------------------------
// Reativar setor (ADMIN only)
// Reativa apenas o setor — vínculos foram removidos e devem ser recriados
// via vincular_membro. Erro INVALID_STATUS se já estiver ativo.
// ---------------------------------------------------------------------------

export async function reativarSetor(
  setor_id: number,
): Promise<{ setor_id: number; ativo: boolean }> {
  return callEdgeFunction('setores', { action: 'reativar_setor', setor_id })
}
