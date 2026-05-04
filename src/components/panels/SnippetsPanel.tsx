import { useMemo, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { insertSnippet } from '../../lib/editorCommands'
import type { Snippet } from '../../lib/snippets'

type SnippetsPanelProps = {
  snippets: Snippet[]
  editorView: EditorView | null
}

const ALL = '__all__'

function firstLine(body: string): string {
  const idx = body.indexOf('\n')
  return idx === -1 ? body : body.slice(0, idx)
}

export default function SnippetsPanel({ snippets, editorView }: SnippetsPanelProps) {
  const [activeTag, setActiveTag] = useState<string>(ALL)

  const tags = useMemo(() => {
    const set = new Set<string>()
    snippets.forEach((s) => set.add(s.tag))
    return Array.from(set).sort()
  }, [snippets])

  const filtered = useMemo(() => {
    if (activeTag === ALL) return snippets
    return snippets.filter((s) => s.tag === activeTag)
  }, [snippets, activeTag])

  if (snippets.length === 0) {
    return (
      <div className="text-xs px-3 py-3" style={{ color: 'var(--text-muted)' }}>
        No snippets.
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div
        className="flex flex-wrap gap-1 px-2 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <TagButton
          label="All"
          active={activeTag === ALL}
          onClick={() => setActiveTag(ALL)}
        />
        {tags.map((tag) => (
          <TagButton
            key={tag}
            label={tag}
            active={activeTag === tag}
            onClick={() => setActiveTag(tag)}
          />
        ))}
      </div>

      <ul className="flex-1 overflow-y-auto py-1" style={{ listStyle: 'none' }}>
        {filtered.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                if (editorView) insertSnippet(editorView, s.body)
              }}
              title={s.body}
              className="w-full text-left text-xs hover:cursor-pointer transition-colors"
              style={{
                padding: '8px 10px',
                color: 'var(--text-primary)',
                backgroundColor: 'transparent',
                border: 'none',
                borderLeft: '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
                e.currentTarget.style.borderLeftColor = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderLeftColor = 'transparent'
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 10,
                    backgroundColor: 'var(--bg-elevated)',
                    padding: '1px 6px',
                    borderRadius: 3,
                  }}
                >
                  {s.tag}
                </span>
              </div>
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {firstLine(s.body) || '(empty line)'}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

type TagButtonProps = {
  label: string
  active: boolean
  onClick: () => void
}

function TagButton({ label, active, onClick }: TagButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs hover:cursor-pointer transition-colors"
      style={{
        padding: '2px 8px',
        borderRadius: 3,
        color: active ? 'var(--bg-primary)' : 'var(--text-primary)',
        backgroundColor: active ? 'var(--accent)' : 'transparent',
        border: '1px solid var(--border)',
        fontWeight: active ? 600 : 400,
        textTransform: 'lowercase',
      }}
    >
      {label}
    </button>
  )
}
