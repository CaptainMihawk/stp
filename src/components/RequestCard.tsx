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

  const showCancel = onCancel && podeCancelar(item.status, isRequisitante)
  const showRevogacao =
    onRequestRevogation &&
    podeSolicitarRevogacao(item.status, isRequisitante, isCedente)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
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
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Troca #{item.id}
          </h4>
          <span className="request-date" style={{ display: 'block', textAlign: 'left', marginTop: '2px' }}>
            Criada em: {formatDateTime(item.criado_em)}
          </span>
        </div>
        <StatusPill status={item.status} />
      </div>

      <div className="request-details">
        <div>
          <span>🔴 Requisitante (Quem pede)</span>
          <strong>{item.requisitante.nome_completo} ({item.requisitante.matricula})</strong>
          <span style={{ marginTop: '6px' }}>📅 Plantão Cedido</span>
          <strong>{formatDate(item.data_requisitante)} · {item.turno_requisitante}</strong>
        </div>

        <div>
          <span>🟢 Cedente (Quem recebe)</span>
          <strong>{item.cedente.nome_completo} ({item.cedente.matricula})</strong>
          <span style={{ marginTop: '6px' }}>📅 Plantão Solicitado</span>
          <strong>{formatDate(item.data_cedente)} · {item.turno_cedente}</strong>
        </div>
      </div>

      {item.observacao && (
        <p className="request-obs">
          <strong>Observação:</strong> {item.observacao}
        </p>
      )}

      {item.justificativa_revogacao && (
        <p className="request-obs" style={{ borderLeftColor: 'var(--warning)' }}>
          <strong>Justificativa de revogação:</strong> {item.justificativa_revogacao}
        </p>
      )}

      {item.gestor_responsavel && (
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>👤 Gestor Responsável: <strong>{item.gestor_responsavel.nome_completo}</strong></span>
        </div>
      )}

      {item.replica_gestor && (
        <p className={`request-reply ${item.status === 'recusado_gestor' ? 'rejected' : ''}`}>
          <strong>Resposta do Gestor:</strong> {item.replica_gestor}
        </p>
      )}

      {isCedente && item.status === 'aguardando_cedente' && (onAccept || onReject) && (
        <div className="actions-row">
          <button
            type="button"
            className="success-button"
            style={{ flex: 1 }}
            onClick={() => onAccept?.(item.id)}
            disabled={isActionLoading}
          >
            {isActionLoading ? 'Processando...' : 'Aceitar Troca'}
          </button>
          <button
            type="button"
            className="danger-button"
            style={{ flex: 1 }}
            onClick={() => onReject?.(item.id)}
            disabled={isActionLoading}
          >
            {isActionLoading ? 'Processando...' : 'Recusar Troca'}
          </button>
        </div>
      )}

      {(showCancel || showRevogacao) && !revogacaoOpen && (
        <div className="actions-row">
          {showCancel && (
            <button
              type="button"
              className="ghost-button"
              style={{ flex: 1 }}
              disabled={isActionLoading}
              onClick={() => {
                if (window.confirm('Cancelar esta solicitação antes da resposta do cedente?')) {
                  void onCancel?.(item.id)
                }
              }}
            >
              {isActionLoading ? 'Processando...' : 'Cancelar solicitação'}
            </button>
          )}
          {showRevogacao && (
            <button
              type="button"
              className="ghost-button"
              style={{ flex: 1 }}
              disabled={isActionLoading}
              onClick={() => {
                setRevogacaoOpen(true)
                setLocalError(null)
              }}
            >
              Solicitar revogação
            </button>
          )}
        </div>
      )}

      {revogacaoOpen && showRevogacao && (
        <div
          style={{
            background: 'var(--surface-hover)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <label>
            Justificativa (obrigatória)
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo da revogação..."
              rows={2}
              required
            />
          </label>
          {localError && <div className="error-box">{localError}</div>}
          <div className="actions-row">
            <button
              type="button"
              className="danger-button"
              style={{ flex: 1 }}
              disabled={isActionLoading}
              onClick={() => void handleRevogacaoSubmit()}
            >
              {isActionLoading ? 'Enviando...' : 'Enviar pedido de revogação'}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={isActionLoading}
              onClick={() => {
                setRevogacaoOpen(false)
                setJustificativa('')
                setLocalError(null)
              }}
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {isRequisitante && item.status === 'aguardando_cedente' && !showCancel && (
        <div className="info-box" style={{ fontSize: '0.825rem' }}>
          ⏳ Aguardando que <strong>{item.cedente.nome_completo}</strong> aceite sua proposta de troca.
        </div>
      )}

      {isRequisitante && item.status === 'pendente' && (
        <div className="info-box" style={{ fontSize: '0.825rem' }}>
          ⏳ Aceita pelo cedente! Aguardando homologação do gestor do setor.
        </div>
      )}

      {item.status === 'pedido_revogacao' && (
        <div className="info-box" style={{ fontSize: '0.825rem' }}>
          ⏳ Aguardando decisão do gestor sobre o pedido de revogação.
        </div>
      )}
    </article>
  )
}
