import type { EditorView } from '@codemirror/view'
import type { TopologyEntry } from '../../lib/outline'
import { scrollToLine } from '../../lib/editorCommands'

type TopologyPanelProps = {
  topology: TopologyEntry[]
  activeIndex: number
  editorView: EditorView | null
}

export default function TopologyPanel({
  topology,
  activeIndex,
  editorView,
}: TopologyPanelProps) {
  if (topology.length === 0) {
    return (
      <div className="text-xs px-2 py-3" style={{ color: 'var(--text-muted)' }}>
        No headings found.
      </div>
    )
  }

  const maxWordCount = topology.reduce((m, e) => Math.max(m, e.wordCount), 0)

  return (
    <ul className="py-1" style={{ listStyle: 'none' }}>
      {topology.map((entry, idx) => {
        const isActive = idx === activeIndex
        const widthPct =
          maxWordCount > 0 ? (entry.wordCount / maxWordCount) * 100 : 0
        const indentPx = 8 + (entry.level - 1) * 12
        return (
          <li key={`${entry.lineNumber}-${idx}`}>
            <button
              type="button"
              onClick={() => {
                if (editorView) scrollToLine(editorView, entry.lineNumber)
              }}
              title={`Line ${entry.lineNumber} · ${entry.wordCount} words`}
              className="w-full text-left text-xs hover:cursor-pointer transition-colors"
              style={{
                paddingLeft: indentPx,
                paddingRight: 8,
                paddingTop: 6,
                paddingBottom: 6,
                color: 'var(--text-primary)',
                backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                border: 'none',
                borderLeft: isActive
                  ? '2px solid var(--accent)'
                  : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div
                className="flex items-baseline gap-2"
                style={{ marginBottom: entry.wordCount > 0 ? 4 : 0 }}
              >
                <span style={{ opacity: 0.55, flexShrink: 0 }}>
                  H{entry.level}
                </span>
                <span
                  style={{
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {entry.text}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {entry.wordCount} w
                </span>
              </div>
              {entry.wordCount > 0 && (
                <div
                  style={{
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: 'var(--bg-surface)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${widthPct}%`,
                      backgroundColor: 'var(--accent)',
                      opacity: 0.5,
                    }}
                  />
                </div>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
