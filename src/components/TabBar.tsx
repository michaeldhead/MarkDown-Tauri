import { Plus, X } from 'lucide-react'
import { tabBasename, tabDisplayName, type Tab } from '../lib/tabs'

type TabBarProps = {
  tabs: Tab[]
  activeTabId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNewTab: () => void
}

export default function TabBar({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onNewTab,
}: TabBarProps) {
  return (
    <div
      className="flex items-stretch tabbar"
      style={{
        height: 36,
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            title={tab.filePath ?? 'Untitled'}
            onMouseDown={(e) => {
              // Middle-click closes (browser convention)
              if (e.button === 1) {
                e.preventDefault()
                onClose(tab.id)
                return
              }
              if (e.button === 0) onSelect(tab.id)
            }}
            className="flex items-center"
            style={{
              padding: '0 10px 0 12px',
              gap: 6,
              minWidth: 80,
              maxWidth: 200,
              cursor: 'pointer',
              borderRight: '1px solid var(--border)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: 13,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <span
              style={{
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {tabDisplayName(tab)}
            </span>
            <button
              type="button"
              aria-label={`Close ${tabBasename(tab)}`}
              title="Close tab"
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onClose(tab.id)
              }}
              style={{
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderRadius: 3,
                color: 'inherit',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        title="New Tab (Ctrl+N)"
        aria-label="New tab"
        onClick={onNewTab}
        style={{
          width: 32,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRight: '1px solid var(--border)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <Plus size={14} strokeWidth={2} />
      </button>
      <div style={{ flex: 1 }} />
    </div>
  )
}
