import { useEffect } from 'react'

type AboutModalProps = {
  isOpen: boolean
  onClose: () => void
}

const ECOSYSTEM = [
  'Web App',
  'Windows WPF',
  'Cross-Platform (Avalonia)',
  'Tauri (this app)',
] as const

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
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
      aria-label="About GHS Markdown Editor"
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
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 420,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '1.5rem 1.75rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Icon block */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            backgroundColor: 'var(--accent)',
            color: 'var(--bg-primary)',
            fontSize: 28,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          M
        </div>

        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            textAlign: 'center',
          }}
        >
          GHS Markdown Editor
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--accent)',
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 2,
          }}
        >
          Mike and the Machine
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Version 0.1.0
        </div>

        <div
          style={{
            width: '100%',
            borderTop: '1px solid var(--border)',
            margin: '1.25rem 0',
          }}
        />

        <div
          style={{
            width: '100%',
            fontSize: 13,
            color: 'var(--text-primary)',
            lineHeight: 1.6,
          }}
        >
          <Section label="Built by">
            Mike Head, SDM — architecture, direction, and vision.
          </Section>
          <Section label="Powered by">
            Claude (Anthropic) — implementation engine.
          </Section>
        </div>

        <div
          style={{
            width: '100%',
            borderTop: '1px solid var(--border)',
            margin: '1.25rem 0',
          }}
        />

        <div style={{ width: '100%' }}>
          <Label>Part of the GHS Markdown Ecosystem</Label>
          <ul
            style={{
              listStyle: 'none',
              margin: '6px 0 0',
              padding: 0,
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.7,
            }}
          >
            {ECOSYSTEM.map((entry) => (
              <li key={entry}>• {entry}</li>
            ))}
          </ul>
        </div>

        <div
          style={{
            width: '100%',
            borderTop: '1px solid var(--border)',
            margin: '1.25rem 0',
          }}
        />

        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Stack: Tauri 2 · React 19 · TypeScript · CodeMirror 6 · Vite 7
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            width: '100%',
            marginTop: '1rem',
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <Label>{label}</Label>
      <div style={{ marginTop: 2 }}>{children}</div>
    </div>
  )
}
