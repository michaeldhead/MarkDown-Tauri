import type { EditorView } from '@codemirror/view'
import {
  Bold,
  Code,
  Columns2,
  Download,
  ExternalLink,
  Eye,
  FilePlus,
  FolderOpen,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  PenLine,
  Quote,
  Save,
  SaveAll,
  SquareCode,
  Strikethrough,
  Table as TableIcon,
  X,
} from 'lucide-react'
import {
  insertHorizontalRule,
  insertImage,
  insertLink,
  insertLinePrefix,
  insertTable,
  wrapSelection,
} from '../lib/editorCommands'

type ViewMode = 'write' | 'split' | 'preview'

const ICON_SIZE = 14

type IconType = typeof Bold

type BtnProps = {
  Icon: IconType
  title: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}

function Btn({ Icon, title, active, disabled, onClick }: BtnProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`toolbar-btn${active ? ' toolbar-btn-active' : ''}`}
    >
      <Icon size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}

function Sep() {
  return <div className="toolbar-sep" />
}

type ToolbarProps = {
  viewMode: ViewMode
  onChangeViewMode: (mode: ViewMode) => void
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onInsertCodeBlock: () => void
  onExport: () => void
  onOpenPreviewWindow: () => void
  onClosePreviewWindow: () => void
  previewDetached: boolean
  editorView: EditorView | null
}

export default function Toolbar({
  viewMode,
  onChangeViewMode,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onInsertCodeBlock,
  onExport,
  onOpenPreviewWindow,
  onClosePreviewWindow,
  previewDetached,
  editorView,
}: ToolbarProps) {
  const editorReady = editorView !== null
  const run = (fn: (view: EditorView) => void) => () => {
    if (editorView) fn(editorView)
  }

  return (
    <div
      className="flex items-center px-2"
      style={{
        height: 40,
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="toolbar-group">
        <Btn Icon={FilePlus} title="New (Ctrl+N)" onClick={onNew} />
        <Btn Icon={FolderOpen} title="Open (Ctrl+O)" onClick={onOpen} />
        <Btn Icon={Save} title="Save (Ctrl+S)" onClick={onSave} />
        <Btn Icon={SaveAll} title="Save As (Ctrl+Shift+S)" onClick={onSaveAs} />
      </div>
      <Sep />

      <div className="toolbar-group">
        <Btn
          Icon={Heading1}
          title="Heading 1"
          disabled={!editorReady}
          onClick={run((v) => insertLinePrefix(v, '# '))}
        />
        <Btn
          Icon={Heading2}
          title="Heading 2"
          disabled={!editorReady}
          onClick={run((v) => insertLinePrefix(v, '## '))}
        />
        <Btn
          Icon={Heading3}
          title="Heading 3"
          disabled={!editorReady}
          onClick={run((v) => insertLinePrefix(v, '### '))}
        />
        <Btn
          Icon={Heading4}
          title="Heading 4"
          disabled={!editorReady}
          onClick={run((v) => insertLinePrefix(v, '#### '))}
        />
        <Btn
          Icon={Heading5}
          title="Heading 5"
          disabled={!editorReady}
          onClick={run((v) => insertLinePrefix(v, '##### '))}
        />
        <Btn
          Icon={Heading6}
          title="Heading 6"
          disabled={!editorReady}
          onClick={run((v) => insertLinePrefix(v, '###### '))}
        />
      </div>
      <Sep />

      <div className="toolbar-group">
        <Btn
          Icon={Bold}
          title="Bold (Ctrl+B)"
          disabled={!editorReady}
          onClick={run((v) => wrapSelection(v, '**'))}
        />
        <Btn
          Icon={Italic}
          title="Italic (Ctrl+I)"
          disabled={!editorReady}
          onClick={run((v) => wrapSelection(v, '_'))}
        />
        <Btn
          Icon={Strikethrough}
          title="Strikethrough"
          disabled={!editorReady}
          onClick={run((v) => wrapSelection(v, '~~'))}
        />
        <Btn
          Icon={Code}
          title="Inline Code (Ctrl+`)"
          disabled={!editorReady}
          onClick={run((v) => wrapSelection(v, '`'))}
        />
      </div>
      <Sep />

      <div className="toolbar-group">
        <Btn
          Icon={SquareCode}
          title="Code Block (Ctrl+Shift+K)"
          disabled={!editorReady}
          onClick={onInsertCodeBlock}
        />
        <Btn
          Icon={Quote}
          title="Blockquote"
          disabled={!editorReady}
          onClick={run((v) => insertLinePrefix(v, '> '))}
        />
        <Btn
          Icon={Minus}
          title="Horizontal Rule"
          disabled={!editorReady}
          onClick={run(insertHorizontalRule)}
        />
        <Btn
          Icon={TableIcon}
          title="Table"
          disabled={!editorReady}
          onClick={run(insertTable)}
        />
      </div>
      <Sep />

      <div className="toolbar-group">
        <Btn
          Icon={LinkIcon}
          title="Link (Ctrl+K)"
          disabled={!editorReady}
          onClick={run(insertLink)}
        />
        <Btn
          Icon={ImageIcon}
          title="Image"
          disabled={!editorReady}
          onClick={run(insertImage)}
        />
      </div>
      <Sep />

      <div className="toolbar-group">
        <Btn
          Icon={List}
          title="Unordered List"
          disabled={!editorReady}
          onClick={run((v) => insertLinePrefix(v, '- '))}
        />
        <Btn
          Icon={ListOrdered}
          title="Ordered List"
          disabled={!editorReady}
          onClick={run((v) => insertLinePrefix(v, '1. '))}
        />
      </div>

      <div className="toolbar-group" style={{ marginLeft: 'auto' }}>
        <Btn
          Icon={PenLine}
          title="Write Mode"
          active={viewMode === 'write'}
          onClick={() => onChangeViewMode('write')}
        />
        <Btn
          Icon={Columns2}
          title="Split Mode"
          active={viewMode === 'split'}
          onClick={() => onChangeViewMode('split')}
        />
        <Btn
          Icon={Eye}
          title="Preview Mode"
          active={viewMode === 'preview'}
          onClick={() => onChangeViewMode('preview')}
        />
      </div>
      <Sep />

      <div className="toolbar-group" style={{ paddingRight: 8 }}>
        {viewMode === 'split' && !previewDetached && (
          <Btn
            Icon={ExternalLink}
            title="Pop out preview"
            onClick={onOpenPreviewWindow}
          />
        )}
        {previewDetached && (
          <Btn
            Icon={X}
            title="Close preview window"
            onClick={onClosePreviewWindow}
          />
        )}
        <Btn
          Icon={Download}
          title="Export (Ctrl+Shift+E)"
          onClick={onExport}
        />
      </div>
    </div>
  )
}
