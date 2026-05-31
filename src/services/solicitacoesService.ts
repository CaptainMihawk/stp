import type { StatusSolicitacao, Turno } from '../lib/types'
import { supabase } from '../lib/supabase'
import { callEdgeFunction } from './adminService'

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
export interface SolicitacaoListItem {
  id: number
  status: StatusSolicitacao
  requisitante: Participante
  cedente: Participante
  gestor_responsavel?: Participante
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
 * O filtro `pendentes_gestor` na Edge Function retorna apenas status `pendente` (STP.md).
 */
export async function listarSolicitacoesComoGestor(
  gestorId: string,
): Promise<SolicitacaoListItem[]> {
  const { data, error } = await supabase
    .from('solicitacoes')
    .select(
      `
      id,
      status,
      setor_id,
      data_requisitante,
      turno_requisitante,
      data_cedente,
      turno_cedente,
      observacao,
      justificativa_revogacao,
      replica_gestor,
      aprovacao,
      criado_em,
      respondido_em,
      requisitante:requisitante_id ( id, nome_completo, matricula ),
      cedente:cedente_id ( id, nome_completo, matricula )
    `,
    )
    .eq('gestor_responsavel_id', gestorId)
    .order('criado_em', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const pickProfile = (raw: unknown) => {
    if (!raw) return null
    return (Array.isArray(raw) ? raw[0] : raw) as {
      id: string
      nome_completo: string
      matricula: string
    } | null
  }

  return (data ?? []).map((row) => ({
    id: row.id as number,
    status: row.status as StatusSolicitacao,
    requisitante: mapParticipante(pickProfile(row.requisitante)),
    cedente: mapParticipante(pickProfile(row.cedente)),
    setor_id: row.setor_id as number | null,
    data_requisitante: row.data_requisitante as string,
    turno_requisitante: row.turno_requisitante as Turno,
    data_cedente: row.data_cedente as string,
    turno_cedente: row.turno_cedente as Turno,
    observacao: row.observacao as string | null,
    justificativa_revogacao: (row.justificativa_revogacao as string | null) ?? null,
    replica_gestor: row.replica_gestor as string | null,
    aprovacao: row.aprovacao as boolean | null,
    criado_em: row.criado_em as string,
    respondido_em: row.respondido_em as string | null,
  }))
}
