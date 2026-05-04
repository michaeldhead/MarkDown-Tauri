import type { EditorView } from '@codemirror/view'
import {
  AlignLeft,
  Clock,
  History,
  Scissors,
  Settings as SettingsIcon,
  Wand2,
} from 'lucide-react'
import type { Snippet } from '../lib/snippets'
import type { TopologyEntry } from '../lib/outline'
import TopologyPanel from './panels/TopologyPanel'
import FilesPanel from './panels/FilesPanel'
import SnippetsPanel from './panels/SnippetsPanel'
import SnippetStudioPanel from './panels/SnippetStudioPanel'
import TimelinePanel from './panels/TimelinePanel'
import SettingsPanel, { type Theme, type ViewMode } from './panels/SettingsPanel'

export type PanelId =
  | 'outline'
  | 'files'
  | 'snippets'
  | 'studio'
  | 'timeline'
  | 'settings'

type SidebarProps = {
  isOpen: boolean
  activePanel: PanelId
  onToggle: (panel: PanelId) => void
  topology: TopologyEntry[]
  activeTopologyIndex: number
  editorView: EditorView | null
  recentFiles: string[]
  onOpenRecent: (path: string) => void
  snippets: Snippet[]
  onSaveSnippets: (updated: Snippet[]) => void
  filePath: string | null
  timelineSnapshots: string[]
  selectedSnapshot: string | null
  snapshotPreviewContent: string | null
  currentWordCount: number
  onSelectSnapshot: (filename: string) => void
  onRestoreSnapshot: (filename: string) => void
  onRefreshTimeline: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  defaultViewMode: ViewMode
  onDefaultViewModeChange: (mode: ViewMode) => void
  onRegisterFileAssociation: () => void
  autoSaveInterval: number
  onAutoSaveIntervalChange: (v: number) => void
  accentColor: string
  onAccentColorChange: (color: string) => void
  editorFontSize: number
  onEditorFontSizeChange: (size: number) => void
  editorFontFamily: string
  onEditorFontFamilyChange: (family: string) => void
}

const PANEL_TITLES: Record<PanelId, string> = {
  outline: 'Outline',
  files: 'Recent Files',
  snippets: 'Snippets',
  studio: 'Snippet Studio',
  timeline: 'Version Timeline',
  settings: 'Settings',
}

const PANEL_TABS: { id: PanelId; title: string; Icon: typeof AlignLeft }[] = [
  { id: 'outline', title: 'Document Outline', Icon: AlignLeft },
  { id: 'files', title: 'Recent Files', Icon: Clock },
  { id: 'snippets', title: 'Snippets', Icon: Scissors },
  { id: 'studio', title: 'Snippet Studio', Icon: Wand2 },
  { id: 'timeline', title: 'Version Timeline', Icon: History },
  { id: 'settings', title: 'Settings', Icon: SettingsIcon },
]

type RailButtonProps = {
  Icon: typeof AlignLeft
  title: string
  active: boolean
  onClick: () => void
}

function RailButton({ Icon, title, active, onClick }: RailButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-full flex items-center justify-center hover:cursor-pointer transition-colors"
      style={{
        height: 40,
        color: active ? 'var(--accent)' : 'var(--text-primary)',
        backgroundColor: active ? 'var(--bg-elevated)' : 'transparent',
        border: 'none',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <Icon size={18} strokeWidth={1.75} />
    </button>
  )
}

export default function Sidebar({
  isOpen,
  activePanel,
  onToggle,
  topology,
  activeTopologyIndex,
  editorView,
  recentFiles,
  onOpenRecent,
  snippets,
  onSaveSnippets,
  filePath,
  timelineSnapshots,
  selectedSnapshot,
  snapshotPreviewContent,
  currentWordCount,
  onSelectSnapshot,
  onRestoreSnapshot,
  onRefreshTimeline,
  theme,
  onThemeChange,
  defaultViewMode,
  onDefaultViewModeChange,
  onRegisterFileAssociation,
  autoSaveInterval,
  onAutoSaveIntervalChange,
  accentColor,
  onAccentColorChange,
  editorFontSize,
  onEditorFontSizeChange,
  editorFontFamily,
  onEditorFontFamilyChange,
}: SidebarProps) {
  return (
    <div className="flex" style={{ flexShrink: 0 }}>
      {/* Icon rail */}
      <div
        className="flex flex-col"
        style={{
          width: 40,
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {PANEL_TABS.map((tab) => (
          <RailButton
            key={tab.id}
            Icon={tab.Icon}
            title={tab.title}
            active={isOpen && activePanel === tab.id}
            onClick={() => onToggle(tab.id)}
          />
        ))}
      </div>

      {/* Panel content */}
      {isOpen && (
        <div
          className="flex flex-col"
          style={{
            width: 240,
            backgroundColor: 'var(--bg-primary)',
            borderRight: '1px solid var(--border)',
          }}
        >
          <div
            className="px-3 py-2 text-xs uppercase tracking-wider"
            style={{
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border)',
              fontWeight: 600,
            }}
          >
            {PANEL_TITLES[activePanel]}
          </div>
          <div className="flex-1 overflow-y-auto">
            {activePanel === 'outline' && (
              <TopologyPanel
                topology={topology}
                activeIndex={activeTopologyIndex}
                editorView={editorView}
              />
            )}
            {activePanel === 'files' && (
              <FilesPanel recentFiles={recentFiles} onOpen={onOpenRecent} />
            )}
            {activePanel === 'snippets' && (
              <SnippetsPanel snippets={snippets} editorView={editorView} />
            )}
            {activePanel === 'studio' && (
              <SnippetStudioPanel snippets={snippets} onSave={onSaveSnippets} />
            )}
            {activePanel === 'timeline' && (
              <TimelinePanel
                filePath={filePath}
                snapshots={timelineSnapshots}
                selectedSnapshot={selectedSnapshot}
                previewContent={snapshotPreviewContent}
                currentWordCount={currentWordCount}
                onSelect={onSelectSnapshot}
                onRestore={onRestoreSnapshot}
                onRefresh={onRefreshTimeline}
              />
            )}
            {activePanel === 'settings' && (
              <SettingsPanel
                theme={theme}
                onThemeChange={onThemeChange}
                defaultViewMode={defaultViewMode}
                onDefaultViewModeChange={onDefaultViewModeChange}
                onRegisterFileAssociation={onRegisterFileAssociation}
                autoSaveInterval={autoSaveInterval}
                onAutoSaveIntervalChange={onAutoSaveIntervalChange}
                accentColor={accentColor}
                onAccentColorChange={onAccentColorChange}
                editorFontSize={editorFontSize}
                onEditorFontSizeChange={onEditorFontSizeChange}
                editorFontFamily={editorFontFamily}
                onEditorFontFamilyChange={onEditorFontFamilyChange}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
