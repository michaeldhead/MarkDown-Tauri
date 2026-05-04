import { useEffect, useMemo, useRef, useState } from 'react'
import { filterAndScore, type PaletteItem } from '../lib/palette'

const MAX_RESULTS = 50

type CommandPaletteProps = {
  isOpen: boolean
  onClose: () => void
  items: PaletteItem[]
}

export default function CommandPalette({ isOpen, onClose, items }: CommandPaletteProps) {
  const [query, setQuery] = useState<string>('')
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  // Reset on open.
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      // Defer focus so the input is mounted and the modal is visible.
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  const filtered = useMemo(
    () => filterAndScore(items, query.trim()).slice(0, MAX_RESULTS),
    [items, query],
  )

  // Clamp selectedIndex when result list shrinks.
  useEffect(() => {
    if (selectedIndex > filtered.length - 1) {
      setSelectedIndex(filtered.length === 0 ? 0 : filtered.length - 1)
    }
  }, [filtered.length, selectedIndex])

  // Scroll selected row into view on selection change.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const row = list.children[selectedIndex] as HTMLElement | undefined
    if (row) row.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!isOpen) return null

  const execute = (item: PaletteItem | undefined) => {
    if (!item) return
    onClose()
    // Run after the close animation/state flush so any focus-restore in
    // child components doesn't fight with the action's own focus calls.
    queueMicrotask(() => item.action())
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filtered.length > 0) {
        setSelectedIndex((i) => (i + 1) % filtered.length)
      }
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filtered.length > 0) {
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
      }
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      execute(filtered[selectedIndex])
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
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
          width: 560,
          maxHeight: 420,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedIndex(0)
          }}
          placeholder="Type a command, heading, snippet, or file…"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            fontSize: 14,
            outline: 'none',
            width: '100%',
          }}
        />

        <div
          ref={listRef}
          role="listbox"
          aria-label="Results"
          style={{ overflowY: 'auto', maxHeight: 360 }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '20px 16px',
                color: 'var(--text-muted)',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              No results
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault() // keep input focused
                    execute(item)
                  }}
                  style={{
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    gap: 8,
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                    color: isSelected ? 'var(--bg-primary)' : 'var(--text-primary)',
                  }}
                >
                  <span
                    style={{
                      width: 56,
                      flexShrink: 0,
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: isSelected ? 'var(--bg-primary)' : 'var(--text-muted)',
                      opacity: isSelected ? 0.85 : 1,
                    }}
                  >
                    {item.kind}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.label}
                  </span>
                  {item.detail && (
                    <span
                      title={item.detail}
                      style={{
                        maxWidth: 160,
                        fontSize: 11,
                        color: isSelected ? 'var(--bg-primary)' : 'var(--text-muted)',
                        opacity: isSelected ? 0.85 : 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.detail}
                    </span>
                  )}
                  {item.shortcut && (
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        color: isSelected ? 'var(--bg-primary)' : 'var(--text-muted)',
                        opacity: isSelected ? 0.85 : 1,
                      }}
                    >
                      {item.shortcut}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
