import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  formatSessionExpiryTooltip,
  getSessionExpiryLabel,
  type SessionExpiryStatus,
} from '../lib/sessionExpiry'

const TICK_MS = 30_000

export function SessionExpiryHint() {
  const { session } = useAuth()
  const expiresAt = session?.expires_at

  const [label, setLabel] = useState<string | null>(null)
  const [status, setStatus] = useState<SessionExpiryStatus>('ok')
  const [tooltip, setTooltip] = useState('')

  useEffect(() => {
    if (!expiresAt) {
      setLabel(null)
      return
    }

    const refresh = () => {
      const { label: nextLabel, status: nextStatus } = getSessionExpiryLabel(expiresAt)
      setLabel(nextLabel)
      setStatus(nextStatus)
      setTooltip(formatSessionExpiryTooltip(expiresAt))
    }

    refresh()
    const timer = window.setInterval(refresh, TICK_MS)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  if (!label) return null

  return (
    <p
      className={`session-expiry-hint session-expiry-hint--${status}`}
      title={tooltip}
      aria-live="polite"
    >
      {label}
    </p>
  )
}
