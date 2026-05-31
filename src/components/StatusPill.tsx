import React from 'react'
import type { StatusSolicitacao } from '../lib/types'

interface StatusPillProps {
  status: StatusSolicitacao
}

const STATUS_CONFIG: Record<
  StatusSolicitacao,
  { label: string; className: string }
> = {
  aguardando_cedente: { label: 'Aguardando Cedente', className: 'pending' },
  pendente: { label: 'Aguardando Gestor', className: 'pending' },
  aprovado: { label: 'Aprovado', className: 'approved' },
  recusado_cedente: { label: 'Recusado pelo Cedente', className: 'rejected' },
  recusado_gestor: { label: 'Recusado pelo Gestor', className: 'rejected' },
  cancelado: { label: 'Cancelado', className: 'rejected' },
  pedido_revogacao: { label: 'Pedido de Revogação', className: 'pending' },
  revogado: { label: 'Revogado', className: 'rejected' },
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] ?? { label: status, className: '' }

  return (
    <span className={`status-pill ${config.className}`}>
      {config.label}
    </span>
  )
}
