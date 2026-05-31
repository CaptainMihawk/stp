import { useState, type ReactNode } from 'react'
import { Check, X, Ban } from 'lucide-react'
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
    <article className="request-card">
      <div className="request-head">
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Troca #{item.id}</h4>
          <span className="request-date" style={{ display: 'block', textAlign: 'left', marginTop: '2px' }}>
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
          <strong>{item.requisitante.nome_completo} ({item.requisitante.matricula})</strong>
          <span style={{ marginTop: '6px' }}>📅 Plantão Cedido</span>
          <strong>{formatDate(item.data_requisitante)} · {item.turno_requisitante}</strong>
        </div>
        <div>
          <span>🟢 Cedente</span>
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
          <strong>Pedido de revogação:</strong> {item.justificativa_revogacao}
        </p>
      )}

      {item.replica_gestor && (
        <p className={`request-reply ${item.status === 'recusado_gestor' ? 'rejected' : ''}`}>
          <strong>Sua réplica:</strong> {item.replica_gestor}
        </p>
      )}

      {panel === null && (
        <div className="actions-row" style={{ flexWrap: 'wrap' }}>
          {showHomologar && (
            <>
              <button
                type="button"
                className="success-button"
                style={{ flex: 1, minWidth: '140px' }}
                onClick={() => {
                  setAprovar(true)
                  setPanel('homologar')
                }}
              >
                <Check size={16} /> Homologar
              </button>
              <button
                type="button"
                className="danger-button"
                style={{ flex: 1, minWidth: '140px' }}
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
                className="success-button"
                style={{ flex: 1, minWidth: '140px' }}
                disabled={loading}
                onClick={() => void submitRevogacaoResponse(true)}
              >
                Aceitar revogação
              </button>
              <button
                type="button"
                className="ghost-button"
                style={{ flex: 1, minWidth: '140px' }}
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
              className="ghost-button"
              style={{ flex: 1 }}
              onClick={() => setPanel('revogar')}
            >
              <Ban size={16} /> Revogar
            </button>
          )}
        </div>
      )}

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
      <h5
        style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: titleColor,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </h5>
      {children}
      {errorText && <div className="error-box">{errorText}</div>}
      <div className="actions-row">
        <button
          type="button"
          className={confirmClass}
          onClick={onConfirm}
          disabled={loading}
          style={{ flex: 1 }}
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
