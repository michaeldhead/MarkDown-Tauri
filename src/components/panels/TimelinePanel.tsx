import { useMemo } from 'react'
import { RotateCw } from 'lucide-react'
import { countWords } from '../../lib/outline'
import { formatSnapshotDate, parseSnapshotDate } from '../../lib/timeline'

const POSITIVE = '#a6e3a1'
const NEGATIVE = '#f38ba8'

type TimelinePanelProps = {
  filePath: string | null
  snapshots: string[]
  selectedSnapshot: string | null
  previewContent: string | null
  currentWordCount: number
  onSelect: (filename: string) => void
  onRestore: (filename: string) => void
  onRefresh: () => void
}

export default function TimelinePanel({
  filePath,
  snapshots,
  selectedSnapshot,
  previewContent,
  currentWordCount,
  onSelect,
  onRestore,
  onRefresh,
}: TimelinePanelProps) {
  const snapshotWordCount = useMemo(
    () => (previewContent === null ? 0 : countWords(previewContent)),
    [previewContent],
  )
  const delta = snapshotWordCount - currentWordCount
  const deltaLabel =
    delta === 0 ? '±0' : delta > 0 ? `+${delta}` : `${delta}`
  const deltaColor =
    delta === 0
      ? 'var(--text-muted)'
      : delta > 0
        ? POSITIVE
        : NEGATIVE

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="text-xs"
          style={{ color: 'var(--text-muted)', fontWeight: 600 }}
        >
          {filePath ? `${snapshots.length} snapshots` : 'Version Timeline'}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh"
          disabled={!filePath}
          className="hover:cursor-pointer"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
            borderRadius: 4,
            opacity: filePath ? 1 : 0.4,
          }}
        >
          <RotateCw size={12} strokeWidth={1.75} />
        </button>
      </div>

      {!filePath ? (
        <div
          className="text-xs px-3 py-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Open a file to view its version history.
        </div>
      ) : snapshots.length === 0 ? (
        <div
          className="text-xs px-3 py-3"
          style={{ color: 'var(--text-muted)' }}
        >
          No snapshots yet. Snapshots are created on every save (Ctrl+S).
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto py-1" style={{ listStyle: 'none' }}>
          {snapshots.map((filename) => {
            const isSelected = filename === selectedSnapshot
            const date = parseSnapshotDate(filename)
            return (
              <li key={filename}>
                <button
                  type="button"
                  onClick={() => onSelect(filename)}
                  title={filename}
                  className="w-full text-left text-xs hover:cursor-pointer transition-colors"
                  style={{
                    padding: '6px 10px',
                    color: 'var(--text-primary)',
                    backgroundColor: isSelected
                      ? 'var(--bg-elevated)'
                      : 'transparent',
                    border: 'none',
                    borderLeft: isSelected
                      ? '2px solid var(--accent)'
                      : '2px solid transparent',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {formatSnapshotDate(date)}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {filePath && selectedSnapshot && previewContent !== null && (
        <div
          className="px-3 py-2 flex flex-col gap-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="text-xs" style={{ color: 'var(--text-primary)' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              Words: {snapshotWordCount.toLocaleString()}
            </span>
            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>
              ·
            </span>
            <span
              style={{
                color: deltaColor,
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
              }}
              title="Δ vs current document"
            >
              {deltaLabel}
            </span>
            <span
              style={{ color: 'var(--text-muted)', marginLeft: 4, fontSize: 11 }}
            >
              vs current
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRestore(selectedSnapshot)}
            className="text-xs hover:cursor-pointer"
            style={{
              padding: '6px 10px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: 'var(--bg-primary)',
              fontWeight: 600,
            }}
          >
            Restore this version
          </button>
        </div>
      )}
    </div>
  )
}
