export type SessionExpiryStatus = 'ok' | 'soon' | 'expired'

export function getSessionExpiryLabel(expiresAtSeconds: number, nowMs = Date.now()) {
  const remainingMs = expiresAtSeconds * 1000 - nowMs

  if (remainingMs <= 0) {
    return { label: 'Renovando acesso…', status: 'expired' as const }
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000)

  if (totalMinutes < 1) {
    return { label: 'Expira em < 1 min', status: 'soon' as const }
  }

  if (totalMinutes < 60) {
    return {
      label: `Expira em ${totalMinutes} min`,
      status: totalMinutes <= 10 ? ('soon' as const) : ('ok' as const),
    }
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const label =
    minutes > 0 ? `Expira em ${hours}h ${minutes}min` : `Expira em ${hours}h`

  return { label, status: 'ok' as const }
}

export function formatSessionExpiryTooltip(expiresAtSeconds: number) {
  const date = new Date(expiresAtSeconds * 1000)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `Acesso válido até ${time}. Renovação automática enquanto você usa o sistema.`
}
