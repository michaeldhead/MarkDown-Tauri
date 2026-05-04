import { Columns2, Eye, PenLine } from 'lucide-react'

type ViewMode = 'write' | 'split' | 'preview'

type StatusBarProps = {
  filePath: string | null
  isDirty: boolean
  line: number
  col: number
  viewMode: ViewMode
  wordCount: number
  charCount: number
  readingTimeMin: number
}

const VIEW_ICONS: Record<ViewMode, { Icon: typeof PenLine; label: string }> = {
  write: { Icon: PenLine, label: 'Write mode' },
  split: { Icon: Columns2, label: 'Split mode' },
  preview: { Icon: Eye, label: 'Preview mode' },
}

function Sep() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 1,
        height: 12,
        background: 'var(--border)',
        display: 'inline-block',
        margin: '0 10px',
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
    />
  )
}

export default function StatusBar({
  filePath,
  isDirty,
  line,
  col,
  viewMode,
  wordCount,
  charCount,
  readingTimeMin,
}: StatusBarProps) {
  const basename = filePath
    ? (filePath.split(/[\\/]/).pop() ?? filePath)
    : 'No file open'

  const { Icon, label } = VIEW_ICONS[viewMode]

  const fmtNum = (n: number) => n.toLocaleString()

  // Trivial documents (≤ 1 min) don't need a reading-time chip — it adds
  // chrome without adding information. Threshold is intentionally hardcoded;
  // adjust here if needed.
  const showReadingTime = readingTimeMin >= 2

  return (
    <div
      role="status"
      aria-label="Editor status"
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        backgroundColor: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text-muted)',
        userSelect: 'none',
        flexShrink: 0,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {isDirty && (
          <span
            aria-label="Unsaved changes"
            title="Unsaved changes"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              // Hardcoded GHS gold — universal "attention" signal that reads
              // correctly on both Dark and Ink themes; var(--accent) is steel
              // blue in Ink and wouldn't communicate "warning."
              backgroundColor: '#d4a843',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{ color: isDirty ? 'var(--text-primary)' : 'var(--text-muted)' }}
          title={filePath ?? undefined}
        >
          {basename}
        </span>
      </span>

      <Sep />

      <span>
        Ln {line}, Col {col}
      </span>

      <Sep />

      <span>
        {fmtNum(wordCount)} words
        <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
        {fmtNum(charCount)} chars
        {showReadingTime && (
          <>
            <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
            ~{readingTimeMin} min read
          </>
        )}
      </span>

      <span style={{ flex: 1 }} />

      <Sep />

      <span
        title={label}
        aria-label={label}
        style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}
      >
        <Icon size={13} strokeWidth={1.75} />
      </span>
    </div>
  )
}
