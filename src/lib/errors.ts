// ---------------------------------------------------------------------------
// AppError — erro enriquecido com código do backend
// ---------------------------------------------------------------------------

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  INVALID_STATUS: 'Esta operação não é permitida no momento atual.',
  NOT_FOUND: 'O recurso solicitado não foi encontrado.',
  INVALID_PAYLOAD: 'Dados enviados estão incompletos ou inválidos.',
  SELF_REQUEST: 'Você não pode solicitar troca com você mesmo.',
  SETOR_SEM_GESTOR: 'Este setor não possui um gestor ativo.',
  SETOR_GESTOR_DUPLICADO: 'Já existe um gestor ativo neste setor.',
  TURNOS_INCOMPATIVEIS: 'Os turnos selecionados têm cargas horárias diferentes.',
  CONFLICT: 'Já existe um registro com este nome.',
  LIMITE_MENSAL: 'Você atingiu o limite de solicitações deste mês.',
  SELF_DEACTIVATION: 'Você não pode desativar a si mesmo.',
  MATRICULA_DUPLICADA: 'Esta matrícula já está em uso por outro usuário.',
}

export class AppError extends Error {
  code: string

  constructor(code: string, backendMessage: string) {
    const friendlyMessage = ERROR_MESSAGES[code] ?? backendMessage
    super(friendlyMessage)
    this.code = code
    this.name = 'AppError'
  }
}

// ---------------------------------------------------------------------------
// Debug logger seguro — nunca expõe secrets, apenas dados de negócio
// ---------------------------------------------------------------------------

type LogLevel = 'error' | 'warn' | 'info'

interface ErrorLogEntry {
  code: string
  httpStatus?: number
  backendMessage?: string
  friendlyMessage: string
  endpoint?: string
  action?: string
  userId?: string
}

function safeErrorLog(entry: ErrorLogEntry, level: LogLevel = 'error'): void {
  const { code, httpStatus, backendMessage, friendlyMessage, endpoint, action, userId } = entry

  const logData: Record<string, unknown> = {
    code,
    httpStatus: httpStatus ?? 'N/A',
    backendMessage: backendMessage ?? '(não informado)',
    friendlyMessage,
    endpoint: endpoint ?? 'N/A',
    action: action ?? 'N/A',
    userId: userId ?? '(anônimo)',
    timestamp: new Date().toISOString(),
  }

  const prefix = '[STP]'

  switch (level) {
    case 'error':
      console.error(`${prefix} Erro:`, logData)
      break
    case 'warn':
      console.warn(`${prefix} Aviso:`, logData)
      break
    case 'info':
      console.info(`${prefix} Info:`, logData)
      break
  }
}

/**
 * Loga um erro de negócio de forma segura (sem tokens, sem secrets).
 * Use nos catch blocks das páginas para debugging em produção.
 */
export function logAppError(
  err: unknown,
  context?: { endpoint?: string; action?: string; userId?: string },
): void {
  if (err instanceof AppError) {
    safeErrorLog(
      {
        code: err.code,
        friendlyMessage: err.message,
        endpoint: context?.endpoint,
        action: context?.action,
        userId: context?.userId,
      },
      'error',
    )
  } else if (err instanceof Error) {
    safeErrorLog(
      {
        code: 'UNKNOWN',
        friendlyMessage: err.message,
        endpoint: context?.endpoint,
        action: context?.action,
        userId: context?.userId,
      },
      'error',
    )
  } else {
    safeErrorLog(
      {
        code: 'UNKNOWN',
        friendlyMessage: String(err),
        endpoint: context?.endpoint,
        action: context?.action,
        userId: context?.userId,
      },
      'error',
    )
  }
}

/**
 * Loga uma operação bem-sucedida (útil para auditoria em testes).
 */
export function logSuccess(message: string, context?: { endpoint?: string; action?: string; userId?: string }): void {
  safeErrorLog(
    {
      code: 'SUCCESS',
      friendlyMessage: message,
      endpoint: context?.endpoint,
      action: context?.action,
      userId: context?.userId,
    },
    'info',
  )
}

// ---------------------------------------------------------------------------
// Helpers para uso nos catch blocks das páginas
// ---------------------------------------------------------------------------

/**
 * Extrai a mensagem amigável de qualquer erro.
 * - AppError → mensagem traduzida baseada no código
 * - Error → message nativa
 * - outros → String(err)
 * Use para exibir ao usuário (toast, alert, etc.).
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof AppError) return err.message
  if (err instanceof Error) return err.message
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

/**
 * Helper completo para catch blocks:
 * 1. Faz console.log seguro (logAppError)
 * 2. Retorna a mensagem amigável para exibição
 *
 * Uso:
 * ```ts
 * } catch (err) {
 *   const msg = handleError(err, { endpoint: 'solicitacoes', action: 'criar_solicitacao' })
 *   toast.error(msg)
 * }
 * ```
 */
export function handleError(
  err: unknown,
  context?: { endpoint?: string; action?: string; userId?: string },
): string {
  logAppError(err, context)
  return getErrorMessage(err)
}
