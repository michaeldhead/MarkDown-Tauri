function basename(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

type FilesPanelProps = {
  recentFiles: string[]
  onOpen: (path: string) => void
}

export default function FilesPanel({ recentFiles, onOpen }: FilesPanelProps) {
  if (recentFiles.length === 0) {
    return (
      <div
        className="text-xs px-3 py-3"
        style={{ color: 'var(--text-muted)' }}
      >
        No recent files yet. Open a file to see it here.
      </div>
    )
  }

  return (
    <ul className="py-1" style={{ listStyle: 'none' }}>
      {recentFiles.map((path) => (
        <li key={path}>
          <button
            type="button"
            onClick={() => onOpen(path)}
            title={path}
            className="w-full text-left text-xs hover:cursor-pointer transition-colors"
            style={{
              padding: '6px 10px',
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
            <div style={{ fontWeight: 500, marginBottom: 2 }}>{basename(path)}</div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {path}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
