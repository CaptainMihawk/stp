import React, { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  exiting: boolean
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
    warning: (message: string) => void
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue['toast'] {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx.toast
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const MAX_TOASTS = 5
const DURATIONS: Record<ToastType, number> = {
  success: 5000,
  info: 5000,
  warning: 6000,
  error: 8000,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    // Marca como exiting para animação de saída
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    // Remove do DOM após a animação
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 300)
  }, [])

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => {
        const next = [...prev, { id, type, message, exiting: false }]
        // Remove os mais antigos se passar do limite
        while (next.length > MAX_TOASTS) {
          const oldest = next.shift()
          if (oldest) {
            const timer = timersRef.current.get(oldest.id)
            if (timer) clearTimeout(timer)
            timersRef.current.delete(oldest.id)
          }
        }
        return next
      })

      // Auto-dismiss
      const duration = DURATIONS[type]
      const timer = setTimeout(() => removeToast(id), duration)
      timersRef.current.set(id, timer)
    },
    [removeToast],
  )

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
      timersRef.current.clear()
    }
  }, [])

  const toast = useMemoToastApi(addToast)

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useMemoToastApi(addToast: (type: ToastType, message: string) => void): ToastContextValue['toast'] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const success = useCallback((msg: string) => addToast('success', msg), [addToast])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const error = useCallback((msg: string) => addToast('error', msg), [addToast])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const info = useCallback((msg: string) => addToast('info', msg), [addToast])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const warning = useCallback((msg: string) => addToast('warning', msg), [addToast])

  return { success, error, info, warning }
}

// ---------------------------------------------------------------------------
// Ícones por tipo
// ---------------------------------------------------------------------------

const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
}

// ---------------------------------------------------------------------------
// Container de toasts
// ---------------------------------------------------------------------------

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container" role="region" aria-label="Notificações" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-item toast-${t.type}${t.exiting ? ' toast-exit' : ''}`}
          role="alert"
        >
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span className="toast-message">{t.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(t.id)}
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
