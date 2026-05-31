import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export type SearchableSelectOption = {
  value: string
  /** Linha principal (ex.: nome completo) */
  label: string
  /** Linha secundária (ex.: matrícula e perfil) */
  hint?: string
  /** Texto usado na busca; padrão = label + hint */
  searchText?: string
}

type SearchableSelectProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  required?: boolean
  disabled?: boolean
  emptyMessage?: string
  noResultsMessage?: string
}

function normalizeSearch(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar por nome ou matrícula...',
  required: _required = false,
  disabled = false,
  emptyMessage = 'Nenhuma opção disponível',
  noResultsMessage = 'Nenhum resultado para esta busca',
}) => {
  const listId = useId()
  const rootRef = useRef<HTMLLabelElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = normalizeSearch(query)
    if (!q) return options
    return options.filter((o) => {
      const haystack = normalizeSearch(o.searchText ?? `${o.label} ${o.hint ?? ''}`)
      return haystack.includes(q)
    })
  }, [options, query])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    searchRef.current?.focus()

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function pick(option: SearchableSelectOption) {
    onChange(option.value)
    setOpen(false)
    setQuery('')
  }

  return (
    <label className="searchable-select" ref={rootRef}>
      <span>{label}</span>

      <button
        type="button"
        className={`searchable-select-trigger${disabled ? ' is-disabled' : ''}${open ? ' is-open' : ''}`}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-required={_required}
        onClick={() => {
          if (disabled) return
          setOpen((prev) => !prev)
          if (open) setQuery('')
        }}
      >
        {selected ? (
          <span className="searchable-select-value">
            <strong>{selected.label}</strong>
            {selected.hint && <small>{selected.hint}</small>}
          </span>
        ) : (
          <span className="searchable-select-placeholder">{placeholder}</span>
        )}
        <ChevronDown size={18} className="searchable-select-chevron" />
      </button>

      {open && (
        <div className="searchable-select-dropdown" role="listbox" id={listId}>
          <div className="searchable-select-search">
            <Search size={16} />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              aria-label={`Buscar em ${label}`}
            />
          </div>

          <ul className="searchable-select-list">
            {options.length === 0 ? (
              <li className="searchable-select-empty">{emptyMessage}</li>
            ) : filtered.length === 0 ? (
              <li className="searchable-select-empty">{noResultsMessage}</li>
            ) : (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className={`searchable-select-option${option.value === value ? ' is-selected' : ''}`}
                    onClick={() => pick(option)}
                  >
                    <strong>{option.label}</strong>
                    {option.hint && <small>{option.hint}</small>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </label>
  )
}
