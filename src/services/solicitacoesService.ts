import type { Profile, StatusSolicitacao, Turno, VinculoSetor } from '../lib/types'
import { callEdgeFunction } from './adminService'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface DadosUsuario {
  profile: Profile
  vinculos: (VinculoSetor & { setor: { id: number; nome: string } })[]
}

export async function listarMeusDados(): Promise<DadosUsuario> {
  return callEdgeFunction('solicitacoes', { action: 'listar_meus_dados' })
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface Participante {
  id?: string
  profile_id?: string
  nome_completo: string
  matricula: string
}

function mapParticipante(
  row: { id: string; nome_completo: string; matricula: string } | null,
): Participante {
  if (!row) {
    return { nome_completo: '—', matricula: '—' }
  }
  return {
    id: row.id,
    profile_id: row.id,
    nome_completo: row.nome_completo,
    matricula: row.matricula,
  }
}

/**
 * Formato rico retornado pela Edge Function — já inclui nomes dos participantes.
 */
export interface SetorInfo {
  id: number
  nome: string
}

export interface SolicitacaoListItem {
  id: number
  status: StatusSolicitacao
  requisitante: Participante
  cedente: Participante
  gestor_responsavel?: Participante
  setor: SetorInfo | null
  setor_id: number | null
  data_requisitante: string
  turno_requisitante: Turno
  data_cedente: string
  turno_cedente: Turno
  observacao: string | null
  justificativa_revogacao: string | null
  replica_gestor: string | null
  aprovacao: boolean | null
  criado_em: string
  respondido_em: string | null
}

// ---------------------------------------------------------------------------
// Criar solicitação
// ---------------------------------------------------------------------------

export interface CriarSolicitacaoPayload {
  cedente_id: string
  setor_id: number
  data_requisitante: string
  turno_requisitante: Turno
  data_cedente: string
  turno_cedente: Turno
  observacao?: string
}

export async function criarSolicitacao(
  data: CriarSolicitacaoPayload,
): Promise<{ id: number; status: StatusSolicitacao }> {
  return callEdgeFunction('solicitacoes', {
    action: 'criar_solicitacao',
    ...data,
  })
}

// ---------------------------------------------------------------------------
// Cedente responde
// ---------------------------------------------------------------------------

export async function cedenteResponder(
  solicitacao_id: number,
  aceitar: boolean,
): Promise<{ status: StatusSolicitacao }> {
  return callEdgeFunction('solicitacoes', {
    action: 'cedente_responder',
    solicitacao_id,
    aceitar,
  })
}

// ---------------------------------------------------------------------------
// Gestor responde
// ---------------------------------------------------------------------------

export async function gestorResponder(
  solicitacao_id: number,
  aprovar: boolean,
  replica_gestor?: string,
): Promise<{ status: StatusSolicitacao }> {
  return callEdgeFunction('solicitacoes', {
    action: 'gestor_responder',
    solicitacao_id,
    aprovar,
    ...(replica_gestor ? { replica_gestor } : {}),
  })
}

export async function cancelarSolicitacao(
  solicitacao_id: number,
): Promise<{ status: StatusSolicitacao }> {
  return callEdgeFunction('solicitacoes', {
    action: 'cancelar_solicitacao',
    solicitacao_id,
  })
}

export async function solicitarRevogacao(
  solicitacao_id: number,
  justificativa: string,
): Promise<{ status: StatusSolicitacao }> {
  return callEdgeFunction('solicitacoes', {
    action: 'solicitar_revogacao',
    solicitacao_id,
    justificativa,
  })
}

export async function responderRevogacao(
  solicitacao_id: number,
  aceitar: boolean,
): Promise<{ status: StatusSolicitacao }> {
  return callEdgeFunction('solicitacoes', {
    action: 'responder_revogacao',
    solicitacao_id,
    aceitar,
  })
}

export async function revogarSolicitacao(
  solicitacao_id: number,
  justificativa?: string,
): Promise<{ status: StatusSolicitacao }> {
  return callEdgeFunction('solicitacoes', {
    action: 'revogar_solicitacao',
    solicitacao_id,
    ...(justificativa?.trim() ? { justificativa: justificativa.trim() } : {}),
  })
}

// ---------------------------------------------------------------------------
// Listar solicitações
// ---------------------------------------------------------------------------

export type ListarFiltro =
  | 'minhas'
  | 'cedente'
  | 'pendentes_gestor'
  | 'pedidos_revogacao'

// ---------------------------------------------------------------------------
// Contar solicitações do mês
// ---------------------------------------------------------------------------

export interface ContagemMes {
  utilizadas: number
  limite: number
  mes_referencia: string
}

export async function contarSolicitacoesMes(): Promise<ContagemMes> {
  return callEdgeFunction('solicitacoes', {
    action: 'contar_solicitacoes_mes',
  })
}

export async function listarSolicitacoes(
  filtro: ListarFiltro,
): Promise<SolicitacaoListItem[]> {
  return callEdgeFunction('solicitacoes', {
    action: 'listar_solicitacoes',
    filtro,
  })
}

/**
 * Todas as solicitações sob responsabilidade do gestor (todos os status).
 * Usa a Edge Function /functions/v1/solicitacoes com action listar_solicitacoes_gestor.
 */
export async function listarSolicitacoesComoGestor(): Promise<SolicitacaoListItem[]> {
  return callEdgeFunction('solicitacoes', {
    action: 'listar_solicitacoes_gestor',
  })
}
