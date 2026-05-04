import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { DEFAULT_SNIPPETS, type Snippet } from '../../lib/snippets'

const DESTRUCTIVE = '#f38ba8'

type SnippetStudioPanelProps = {
  snippets: Snippet[]
  onSave: (updated: Snippet[]) => void
}

type EditState = {
  draft: Snippet
  isNew: boolean
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyDraft(): Snippet {
  return { id: newId(), name: '', tag: '', body: '' }
}

export default function SnippetStudioPanel({ snippets, onSave }: SnippetStudioPanelProps) {
  const [editing, setEditing] = useState<EditState | null>(null)

  if (editing) {
    return (
      <EditView
        state={editing}
        onCommit={(updated) => {
          const next = editing.isNew
            ? [...snippets, updated]
            : snippets.map((s) => (s.id === updated.id ? updated : s))
          onSave(next)
          setEditing(null)
        }}
        onCancel={() => setEditing(null)}
        onDelete={() => {
          const next = snippets.filter((s) => s.id !== editing.draft.id)
          onSave(next)
          setEditing(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={() => setEditing({ draft: emptyDraft(), isNew: true })}
          className="text-xs hover:cursor-pointer"
          style={{
            width: '100%',
            padding: 6,
            borderRadius: 4,
            backgroundColor: 'var(--accent)',
            color: 'var(--bg-primary)',
            border: 'none',
            fontWeight: 600,
          }}
        >
          + New Snippet
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto py-1" style={{ listStyle: 'none' }}>
        {snippets.length === 0 ? (
          <li
            className="px-3 py-2 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            No snippets. Add one above.
          </li>
        ) : (
          snippets.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    draft: { ...s },
                    isNew: false,
                  })
                }
                className="w-full text-left text-xs hover:cursor-pointer transition-colors"
                style={{
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
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
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 10,
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-muted)',
                    borderRadius: 3,
                    padding: '1px 5px',
                  }}
                >
                  {s.tag || '—'}
                </span>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: 500,
                  }}
                >
                  {s.name || '(untitled)'}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="px-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                'Reset all snippets to defaults? Your custom snippets will be lost.',
              )
            ) {
              onSave(DEFAULT_SNIPPETS)
            }
          }}
          className="text-xs hover:cursor-pointer"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            padding: 0,
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
          }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

type EditViewProps = {
  state: EditState
  onCommit: (updated: Snippet) => void
  onCancel: () => void
  onDelete: () => void
}

function EditView({ state, onCommit, onCancel, onDelete }: EditViewProps) {
  const [name, setName] = useState<string>(state.draft.name)
  const [tag, setTag] = useState<string>(state.draft.tag)
  const [body, setBody] = useState<string>(state.draft.body)

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: 12,
    outline: 'none',
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div
        className="px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="text-xs hover:cursor-pointer"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <ArrowLeft size={12} strokeWidth={1.75} />
          Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Snippet name"
            autoFocus
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.outline = '1px solid var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.outline = 'none')}
          />
        </Field>

        <Field label="Tag">
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. format, code, meta"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.outline = '1px solid var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.outline = 'none')}
          />
        </Field>

        <Field label="Body">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            spellCheck={false}
            style={{
              ...inputStyle,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 11,
              lineHeight: 1.5,
              resize: 'vertical',
              minHeight: 120,
            }}
            onFocus={(e) => (e.currentTarget.style.outline = '1px solid var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.outline = 'none')}
          />
        </Field>
      </div>

      <div
        className="px-3 py-2 flex flex-col gap-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              canSave &&
              onCommit({
                id: state.draft.id,
                name: trimmedName,
                tag: tag.trim(),
                body,
              })
            }
            disabled={!canSave}
            className="text-xs"
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: 'var(--bg-primary)',
              fontWeight: 600,
              opacity: canSave ? 1 : 0.4,
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs hover:cursor-pointer"
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            Cancel
          </button>
        </div>

        {!state.isNew && (
          <button
            type="button"
            onClick={onDelete}
            className="text-xs hover:cursor-pointer"
            style={{
              padding: '6px 10px',
              borderRadius: 4,
              border: `1px solid ${DESTRUCTIVE}`,
              backgroundColor: 'transparent',
              color: DESTRUCTIVE,
              fontWeight: 500,
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

type FieldProps = {
  label: string
  children: React.ReactNode
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs"
        style={{
          color: 'var(--text-muted)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
