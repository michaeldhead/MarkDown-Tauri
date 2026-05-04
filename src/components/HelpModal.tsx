import { useEffect } from 'react'
import { X } from 'lucide-react'

type HelpModalProps = {
  isOpen: boolean
  onClose: () => void
}

type Shortcut = { keys: string; label: string }

const FILE_SHORTCUTS: Shortcut[] = [
  { keys: 'Ctrl+N', label: 'New Tab' },
  { keys: 'Ctrl+O', label: 'Open File' },
  { keys: 'Ctrl+S', label: 'Save' },
  { keys: 'Ctrl+Shift+S', label: 'Save As' },
]

const EDITING_SHORTCUTS: Shortcut[] = [
  { keys: 'Ctrl+B', label: 'Bold' },
  { keys: 'Ctrl+I', label: 'Italic' },
  { keys: 'Ctrl+`', label: 'Inline Code' },
  { keys: 'Ctrl+Shift+K', label: 'Code Block (with language picker)' },
  { keys: 'Ctrl+K', label: 'Command Palette' },
  { keys: 'Ctrl+Shift+E', label: 'Export Dialog' },
  { keys: 'F1', label: 'This help screen' },
]

const FEATURES: { name: string; description: string }[] = [
  {
    name: 'Smart Gutter',
    description:
      'The 24px channel between editor and preview shows scroll position and live word count.',
  },
  {
    name: 'Document Topology',
    description:
      'The Outline panel shows heading structure with per-section word counts and balance bars.',
  },
  {
    name: 'Command Palette',
    description:
      'Press Ctrl+K to search commands, headings, snippets, and recent files in one place.',
  },
  {
    name: 'Snippet Studio',
    description:
      'Create, edit, and manage reusable text snippets from the sidebar.',
  },
  {
    name: 'Version Timeline',
    description:
      'Every Ctrl+S creates a snapshot. Browse and restore previous versions from the sidebar.',
  },
  {
    name: 'Multi-Tab',
    description:
      'Open multiple documents simultaneously. Drag .md files onto the window to open them.',
  },
]

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        marginTop: '1.25rem',
        marginBottom: '0.5rem',
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  )
}

function SubHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: 'var(--text-primary)',
        fontWeight: 600,
        marginTop: '0.75rem',
        marginBottom: '0.25rem',
      }}
    >
      {children}
    </div>
  )
}

function ShortcutRow({ keys, label }: Shortcut) {
  return (
    <div className="flex items-baseline" style={{ padding: '3px 0' }}>
      <span
        style={{
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          color: 'var(--accent)',
          minWidth: 160,
          flexShrink: 0,
        }}
      >
        {keys}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>
    </div>
  )
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help and Keyboard Shortcuts"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 500,
          maxHeight: 600,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '1.25rem 1.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center"
          style={{
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border)',
            marginBottom: '0.5rem',
          }}
        >
          <span
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Help &amp; Keyboard Shortcuts
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            overflowY: 'auto',
            maxHeight: 480,
            paddingRight: 8,
          }}
        >
          <SectionHeader>Keyboard Shortcuts</SectionHeader>

          <SubHeader>File</SubHeader>
          {FILE_SHORTCUTS.map((s) => (
            <ShortcutRow key={s.keys} keys={s.keys} label={s.label} />
          ))}

          <SubHeader>Editing</SubHeader>
          {EDITING_SHORTCUTS.map((s) => (
            <ShortcutRow key={s.keys} keys={s.keys} label={s.label} />
          ))}

          <SectionHeader>Features</SectionHeader>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.7,
            }}
          >
            {FEATURES.map((f) => (
              <div key={f.name} style={{ marginBottom: '0.5rem' }}>
                <span
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    marginRight: 6,
                  }}
                >
                  {f.name} —
                </span>
                {f.description}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border)',
            marginTop: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={onClose}
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
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
