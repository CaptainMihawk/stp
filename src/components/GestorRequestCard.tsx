import { useState, type ReactNode } from 'react'
import { Check, X, Ban, AlertCircle } from 'lucide-react'
import type { SolicitacaoListItem } from '../services/solicitacoesService'
import {
  podeGestorHomologar,
  podeGestorResponderRevogacao,
  podeGestorRevogar,
} from '../lib/solicitacaoRules'
import { StatusPill } from './StatusPill'

type GestorRequestCardProps = {
  item: SolicitacaoListItem
  actionLoadingId: number | null
  formatDate: (dateStr: string) => string
  formatDateTime: (dateTimeStr: string) => string
  onHomologar: (id: number, aprovar: boolean, replica?: string) => Promise<void>
  onResponderRevogacao: (id: number, aceitar: boolean) => Promise<void>
  onRevogar: (id: number, justificativa?: string) => Promise<void>
  showFinalizedDate?: boolean
}

export function GestorRequestCard({
  item,
  actionLoadingId,
  formatDate,
  formatDateTime,
  onHomologar,
  onResponderRevogacao,
  onRevogar,
  showFinalizedDate = false,
}: GestorRequestCardProps) {
  const [panel, setPanel] = useState<'homologar' | 'revogacao' | 'revogar' | null>(null)
  const [aprovar, setAprovar] = useState(true)
  const [replicaText, setReplicaText] = useState('')
  const [revogarJustificativa, setRevogarJustificativa] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)

  const loading = actionLoadingId === item.id

  function closePanel() {
    setPanel(null)
    setReplicaText('')
    setRevogarJustificativa('')
    setErrorText(null)
  }

  async function submitHomologar() {
    setErrorText(null)
    try {
      await onHomologar(item.id, aprovar, replicaText.trim() || undefined)
      closePanel()
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Erro ao salvar resposta.')
    }
  }

  async function submitRevogacaoResponse(aceitar: boolean) {
    setErrorText(null)
    try {
      await onResponderRevogacao(item.id, aceitar)
      closePanel()
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Erro ao responder revogação.')
    }
  }

  async function submitRevogar() {
    setErrorText(null)
    try {
      await onRevogar(item.id, revogarJustificativa.trim() || undefined)
      closePanel()
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : 'Erro ao revogar solicitação.')
    }
  }

  const showHomologar = podeGestorHomologar(item.status)
  const showResponderRevogacao = podeGestorResponderRevogacao(item.status)
  const showRevogar = podeGestorRevogar(item.status)

  return (
    <article className="request-card gestor-card-item">
      <div className="gestor-card-layout">
        <div className="gestor-card-body">
          <div className="request-head">
            <div>
              <h4 className="gestor-card-title">Troca #{item.id}</h4>
              {item.setor && (
                <span className="gestor-card-setor">🏥 {item.setor.nome}</span>
              )}
              <span className="request-date gestor-card-date">
                {showFinalizedDate ? 'Finalizada em: ' : 'Criada em: '}
                {item.respondido_em && showFinalizedDate
                  ? formatDateTime(item.respondido_em)
                  : formatDateTime(item.criado_em)}
              </span>
            </div>
            <StatusPill status={item.status} />
          </div>

          <div className="request-details">
            <div>
              <span>🔴 Requisitante</span>
              <div className="gestor-participant-row">
                <strong>{item.requisitante.nome_completo} ({item.requisitante.matricula})</strong>
                {item.requisitante.bloqueado_mes && (
                  <span className="blocked-badge" title="Bloqueado para trocas neste mês">
                    <AlertCircle size={12} /> Bloqueado
                  </span>
                )}
              </div>
              <span className="gestor-plantao-label">📅 Plantão Cedido</span>
              <strong>{formatDate(item.data_requisitante)} · {item.turno_requisitante}</strong>
            </div>
            <div>
              <span>🟢 Cedente</span>
              <div className="gestor-participant-row">
                <strong>{item.cedente.nome_completo} ({item.cedente.matricula})</strong>
                {item.cedente.bloqueado_mes && (
                  <span className="blocked-badge" title="Bloqueado para trocas neste mês">
                    <AlertCircle size={12} /> Bloqueado
                  </span>
                )}
              </div>
              <span className="gestor-plantao-label">📅 Plantão Solicitado</span>
              <strong>{formatDate(item.data_cedente)} · {item.turno_cedente}</strong>
            </div>
          </div>

          {item.observacao && (
            <p className="request-obs">
              <strong>Observação:</strong> {item.observacao}
            </p>
          )}

          {item.justificativa_revogacao && (
            <p className="request-obs gestor-obs-warning">
              <strong>Pedido de revogação:</strong> {item.justificativa_revogacao}
            </p>
          )}

          {item.replica_gestor && (
            <p className={`request-reply ${item.status === 'recusado_gestor' ? 'rejected' : ''}`}>
              <strong>Sua réplica:</strong> {item.replica_gestor}
            </p>
          )}
        </div>

        {panel === null && (
          <div className="gestor-card-actions">
            {showHomologar && (
              <>
                <button
                  type="button"
                  className="success-button gestor-action-btn"
                  onClick={() => {
                    setAprovar(true)
                    setPanel('homologar')
                  }}
                >
                  <Check size={16} /> Homologar
                </button>
                <button
                  type="button"
                  className="danger-button gestor-action-btn"
                  onClick={() => {
                    setAprovar(false)
                    setPanel('homologar')
                  }}
                >
                  <X size={16} /> Recusar
                </button>
              </>
            )}
            {showResponderRevogacao && (
              <>
                <button
                  type="button"
                  className="success-button gestor-action-btn"
                  disabled={loading}
                  onClick={() => void submitRevogacaoResponse(true)}
                >
                  Aceitar revogação
                </button>
                <button
                  type="button"
                  className="ghost-button gestor-action-btn"
                  disabled={loading}
                  onClick={() => void submitRevogacaoResponse(false)}
                >
                  Manter solicitação
                </button>
              </>
            )}
            {showRevogar && !showResponderRevogacao && (
              <button
                type="button"
                className="ghost-button gestor-action-btn"
                onClick={() => setPanel('revogar')}
              >
                <Ban size={16} /> Revogar
              </button>
            )}
          </div>
        )}
      </div>

      {panel === 'homologar' && (
        <ActionPanel
          title={aprovar ? 'Confirmar homologação' : 'Confirmar recusa'}
          titleColor={aprovar ? 'var(--success-strong)' : 'var(--danger-strong)'}
          errorText={errorText}
          loading={loading}
          onCancel={closePanel}
          onConfirm={() => void submitHomologar()}
        >
          <label>
            Réplica do gestor (opcional)
            <textarea
              value={replicaText}
              onChange={(e) => setReplicaText(e.target.value)}
              placeholder="Justificativa ou orientação..."
              rows={2}
            />
          </label>
        </ActionPanel>
      )}

      {panel === 'revogar' && (
        <ActionPanel
          title="Revogar solicitação"
          titleColor="var(--danger-strong)"
          errorText={errorText}
          loading={loading}
          onCancel={closePanel}
          onConfirm={() => void submitRevogar()}
          confirmLabel="Confirmar revogação"
          confirmClass="danger-button"
        >
          <label>
            Justificativa (opcional)
            <textarea
              value={revogarJustificativa}
              onChange={(e) => setRevogarJustificativa(e.target.value)}
              placeholder="Motivo da revogação pelo gestor..."
              rows={2}
            />
          </label>
        </ActionPanel>
      )}
    </article>
  )
}

function ActionPanel({
  title,
  titleColor,
  errorText,
  loading,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirmar',
  confirmClass = 'success-button',
  children,
}: {
  title: string
  titleColor: string
  errorText: string | null
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
  confirmClass?: string
  children: ReactNode
}) {
  return (
    <div className="action-panel">
      <h5 className="action-panel-title" style={{ color: titleColor }}>
        {title}
      </h5>
      {children}
      {errorText && <div className="error-box">{errorText}</div>}
      <div className="actions-row">
        <button
          type="button"
          className={`${confirmClass} action-panel-confirm`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Salvando...' : confirmLabel}
        </button>
        <button type="button" className="ghost-button" onClick={onCancel} disabled={loading}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
