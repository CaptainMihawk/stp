import React, { useState } from 'react'
import type { SolicitacaoListItem } from '../services/solicitacoesService'
import {
  podeCancelar,
  podeSolicitarRevogacao,
} from '../lib/solicitacaoRules'
import { StatusPill } from './StatusPill'

interface RequestCardProps {
  item: SolicitacaoListItem
  currentUserId: string
  onAccept?: (id: number) => Promise<void>
  onReject?: (id: number) => Promise<void>
  onCancel?: (id: number) => Promise<void>
  onRequestRevogation?: (id: number, justificativa: string) => Promise<void>
  isActionLoading?: boolean
}

export const RequestCard: React.FC<RequestCardProps> = ({
  item,
  currentUserId,
  onAccept,
  onReject,
  onCancel,
  onRequestRevogation,
  isActionLoading = false,
}) => {
  const [revogacaoOpen, setRevogacaoOpen] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const participantId = (p: typeof item.requisitante) =>
    p.id ?? p.profile_id ?? ''

  const isRequisitante = participantId(item.requisitante) === currentUserId
  const isCedente = participantId(item.cedente) === currentUserId

  const effectiveIsRequisitante = isRequisitante || (!!onCancel && !onAccept && !onReject)
  const effectiveIsCedente = isCedente || (!!onAccept && !!onReject && !onCancel)

  const showCancel = onCancel && podeCancelar(item.status, effectiveIsRequisitante)
  const showRevogacao =
    onRequestRevogation &&
    podeSolicitarRevogacao(item.status, effectiveIsRequisitante, effectiveIsCedente)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const parts = dateStr.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    return dateStr
  }

  const formatDateTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr)
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateTimeStr
    }
  }

  async function handleRevogacaoSubmit() {
    if (!justificativa.trim()) {
      setLocalError('Informe a justificativa da revogação.')
      return
    }
    setLocalError(null)
    try {
      await onRequestRevogation?.(item.id, justificativa.trim())
      setRevogacaoOpen(false)
      setJustificativa('')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Erro ao solicitar revogação.')
    }
  }

  return (
    <article className="request-card">
      <div className="request-head">
        <div>
          <h4>Troca #{item.id}</h4>
          <span className="request-date">{formatDateTime(item.criado_em)}</span>
        </div>
        <StatusPill status={item.status} />
      </div>

      <div className="request-details">
        <div>
          <span>🔴 {item.requisitante.nome_completo}</span>
          <small>{item.requisitante.matricula}</small>
          <strong>📅 {formatDate(item.data_requisitante)} · {item.turno_requisitante}</strong>
        </div>
        <div>
          <span>🟢 {item.cedente.nome_completo}</span>
          <small>{item.cedente.matricula}</small>
          <strong>📅 {formatDate(item.data_cedente)} · {item.turno_cedente}</strong>
        </div>
      </div>

      {item.observacao && (
        <p className="request-obs">
          <strong>Obs:</strong> {item.observacao}
        </p>
      )}

      {item.replica_gestor && (
        <p className={`request-reply ${item.status === 'recusado_gestor' ? 'rejected' : ''}`}>
          <strong>Gestor:</strong> {item.replica_gestor}
        </p>
      )}

      {/* Cedente: aceitar/recusar enquanto aguarda cedente */}
      {effectiveIsCedente && item.status === 'aguardando_cedente' && (onAccept || onReject) && (
        <div className="actions-row">
          <button type="button" className="success-button" style={{ flex: 1 }}
            onClick={() => onAccept?.(item.id)} disabled={isActionLoading}>
            {isActionLoading ? '…' : 'Aceitar'}
          </button>
          <button type="button" className="danger-button" style={{ flex: 1 }}
            onClick={() => onReject?.(item.id)} disabled={isActionLoading}>
            {isActionLoading ? '…' : 'Recusar'}
          </button>
        </div>
      )}

      {/* Requisitante: cancelar (só aguardando_cedente) ou revogar (pendente/aprovado) */}
      {(showCancel || showRevogacao) && !revogacaoOpen && (
        <div className="actions-row">
          {showCancel && (
            <button type="button" className="ghost-button" style={{ flex: 1 }}
              disabled={isActionLoading}
              onClick={() => {
                if (window.confirm('Cancelar esta solicitação?')) void onCancel?.(item.id)
              }}>
              {isActionLoading ? '…' : 'Cancelar'}
            </button>
          )}
          {showRevogacao && (
            <button type="button" className="ghost-button" style={{ flex: 1 }}
              disabled={isActionLoading}
              onClick={() => { setRevogacaoOpen(true); setLocalError(null) }}>
              Solicitar revogação
            </button>
          )}
        </div>
      )}

      {/* Formulário de revogação */}
      {revogacaoOpen && showRevogacao && (
        <div className="revogacao-form">
          <label>
            Justificativa (obrigatória)
            <textarea value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo da revogação..." rows={2} required />
          </label>
          {localError && <div className="error-box">{localError}</div>}
          <div className="actions-row">
            <button type="button" className="danger-button" style={{ flex: 1 }}
              disabled={isActionLoading} onClick={() => void handleRevogacaoSubmit()}>
              {isActionLoading ? '…' : 'Confirmar revogação'}
            </button>
            <button type="button" className="ghost-button"
              disabled={isActionLoading}
              onClick={() => { setRevogacaoOpen(false); setJustificativa(''); setLocalError(null) }}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Mensagens de status */}
      {effectiveIsRequisitante && item.status === 'aguardando_cedente' && !showCancel && (
        <div className="info-box">⏳ Aguardando {item.cedente.nome_completo} aceitar.</div>
      )}
      {effectiveIsRequisitante && item.status === 'pendente' && (
        <div className="info-box">⏳ Aguardando homologação do gestor.</div>
      )}
      {item.status === 'pedido_revogacao' && (
        <div className="info-box">⏳ Aguardando decisão do gestor sobre revogação.</div>
      )}
      {item.status === 'revogado' && (
        <div className="info-box" style={{ borderLeftColor: 'var(--danger)' }}>
          ❌ Solicitação revogada pelo gestor.
        </div>
      )}
    </article>
  )
}
