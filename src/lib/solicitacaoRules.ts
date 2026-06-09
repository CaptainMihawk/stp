import type { StatusSolicitacao, BloqueioTrocaMes } from './types'

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

/**
 * Verifica se um usuário está bloqueado para trocas no mês atual.
 * Retorna o bloqueio se existir, null caso contrário.
 */
export function getBloqueioMesAtual(
  bloqueios: BloqueioTrocaMes[],
  mesReferencia: string, // formato YYYY-MM
): BloqueioTrocaMes | null {
  return bloqueios.find((b) => b.mes_referencia === mesReferencia) ?? null
}

/**
 * Verifica se o usuário logado ou o cedente selecionado estão bloqueados
 * para o mês da solicitação.
 * Retorna mensagem de erro se bloqueado, null se pode prosseguir.
 */
export function verificarBloqueioCriarSolicitacao(
  bloqueiosUsuarioLogado: BloqueioTrocaMes[],
  cedenteBloqueadoMes: boolean,
  mesReferencia: string, // formato YYYY-MM
): string | null {
  const bloqueioUsuario = getBloqueioMesAtual(bloqueiosUsuarioLogado, mesReferencia)
  if (bloqueioUsuario) {
    return `Você está bloqueado para trocas neste mês (${mesReferencia}). Motivo: ${bloqueioUsuario.motivo ?? 'Não informado'}`
  }
  if (cedenteBloqueadoMes) {
    return 'O colega selecionado está bloqueado para trocas neste mês.'
  }
  return null
}
