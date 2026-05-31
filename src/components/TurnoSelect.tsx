import React from 'react'
import type { Turno } from '../lib/types'
import { TURNOS } from '../lib/turnos'

interface TurnoSelectProps {
  label: string
  dateValue: string
  turnoValue: Turno | ''
  onDateChange: (date: string) => void
  onTurnoChange: (turno: Turno | '') => void
  compatibleWith?: Turno | ''
}

export const TurnoSelect: React.FC<TurnoSelectProps> = ({
  label,
  dateValue,
  turnoValue,
  onDateChange,
  onTurnoChange,
  compatibleWith = '',
}) => {
  // If compatibleWith is passed, filter turnos to only compatible ones
  const filteredTurnos = React.useMemo(() => {
    if (!compatibleWith) return TURNOS
    const targetGroup = TURNOS.find(t => t.sigla === compatibleWith)?.grupo
    return TURNOS.filter(t => t.grupo === targetGroup)
  }, [compatibleWith])

  // Get active turn metadata
  const activeTurnMeta = TURNOS.find(t => t.sigla === turnoValue)

  return (
    <>
      <label className="form-section-label">{label}</label>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <label>
          Data do Plantão
          <input
            type="date"
            required
            value={dateValue}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </label>

        <label>
          Turno
          <select
            required
            value={turnoValue}
            onChange={(e) => onTurnoChange(e.target.value as Turno)}
          >
            <option value="">Selecione o turno</option>
            {filteredTurnos.map((t) => (
              <option key={t.sigla} value={t.sigla}>
                {t.label} ({t.duracao})
              </option>
            ))}
          </select>
        </label>
      </div>

      {activeTurnMeta && (
        <div className="plantao-preview">
          <span>🕒 Grupo de Carga Horária: <strong>{activeTurnMeta.duracao}</strong> ({activeTurnMeta.grupo})</span>
        </div>
      )}

      {compatibleWith && !turnoValue && (
        <div className="info-box" style={{ gridColumn: '1 / -1', padding: '8px 12px', fontSize: '0.8rem' }}>
          💡 Mostrando apenas turnos compatíveis com a carga horária de {TURNOS.find(t => t.sigla === compatibleWith)?.duracao}.
        </div>
      )}
    </>
  )
}
