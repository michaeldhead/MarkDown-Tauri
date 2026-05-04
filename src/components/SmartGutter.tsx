type SmartGutterProps = {
  wordCount: number
  scrollRatio: number
  onDragStart: (e: React.MouseEvent) => void
}

const GUTTER_WIDTH = 24
const DOT_SIZE = 6

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export default function SmartGutter({ wordCount, scrollRatio, onDragStart }: SmartGutterProps) {
  const ratio = clamp01(scrollRatio)

  return (
    <div
      onMouseDown={onDragStart}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize divider · scroll position · word count"
      style={{
        width: GUTTER_WIDTH,
        flexShrink: 0,
        position: 'relative',
        cursor: 'col-resize',
        backgroundColor: 'var(--bg-elevated)',
        borderLeft: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
        userSelect: 'none',
      }}
    >
      {/* Word count badge — vertical, centered, behind the dot */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: 0.5,
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none',
        }}
      >
        {wordCount} words
      </div>

      {/* Scroll-position dot */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: `${ratio * 100}%`,
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: '50%',
          backgroundColor: 'var(--accent)',
          transform: `translate(-50%, ${-ratio * 100}%)`,
          pointerEvents: 'none',
          boxShadow: '0 0 0 2px var(--bg-elevated)',
        }}
      />
    </div>
  )
}
