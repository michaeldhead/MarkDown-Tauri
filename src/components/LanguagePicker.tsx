import { useEffect, useMemo, useRef, useState } from 'react'
import { LANGUAGES } from '../lib/languages'

type LanguagePickerProps = {
  isOpen: boolean
  onSelect: (language: string) => void
  onCancel: () => void
}

export default function LanguagePicker({ isOpen, onSelect, onCancel }: LanguagePickerProps) {
  const [query, setQuery] = useState<string>('')
  const [highlight, setHighlight] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setHighlight(0)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return [...LANGUAGES]
    return LANGUAGES.filter((lang) => lang.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    if (highlight > filtered.length - 1) {
      setHighlight(filtered.length === 0 ? 0 : filtered.length - 1)
    }
  }, [filtered.length, highlight])

  if (!isOpen) return null

  const commit = (lang: string | undefined) => {
    if (!lang) return
    onSelect(lang)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(filtered[highlight])
      return
    }
    if (filtered.length === 0) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => (i + 1) % filtered.length)
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => (i - 1 + filtered.length) % filtered.length)
      return
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Insert Code Block"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      onKeyDown={onKeyDown}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 440,
          maxHeight: 480,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          Insert Code Block
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlight(0)
          }}
          placeholder="Search languages…"
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 13,
            outline: 'none',
            width: '100%',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            overflowY: 'auto',
            maxHeight: 280,
            paddingRight: 4,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>
              No matching languages
            </div>
          ) : (
            filtered.map((lang, idx) => {
              const isHighlighted = idx === highlight
              return (
                <button
                  key={lang}
                  type="button"
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    commit(lang)
                  }}
                  style={{
                    backgroundColor: isHighlighted
                      ? 'var(--accent)'
                      : 'var(--bg-elevated)',
                    color: isHighlighted
                      ? 'var(--bg-primary)'
                      : 'var(--text-primary)',
                    border: `1px solid ${
                      isHighlighted ? 'var(--accent)' : 'var(--border)'
                    }`,
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    transition: 'background-color 0.1s, color 0.1s, border-color 0.1s',
                  }}
                >
                  {lang}
                </button>
              )
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: 'var(--accent)',
              border: 'none',
              fontSize: 12,
              padding: '4px 8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
