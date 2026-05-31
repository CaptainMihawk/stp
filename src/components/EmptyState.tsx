import React from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description = 'Nenhum registro encontrado no momento.',
  icon = '📭',
}) => {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
    </div>
  )
}
