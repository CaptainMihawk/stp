import type { Turno } from './types'

export const TURNOS: { sigla: Turno; label: string; grupo: string; duracao: string }[] = [
  { sigla: 'SD', label: 'SD (07h–19h)', grupo: '12h', duracao: '12 horas' },
  { sigla: 'SN', label: 'SN (19h–07h)', grupo: '12h', duracao: '12 horas' },
  { sigla: 'M', label: 'M (07h–13h)', grupo: '6h', duracao: '6 horas' },
  { sigla: 'T', label: 'T (13h–19h)', grupo: '6h', duracao: '6 horas' },
  { sigla: 'MT', label: 'MT (07h–16h / 08h–17h)', grupo: '9h', duracao: '9 horas' },
  { sigla: 'P', label: 'P (07h–07h)', grupo: '24h', duracao: '24 horas' },
]

export function getCompatibleTurnos(turno: Turno): Turno[] {
  const match = TURNOS.find((t) => t.sigla === turno)
  if (!match) return []
  return TURNOS.filter((t) => t.grupo === match.grupo).map((t) => t.sigla)
}
