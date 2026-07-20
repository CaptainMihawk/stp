import { useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmClass?: 'danger-button' | 'success-button' | 'primary-button'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmClass = 'danger-button',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Foco no dialog ao abrir
  useEffect(() => {
    if (open) {
      // Pequeno delay para garantir que o dialog está no DOM
      requestAnimationFrame(() => {
        dialogRef.current?.focus()
      })
    }
  }, [open])

  // Fechar com Escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div className="confirm-overlay" onClick={loading ? undefined : onCancel}>
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title" className="confirm-title">{title}</h3>
        <p id="confirm-message" className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button
            type="button"
            className={`${confirmClass} confirm-button`}
            onClick={onConfirm}
            disabled={loading}
            autoFocus
          >
            {loading ? 'Aguarde…' : confirmLabel}
          </button>
          <button
            type="button"
            className="ghost-button confirm-button"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
