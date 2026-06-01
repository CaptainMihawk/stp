import type { StatusSolicitacao } from './types'

const STATUS_TERMINAIS: StatusSolicitacao[] = [
  'recusado_cedente',
  'recusado_gestor',
  'cancelado',
  'revogado',
]

/**
 * Status em que o gestor pode usar revogar_solicitacao.
 * Conforme Fluxo.md: qualquer status ativo (aguardando_cedente, pendente,
 * aprovado, pedido_revogacao).
 */
const STATUS_GESTOR_REVOGAR: StatusSolicitacao[] = [
  'aguardando_cedente',
  'pendente',
  'aprovado',
  'pedido_revogacao',
]

export function isStatusTerminal(status: StatusSolicitacao) {
  return STATUS_TERMINAIS.includes(status)
}

export function podeCancelar(status: StatusSolicitacao, isRequisitante: boolean) {
  return isRequisitante && status === 'aguardando_cedente'
}

export function podeSolicitarRevogacao(
  status: StatusSolicitacao,
  isRequisitante: boolean,
  isCedente: boolean,
) {
  if (isRequisitante) {
    return status === 'pendente' || status === 'aprovado'
  }
  if (isCedente) {
    return status === 'pendente' || status === 'aprovado'
  }
  return false
}

export function podeGestorRevogar(status: StatusSolicitacao) {
  return STATUS_GESTOR_REVOGAR.includes(status)
}

export function podeGestorHomologar(status: StatusSolicitacao) {
  return status === 'pendente'
}

export function podeGestorResponderRevogacao(status: StatusSolicitacao) {
  return status === 'pedido_revogacao'
}
