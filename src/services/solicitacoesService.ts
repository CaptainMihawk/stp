import type { Profile, StatusSolicitacao, Turno, VinculoSetor, BloqueioTrocaMes } from '../lib/types'
import { callEdgeFunction } from './adminService'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface DadosUsuario {
  profile: Profile
  vinculos: (VinculoSetor & { setor: { id: number; nome: string } })[]
  bloqueios: BloqueioTrocaMes[]
}

export async function listarMeusDados(): Promise<DadosUsuario> {
  return callEdgeFunction('solicitacoes', { action: 'listar_meus_dados' }, { readOnly: true })
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface Participante {
  id?: string
  profile_id?: string
  nome_completo: string
  matricula: string
  bloqueado_mes?: boolean
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
  funcao?: string
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
  }, { readOnly: true })
}

export interface SolicitacaoListResponse {
  data: SolicitacaoListItem[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export async function listarSolicitacoes(
  filtro: ListarFiltro,
  page = 1,
  per_page = 20,
): Promise<SolicitacaoListResponse> {
  return callEdgeFunction('solicitacoes', {
    action: 'listar_solicitacoes',
    filtro,
    page,
    per_page,
  }, { readOnly: true })
}

/**
 * Todas as solicitações sob responsabilidade do gestor (todos os status).
 * Usa a Edge Function /functions/v1/solicitacoes com action listar_solicitacoes_gestor.
 */
export interface ListarSolicitacoesGestorParams {
  page?: number
  per_page?: number
  status?: StatusSolicitacao
  mes?: string // formato YYYY-MM
}

export async function listarSolicitacoesComoGestor(
  params: ListarSolicitacoesGestorParams = {},
): Promise<SolicitacaoListResponse> {
  const { page = 1, per_page = 20, status, mes } = params
  return callEdgeFunction('solicitacoes', {
    action: 'listar_solicitacoes_gestor',
    page,
    per_page,
    ...(status ? { status } : {}),
    ...(mes ? { mes } : {}),
  }, { readOnly: true })
}

// ---------------------------------------------------------------------------
// Histórico de uma solicitação (Gestor)
// ---------------------------------------------------------------------------

export interface HistoricoSolicitacaoItem {
  id: number
  status_anterior: string | null
  status_novo: string
  alterado_em: string
  alterado_por_profile: { nome_completo: string; matricula: string }
}

export interface HistoricoSolicitacaoResponse {
  data: HistoricoSolicitacaoItem[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export interface ListarHistoricoSolicitacaoParams {
  solicitacao_id: number
  page?: number
  per_page?: number
  mes?: string // formato YYYY-MM
}

export async function listarHistoricoSolicitacao(
  params: ListarHistoricoSolicitacaoParams,
): Promise<HistoricoSolicitacaoResponse> {
  const { solicitacao_id, page = 1, per_page = 50, mes } = params
  return callEdgeFunction('solicitacoes', {
    action: 'listar_historico_solicitacao',
    solicitacao_id,
    page,
    per_page,
    ...(mes ? { mes } : {}),
  }, { readOnly: true })
}

// ---------------------------------------------------------------------------
// Bloqueios de troca mensal
// ---------------------------------------------------------------------------

export interface BloquearUsuarioMesPayload {
  profile_id: string
  setor_id: number
  mes_referencia: string // YYYY-MM
  motivo?: string
}

export async function bloquearUsuarioMes(
  data: BloquearUsuarioMesPayload,
): Promise<BloqueioTrocaMes> {
  return callEdgeFunction('solicitacoes', {
    action: 'bloquear_usuario_mes',
    ...data,
  })
}

export async function desbloquearUsuarioMes(
  profile_id: string,
  setor_id: number,
  mes_referencia: string,
): Promise<void> {
  await callEdgeFunction('solicitacoes', {
    action: 'desbloquear_usuario_mes',
    profile_id,
    setor_id,
    mes_referencia,
  })
}

export async function listarBloqueiosMes(
  setor_id: number,
  mes_referencia: string,
): Promise<BloqueioTrocaMes[]> {
  const result = await callEdgeFunction<{ data: BloqueioTrocaMes[] }>('solicitacoes', {
    action: 'listar_bloqueios_mes',
    setor_id,
    mes_referencia,
  }, { readOnly: true })
  return result.data || []
}
