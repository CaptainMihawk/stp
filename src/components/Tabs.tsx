import React from 'react'

export interface TabOption {
  id: string
  label: string
  icon?: string
  badge?: number
}

interface TabsProps {
  options: TabOption[]
  activeTab: string
  onChange: (id: string) => void
}

export const Tabs: React.FC<TabsProps> = ({ options, activeTab, onChange }) => {
  return (
    <div className="tabs-container">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`tab-button ${activeTab === option.id ? 'active' : ''}`}
          onClick={() => onChange(option.id)}
        >
          {option.icon && <span>{option.icon}</span>}
          {option.label}
          {option.badge !== undefined && option.badge > 0 && (
            <span className="notification-badge">{option.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}
