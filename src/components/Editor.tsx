import CodeMirror, {
  EditorView,
  type Extension,
  type Statistics,
} from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { useMemo, type MouseEvent as ReactMouseEvent } from 'react'
import { getCodeBlockLanguageAtPos } from '../lib/editorCommands'
import { ghsDarkTheme, ghsInkTheme } from '../lib/editorThemes'

type Theme = 'dark' | 'ink'

type EditorProps = {
  value: string
  onChange: (value: string) => void
  onCreateEditor?: (view: EditorView) => void
  onStatistics?: (data: Statistics) => void
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void
  onOpenLangPicker?: (mode: 'insert' | 'replace', fenceLine?: number) => void
  onContextMenu?: () => void
  theme?: Theme
  wordWrap?: boolean
  showLineNumbers?: boolean
  fontSize?: number
  fontFamily?: string
}

export default function Editor({
  value,
  onChange,
  onCreateEditor,
  onStatistics,
  onScroll,
  onOpenLangPicker,
  onContextMenu,
  theme = 'dark',
  wordWrap = true,
  showLineNumbers = true,
  fontSize = 14,
  fontFamily = "'Cascadia Code', Consolas, monospace",
}: EditorProps) {
  const extensions = useMemo<Extension[]>(() => {
    const themeExtension = theme === 'dark' ? ghsDarkTheme : ghsInkTheme
    const base: Extension[] = [markdown(), themeExtension]
    if (wordWrap) {
      base.push(EditorView.lineWrapping)
    }
    if (onScroll) {
      base.push(
        EditorView.domEventHandlers({
          scroll(_event, view) {
            onScroll(
              view.scrollDOM.scrollTop,
              view.scrollDOM.scrollHeight,
              view.scrollDOM.clientHeight,
            )
          },
        }),
      )
    }
    if (onOpenLangPicker) {
      base.push(
        EditorView.domEventHandlers({
          click(event, view) {
            const pos = view.posAtCoords({
              x: event.clientX,
              y: event.clientY,
            })
            if (pos === null) return false
            const lang = getCodeBlockLanguageAtPos(view, pos)
            if (lang !== null) {
              const fenceLine = view.state.doc.lineAt(pos).number
              // Defer so the click resolves visually before the modal mounts.
              window.setTimeout(
                () => onOpenLangPicker('replace', fenceLine),
                0,
              )
            }
            return false
          },
        }),
      )
    }
    return base
  }, [theme, wordWrap, onScroll, onOpenLangPicker])

  // Suppress the WebView2 default context menu and delegate to the
  // native Tauri popup driven by App.tsx. Wrapping at the host div is
  // sufficient — CodeMirror does not stopPropagation on contextmenu.
  const handleContextMenu = onContextMenu
    ? (e: ReactMouseEvent) => {
        e.preventDefault()
        onContextMenu()
      }
    : undefined

  return (
    <div
      style={{
        height: '100%',
        fontSize: `${fontSize}px`,
        fontFamily,
      }}
      onContextMenu={handleContextMenu}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        onCreateEditor={onCreateEditor}
        onStatistics={onStatistics}
        extensions={extensions}
        height="100%"
        style={{ height: '100%', backgroundColor: 'var(--editor-bg)' }}
        basicSetup={{
          lineNumbers: showLineNumbers,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          autocompletion: true,
        }}
      />
    </div>
  )
}
