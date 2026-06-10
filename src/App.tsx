import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LazyStore } from '@tauri-apps/plugin-store'
import type { EditorView, Statistics } from '@uiw/react-codemirror'

import Toolbar from './components/Toolbar'
import Editor from './components/Editor'
import PreviewPane from './components/PreviewPane'
import StatusBar from './components/StatusBar'
import Sidebar, { type PanelId } from './components/Sidebar'
import SmartGutter from './components/SmartGutter'
import CommandPalette from './components/CommandPalette'
import LanguagePicker from './components/LanguagePicker'
import ExportDialog from './components/ExportDialog'
import AboutModal from './components/AboutModal'
import HelpModal from './components/HelpModal'
import TabBar from './components/TabBar'
import PreviewWindowApp from './components/PreviewWindowApp'
import { newTab, type Tab } from './lib/tabs'
import {
  insertBlankCodeBlock,
  insertCodeBlockWithLanguage,
  insertLinePrefix,
  insertSnippet,
  insertTable,
  replaceCodeBlockLanguage,
  scrollToLine,
  wrapSelection,
} from './lib/editorCommands'
import type { PaletteItem } from './lib/palette'
import { buildTopology, countWords, getActiveSectionIndex } from './lib/outline'
import { slugFromPath, snapshotFilename } from './lib/timeline'
import {
  renderMarkdown,
  wrapAsCleanHtml,
  wrapAsPrintHtml,
  wrapAsStyledHtml,
  wrapAsWordHtml,
} from './lib/preview'
import { DEFAULT_SNIPPETS, type Snippet } from './lib/snippets'

import {
  applyTheme,
  DEFAULT_ACCENT,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  type Theme,
} from './lib/theme'
import {
  getEditorTopSourceLine,
  syncEditorToPreviewScroll,
  syncPreviewToEditorLine,
} from './lib/scrollSync'

type ViewMode = 'write' | 'split' | 'preview'

type DialogFilter = { name: string; extensions: string[] }

const DRAFT_DEBOUNCE_MS = 1000
const STORE_FILE = 'settings.json'
const STORE_KEY_SPLIT_RATIO = 'splitRatio'
const STORE_KEY_DEFAULT_VIEW_MODE = 'defaultViewMode'
const STORE_KEY_THEME = 'theme'
const STORE_KEY_SIDEBAR_OPEN = 'sidebarOpen'
const STORE_KEY_ACTIVE_PANEL = 'activePanel'
const STORE_KEY_RECENT_FILES = 'recentFiles'
const STORE_KEY_SNIPPETS = 'snippets'
const STORE_KEY_OPEN_FILES = 'openFiles'
const STORE_KEY_ACTIVE_FILE = 'activeFilePath'
const STORE_KEY_FILE_ASSOC_PROMPT_SHOWN = 'fileAssocPromptShown'
const STORE_KEY_WORD_WRAP = 'wordWrap'
const STORE_KEY_SHOW_LINE_NUMBERS = 'showLineNumbers'
const STORE_KEY_AUTOSAVE = 'autoSaveInterval'
const STORE_KEY_ACCENT_COLOR = 'accentColor'
const STORE_KEY_FONT_SIZE = 'editorFontSize'
const STORE_KEY_FONT_FAMILY = 'editorFontFamily'
const RECENT_FILES_MAX = 20

// Auto-save interval in seconds. 0 = Off (no timer set).
type AutoSaveInterval = 0 | 30 | 60 | 120 | 300
const AUTOSAVE_VALID: readonly AutoSaveInterval[] = [0, 30, 60, 120, 300]

function basename(path: string): string {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

function stripExt(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}

function joinPath(dir: string, file: string): string {
  if (!dir) return file
  const trimmed = dir.replace(/[\\/]+$/, '')
  const sep = trimmed.includes('\\') ? '\\' : '/'
  return `${trimmed}${sep}${file}`
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// Detected once at module load — same for both windows since each has its
// own `window.location`. Cheap, avoids re-evaluating in every render.
const IS_PREVIEW_WINDOW =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('preview') === 'true'

export default function App() {
  if (IS_PREVIEW_WINDOW) {
    return <PreviewWindowApp />
  }
  return <MainWindowApp />
}

function MainWindowApp() {
  const [tabs, setTabs] = useState<Tab[]>(() => [newTab()])
  const [activeTabId, setActiveTabId] = useState<string>('')
  // Sync the empty initial activeTabId once on mount.
  useEffect(() => {
    if (!activeTabId && tabs.length > 0) setActiveTabId(tabs[0].id)
  }, [activeTabId, tabs])
  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId],
  )
  // Destructure the active-tab fields used by the rest of the file. Keeping
  // the original names lets every existing reader stay unchanged; only the
  // setter call sites need to switch to updateActiveTab().
  const { content, filePath, isDirty } = activeTab
  const line = activeTab.cursorLine
  const col = activeTab.cursorCol
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [splitRatio, setSplitRatio] = useState<number>(50)
  const [isDragOver, setIsDragOver] = useState<boolean>(false)

  // ----- Tab mutation helpers (defined early so other callbacks can close over them) -----
  // updateActiveTab reads the latest active tab id via a ref so the callback
  // identity stays stable for the life of the component. Without this, every
  // dependent callback (handleStatistics, the keyboard handler, etc.) would
  // recreate on each tab switch and force CodeMirror reconfigures.
  const activeTabIdRef = useRef<string>('')
  useEffect(() => {
    activeTabIdRef.current = activeTabId
  }, [activeTabId])
  // Mirrors of the active tab's content/filePath/isDirty so callbacks that
  // run on a timer (auto-save) read the *latest* values, not closure values
  // captured when the interval was created.
  const activeContentRef = useRef<string>('')
  const activeFilePathRef = useRef<string | null>(null)
  const activeIsDirtyRef = useRef<boolean>(false)
  const updateActiveTab = useCallback((updates: Partial<Tab>) => {
    const id = activeTabIdRef.current
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])
  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])
  // setContent/setFilePath/setIsDirty shims keep the rest of the file's setter
  // call sites readable while they all route through updateActiveTab.
  const setContent = useCallback(
    (value: string) => updateActiveTab({ content: value }),
    [updateActiveTab],
  )
  const setFilePath = useCallback(
    (value: string | null) => updateActiveTab({ filePath: value }),
    [updateActiveTab],
  )
  const setIsDirty = useCallback(
    (value: boolean) => updateActiveTab({ isDirty: value }),
    [updateActiveTab],
  )
  const setLine = useCallback(
    (value: number) => updateActiveTab({ cursorLine: value }),
    [updateActiveTab],
  )
  const setCol = useCallback(
    (value: number) => updateActiveTab({ cursorCol: value }),
    [updateActiveTab],
  )
  const [editorView, setEditorView] = useState<EditorView | null>(null)
  const [theme, setTheme] = useState<Theme>('dark')
  const [defaultViewMode, setDefaultViewMode] = useState<ViewMode>('split')
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
  const [activePanel, setActivePanel] = useState<PanelId>('outline')
  const [recentFiles, setRecentFiles] = useState<string[]>([])
  const [snippets, setSnippets] = useState<Snippet[]>(DEFAULT_SNIPPETS)
  const [editorScrollRatio, setEditorScrollRatio] = useState<number>(0)
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false)
  const [langPickerOpen, setLangPickerOpen] = useState<boolean>(false)
  const [langPickerMode, setLangPickerMode] = useState<'insert' | 'replace'>('insert')
  const [exportOpen, setExportOpen] = useState<boolean>(false)
  const [aboutOpen, setAboutOpen] = useState<boolean>(false)
  const [helpOpen, setHelpOpen] = useState<boolean>(false)
  const [previewDetached, setPreviewDetached] = useState<boolean>(false)
  const [wordWrap, setWordWrap] = useState<boolean>(true)
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true)
  const [autoSaveInterval, setAutoSaveInterval] = useState<AutoSaveInterval>(0)
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_ACCENT)
  const [editorFontSize, setEditorFontSize] = useState<number>(DEFAULT_FONT_SIZE)
  const [editorFontFamily, setEditorFontFamily] = useState<string>(DEFAULT_FONT_FAMILY)
  const [codeBlockFenceLine, setCodeBlockFenceLine] = useState<number | null>(null)
  const [timelineSnapshots, setTimelineSnapshots] = useState<string[]>([])
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)
  const [snapshotPreviewContent, setSnapshotPreviewContent] = useState<string | null>(null)
  const [snapshotTick, setSnapshotTick] = useState<number>(0)

  const previewRef = useRef<HTMLDivElement | null>(null)
  const splitContainerRef = useRef<HTMLDivElement | null>(null)
  const isSyncingScroll = useRef<boolean>(false)
  // previewDetached read inside handleEditorScroll; using a ref keeps the
  // callback identity stable so editorPane doesn't recompute when the
  // detach state toggles.
  const previewDetachedRef = useRef<boolean>(false)
  const draftTimer = useRef<number | null>(null)
  const appDataDir = useRef<string | null>(null)
  const draftPath = useRef<string | null>(null)
  const settingsLoaded = useRef<boolean>(false)
  const settingsStore = useRef<LazyStore | null>(null)
  const tabRestoredFromStore = useRef<boolean>(false)

  // ----- One-time setup -----
  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const dir = await invoke<string>('get_app_data_dir')
        if (!mounted) return
        appDataDir.current = dir
        draftPath.current = joinPath(dir, 'draft.md')
      } catch (err) {
        console.warn('Failed to resolve app data dir:', err)
      }

      try {
        const store = new LazyStore(STORE_FILE)
        settingsStore.current = store

        const ratio = await store.get<number>(STORE_KEY_SPLIT_RATIO)
        const dvm = await store.get<ViewMode>(STORE_KEY_DEFAULT_VIEW_MODE)
        const storedTheme = await store.get<Theme>(STORE_KEY_THEME)
        const sbOpen = await store.get<boolean>(STORE_KEY_SIDEBAR_OPEN)
        const ap = await store.get<PanelId>(STORE_KEY_ACTIVE_PANEL)
        const rf = await store.get<string[]>(STORE_KEY_RECENT_FILES)
        const stored = await store.get<Snippet[]>(STORE_KEY_SNIPPETS)
        const storedWordWrap = await store.get<boolean>(STORE_KEY_WORD_WRAP)
        const storedLineNumbers = await store.get<boolean>(STORE_KEY_SHOW_LINE_NUMBERS)
        const storedAutoSave = await store.get<number>(STORE_KEY_AUTOSAVE)
        const storedAccent = await store.get<string>(STORE_KEY_ACCENT_COLOR)
        const storedFontSize = await store.get<number>(STORE_KEY_FONT_SIZE)
        const storedFontFamily = await store.get<string>(STORE_KEY_FONT_FAMILY)

        if (!mounted) return
        if (typeof storedWordWrap === 'boolean') setWordWrap(storedWordWrap)
        if (typeof storedLineNumbers === 'boolean') setShowLineNumbers(storedLineNumbers)
        if (
          typeof storedAutoSave === 'number' &&
          (AUTOSAVE_VALID as readonly number[]).includes(storedAutoSave)
        ) {
          setAutoSaveInterval(storedAutoSave as AutoSaveInterval)
        }
        if (typeof ratio === 'number') setSplitRatio(clamp(ratio, 20, 80))
        if (dvm === 'write' || dvm === 'split' || dvm === 'preview') {
          setDefaultViewMode(dvm)
          setViewMode(dvm)
        }
        // Validate accent + font settings before resolving the theme so the
        // first applyTheme() call can use the user's chosen accent in one
        // pass, avoiding a brief flash of the default blue.
        const resolvedAccent =
          typeof storedAccent === 'string' && storedAccent.startsWith('#')
            ? storedAccent
            : DEFAULT_ACCENT
        if (resolvedAccent !== DEFAULT_ACCENT) setAccentColor(resolvedAccent)
        if (
          typeof storedFontSize === 'number' &&
          storedFontSize >= FONT_SIZE_MIN &&
          storedFontSize <= FONT_SIZE_MAX
        ) {
          setEditorFontSize(storedFontSize)
        }
        if (typeof storedFontFamily === 'string' && storedFontFamily.length > 0) {
          setEditorFontFamily(storedFontFamily)
        }
        if (storedTheme === 'dark' || storedTheme === 'ink') {
          setTheme(storedTheme)
          applyTheme(storedTheme, resolvedAccent)
        } else {
          // No stored theme; apply the default theme with the resolved
          // accent so the accent variable lands on first paint.
          applyTheme('dark', resolvedAccent)
        }
        if (typeof sbOpen === 'boolean') setSidebarOpen(sbOpen)
        if (
          ap === 'outline' ||
          ap === 'files' ||
          ap === 'snippets' ||
          ap === 'studio' ||
          ap === 'timeline' ||
          ap === 'settings'
        ) {
          setActivePanel(ap)
        }
        if (Array.isArray(stored) && stored.length > 0) {
          setSnippets(stored)
        }

        // Restore previously-open saved-file tabs. Only paths that still
        // exist on disk are restored. If anything was restored, the initial
        // [newTab()] is replaced and the draft.md restoration below is skipped
        // (its purpose is recovering an unsaved Untitled buffer; that's
        // unrelated to multi-tab session restore).
        const openFilesStored = await store.get<string[]>(STORE_KEY_OPEN_FILES)
        const activeFileStored = await store.get<string>(STORE_KEY_ACTIVE_FILE)
        if (Array.isArray(openFilesStored) && openFilesStored.length > 0) {
          const restored: Tab[] = []
          for (const path of openFilesStored) {
            if (typeof path !== 'string' || !path) continue
            try {
              const exists = await invoke<boolean>('path_exists', { path })
              if (!exists) continue
              const text = await invoke<string>('read_file', { path })
              restored.push(
                newTab({ filePath: path, content: text, isDirty: false }),
              )
            } catch (err) {
              console.warn('Failed to restore tab for path:', path, err)
            }
          }
          if (!mounted) return
          if (restored.length > 0) {
            setTabs(restored)
            const activeMatch =
              typeof activeFileStored === 'string'
                ? restored.find((t) => t.filePath === activeFileStored)
                : undefined
            const activeRestored = activeMatch ?? restored[0]
            setActiveTabId(activeRestored.id)
            // Sync the refs eagerly so the cold-launch openFileByPath call
            // below sees the post-restore tab state. Without this manual
            // sync, the tabs/activeTabId refs only update after React's
            // next render commit + the refs-sync useEffect, which runs
            // strictly after this async closure completes.
            tabsRef.current = restored
            activeTabIdRef.current = activeRestored.id
            tabRestoredFromStore.current = true
          }
          // Persist the cleaned-up list back so missing paths don't accumulate.
          const validPaths = restored
            .map((t) => t.filePath)
            .filter((p): p is string => typeof p === 'string')
          if (validPaths.length !== openFilesStored.length) {
            await store.set(STORE_KEY_OPEN_FILES, validPaths)
            await store.save()
          }
        }

        // Recent files: prune missing paths
        if (Array.isArray(rf) && rf.length > 0) {
          const checks = await Promise.all(
            rf.map(async (p) =>
              typeof p === 'string'
                ? ((await invoke<boolean>('path_exists', { path: p })) ? p : null)
                : null,
            ),
          )
          const valid = checks.filter((p): p is string => p !== null)
          if (!mounted) return
          setRecentFiles(valid)
          if (valid.length !== rf.length) {
            await store.set(STORE_KEY_RECENT_FILES, valid)
            await store.save()
          }
        }
      } catch (err) {
        console.warn('Failed to load settings store:', err)
      } finally {
        settingsLoaded.current = true
      }

      // Draft restore — only when no saved-tab session was restored. With
      // multi-tab persistence, the user's saved tabs already came back; the
      // draft.md mechanism stays as the recovery path for the single-Untitled
      // case (no saved tabs to restore).
      if (draftPath.current && !tabRestoredFromStore.current) {
        try {
          const draftText = await invoke<string>('read_file', { path: draftPath.current })
          if (!mounted) return
          if (typeof draftText === 'string' && draftText.length > 0) {
            setContent(draftText)
            setIsDirty(true)
          }
        } catch {
          // No draft yet — silently ignore.
        }
      }

      // First-launch .md file-association prompt. Inlined here so it runs
      // exactly once after the settings store is loaded — separating it into
      // its own effect would require a state flag (since `settingsLoaded` is
      // a ref) and an extra render.
      if (settingsStore.current) {
        try {
          const store = settingsStore.current
          const prompted = await store.get<boolean>(STORE_KEY_FILE_ASSOC_PROMPT_SHOWN)
          if (!prompted) {
            const alreadyRegistered = await invoke<boolean>('check_file_association')
            if (alreadyRegistered) {
              await store.set(STORE_KEY_FILE_ASSOC_PROMPT_SHOWN, true)
              await store.save()
            } else {
              const { ask } = await import('@tauri-apps/plugin-dialog')
              const yes = await ask(
                'This can be changed later in Windows Settings → Default Apps.',
                {
                  title:
                    'Register GHS Markdown Editor as the default app for .md files?',
                  kind: 'info',
                  okLabel: 'Yes',
                  cancelLabel: 'No',
                },
              )
              await store.set(STORE_KEY_FILE_ASSOC_PROMPT_SHOWN, true)
              await store.save()
              if (yes) {
                try {
                  await invoke('register_file_association')
                } catch (err) {
                  console.warn('File association registration failed:', err)
                }
              }
            }
          }
        } catch (err) {
          console.warn('File association prompt failed:', err)
        }
      }

      // Cold-launch arg open. Runs inside the one-time setup closure so it
      // sequences strictly AFTER the store restore — otherwise the absolute
      // setTabs(restored) above can clobber the file we just opened (the bug
      // diagnosed during Fix-N2: cold launch via file association opens the
      // app but the file doesn't load). The eager refs-sync above ensures
      // openFileByPath sees the post-restore tab list when deciding whether
      // to reuse an empty Untitled or add a new tab.
      try {
        const launchPath = await invoke<string | null>('take_launch_arg')
        if (mounted && launchPath) {
          await openFileByPath(launchPath)
        }
      } catch (err) {
        console.warn('take_launch_arg failed:', err)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  // ----- Theme + accent -----
  // Re-applies CSS variables whenever theme or accentColor change. Also
  // persists both — bundling the two into one effect keeps the call to
  // applyTheme atomic (theme tokens + accent override land in the same
  // commit), avoiding a one-frame flash of the wrong accent when only the
  // theme changes.
  useEffect(() => {
    applyTheme(theme, accentColor)
    if (!settingsLoaded.current || !settingsStore.current) return
    const store = settingsStore.current
    void (async () => {
      try {
        await store.set(STORE_KEY_THEME, theme)
        await store.set(STORE_KEY_ACCENT_COLOR, accentColor)
        await store.save()
      } catch (err) {
        console.warn('Failed to persist theme/accent:', err)
      }
    })()
  }, [theme, accentColor])

  // ----- Editor font (size + family) persistence -----
  useEffect(() => {
    if (!settingsLoaded.current || !settingsStore.current) return
    const store = settingsStore.current
    void (async () => {
      try {
        await store.set(STORE_KEY_FONT_SIZE, editorFontSize)
        await store.set(STORE_KEY_FONT_FAMILY, editorFontFamily)
        await store.save()
      } catch (err) {
        console.warn('Failed to persist editor font settings:', err)
      }
    })()
  }, [editorFontSize, editorFontFamily])

  // ----- Default view mode persistence -----
  useEffect(() => {
    if (!settingsLoaded.current || !settingsStore.current) return
    const store = settingsStore.current
    void (async () => {
      try {
        await store.set(STORE_KEY_DEFAULT_VIEW_MODE, defaultViewMode)
        await store.save()
      } catch (err) {
        console.warn('Failed to persist defaultViewMode:', err)
      }
    })()
  }, [defaultViewMode])

  // ----- Sidebar state persistence -----
  useEffect(() => {
    if (!settingsLoaded.current || !settingsStore.current) return
    const store = settingsStore.current
    void (async () => {
      try {
        await store.set(STORE_KEY_SIDEBAR_OPEN, sidebarOpen)
        await store.set(STORE_KEY_ACTIVE_PANEL, activePanel)
        await store.save()
      } catch (err) {
        console.warn('Failed to persist sidebar state:', err)
      }
    })()
  }, [sidebarOpen, activePanel])

  // ----- Editor toggles persistence (word wrap + line numbers) -----
  useEffect(() => {
    if (!settingsLoaded.current || !settingsStore.current) return
    const store = settingsStore.current
    void (async () => {
      try {
        await store.set(STORE_KEY_WORD_WRAP, wordWrap)
        await store.set(STORE_KEY_SHOW_LINE_NUMBERS, showLineNumbers)
        await store.save()
      } catch (err) {
        console.warn('Failed to persist editor toggles:', err)
      }
    })()
  }, [wordWrap, showLineNumbers])

  // ----- Auto-save interval persistence -----
  useEffect(() => {
    if (!settingsLoaded.current || !settingsStore.current) return
    const store = settingsStore.current
    void (async () => {
      try {
        await store.set(STORE_KEY_AUTOSAVE, autoSaveInterval)
        await store.save()
      } catch (err) {
        console.warn('Failed to persist autoSaveInterval:', err)
      }
    })()
  }, [autoSaveInterval])

  // ----- Open-tab list persistence -----
  // Only saved-file tabs are persisted; Untitled / unsaved tabs are not.
  // Active file path is tracked so the same tab can be re-activated on launch.
  useEffect(() => {
    if (!settingsLoaded.current || !settingsStore.current) return
    const store = settingsStore.current
    const openFiles = tabs
      .map((t) => t.filePath)
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
    const activePath =
      tabs.find((t) => t.id === activeTabId)?.filePath ?? null
    void (async () => {
      try {
        await store.set(STORE_KEY_OPEN_FILES, openFiles)
        await store.set(STORE_KEY_ACTIVE_FILE, activePath)
        await store.save()
      } catch (err) {
        console.warn('Failed to persist open-tab list:', err)
      }
    })()
  }, [tabs, activeTabId])

  // ----- Title bar -----
  useEffect(() => {
    const win = getCurrentWindow()
    const base = filePath ? basename(filePath) : null
    const title = base
      ? `${isDirty ? '* ' : ''}${base} — GHS Markdown Editor`
      : 'GHS Markdown Editor'
    void win.setTitle(title)
  }, [filePath, isDirty])

  // ----- Persist splitRatio -----
  const persistSplitRatio = useCallback(async (ratio: number) => {
    const store = settingsStore.current
    if (!store) return
    try {
      await store.set(STORE_KEY_SPLIT_RATIO, ratio)
      await store.save()
    } catch (err) {
      console.warn('Failed to persist splitRatio:', err)
    }
  }, [])

  // ----- Draft auto-save -----
  useEffect(() => {
    if (!draftPath.current) return
    if (draftTimer.current !== null) {
      window.clearTimeout(draftTimer.current)
    }
    const path = draftPath.current
    const snapshot = content
    draftTimer.current = window.setTimeout(() => {
      void invoke('write_file', { path, content: snapshot }).catch((err) => {
        console.warn('Failed to write draft:', err)
      })
    }, DRAFT_DEBOUNCE_MS)
    return () => {
      if (draftTimer.current !== null) {
        window.clearTimeout(draftTimer.current)
        draftTimer.current = null
      }
    }
  }, [content])

  // ----- Version Timeline -----
  const refreshTimeline = useCallback(async (slug: string) => {
    try {
      const names = await invoke<string[]>('list_snapshots', { slug })
      setTimelineSnapshots([...names].reverse())
      setSelectedSnapshot(null)
      setSnapshotPreviewContent(null)
    } catch (err) {
      console.warn('list_snapshots failed:', err)
    }
  }, [])

  const handleSelectSnapshot = useCallback(
    async (filename: string) => {
      if (!filePath) return
      setSelectedSnapshot(filename)
      try {
        const text = await invoke<string>('read_snapshot', {
          slug: slugFromPath(filePath),
          filename,
        })
        setSnapshotPreviewContent(text)
      } catch (err) {
        console.warn('read_snapshot failed:', err)
        setSnapshotPreviewContent(null)
      }
    },
    [filePath],
  )

  const handleRestoreSnapshot = useCallback(async () => {
    if (snapshotPreviewContent === null) return
    try {
      const proceed = await invoke<boolean>('confirm_discard')
      if (!proceed) return
    } catch (err) {
      console.warn('confirm_discard failed:', err)
      return
    }
    setContent(snapshotPreviewContent)
    setIsDirty(true)
    setSelectedSnapshot(null)
    setSnapshotPreviewContent(null)
  }, [snapshotPreviewContent])

  const handleManualRefreshTimeline = useCallback(() => {
    if (!filePath) return
    void refreshTimeline(slugFromPath(filePath))
  }, [filePath, refreshTimeline])

  // Reset timeline state whenever the open file changes.
  useEffect(() => {
    setTimelineSnapshots([])
    setSelectedSnapshot(null)
    setSnapshotPreviewContent(null)
  }, [filePath])

  // Load (or refresh) the timeline whenever the panel opens, the file changes,
  // or a new snapshot lands (snapshotTick).
  useEffect(() => {
    if (activePanel === 'timeline' && sidebarOpen && filePath) {
      void refreshTimeline(slugFromPath(filePath))
    }
  }, [activePanel, sidebarOpen, filePath, snapshotTick, refreshTimeline])

  // ----- Snippet CRUD persistence -----
  const saveSnippets = useCallback(async (updated: Snippet[]) => {
    setSnippets(updated)
    const store = settingsStore.current
    if (!store) return
    try {
      await store.set(STORE_KEY_SNIPPETS, updated)
      await store.save()
    } catch (err) {
      console.warn('Failed to persist snippets:', err)
    }
  }, [])

  // Keep the active-tab-field mirrors in sync.
  useEffect(() => {
    activeContentRef.current = content
    activeFilePathRef.current = filePath
    activeIsDirtyRef.current = isDirty
  }, [content, filePath, isDirty])

  // ----- Auto-save (user-configurable interval) -----
  // The effect re-mounts whenever autoSaveInterval changes so the new timing
  // takes effect immediately. Interval of 0 means Off — no timer is set, so
  // there is no save activity until the user picks a non-zero interval.
  //
  // The active tab's fields are read via refs at fire time (not via closure)
  // so a tab switch mid-flight can never clear the wrong tab's dirty flag.
  useEffect(() => {
    if (autoSaveInterval === 0) return
    const id = window.setInterval(() => {
      const path = activeFilePathRef.current
      const c = activeContentRef.current
      const dirty = activeIsDirtyRef.current
      const tabId = activeTabIdRef.current
      if (!path || !dirty || !tabId) return
      void invoke('write_file', { path, content: c }).then(
        () => {
          if (
            activeFilePathRef.current === path &&
            activeContentRef.current === c &&
            activeTabIdRef.current === tabId
          ) {
            updateTab(tabId, { isDirty: false })
          }
        },
        (err) => console.warn('Auto-save failed:', err),
      )
    }, autoSaveInterval * 1000)
    return () => window.clearInterval(id)
  }, [autoSaveInterval, updateTab])

  // ----- Recent files -----
  const addRecentFile = useCallback(async (path: string) => {
    const store = settingsStore.current
    setRecentFiles((current) => {
      const next = [path, ...current.filter((p) => p !== path)].slice(0, RECENT_FILES_MAX)
      if (store) {
        void (async () => {
          try {
            await store.set(STORE_KEY_RECENT_FILES, next)
            await store.save()
          } catch (err) {
            console.warn('Failed to persist recentFiles:', err)
          }
        })()
      }
      return next
    })
  }, [])

  // ----- Tab operations -----
  const addTab = useCallback((tab: Tab) => {
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
  }, [])

  const selectTab = useCallback((id: string) => {
    setActiveTabId(id)
  }, [])

  // tabs is read via a ref inside callbacks below to avoid identity churn.
  const tabsRef = useRef<Tab[]>(tabs)
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  const closeTab = useCallback(
    async (id: string) => {
      const tab = tabsRef.current.find((t) => t.id === id)
      if (!tab) return
      if (tab.isDirty) {
        try {
          const proceed = await invoke<boolean>('confirm_discard')
          if (!proceed) return
        } catch {
          return
        }
      }
      // Best-effort: clear this tab's per-tab draft file (if we ever wrote one).
      if (appDataDir.current) {
        const path = joinPath(appDataDir.current, `draft-${id}.md`)
        void invoke('write_file', { path, content: '' }).catch(() => {})
      }
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id)
        if (next.length === 0) {
          const fresh = newTab()
          setActiveTabId(fresh.id)
          return [fresh]
        }
        if (activeTabIdRef.current === id) {
          const idx = prev.findIndex((t) => t.id === id)
          const newActive = next[Math.min(idx, next.length - 1)]
          setActiveTabId(newActive.id)
        }
        return next
      })
    },
    [],
  )

  // ----- File operations -----
  const openFileByPath = useCallback(
    async (path: string) => {
      try {
        // Already open in another tab? Just switch to it.
        const existing = tabsRef.current.find((t) => t.filePath === path)
        if (existing) {
          setActiveTabId(existing.id)
          await addRecentFile(path)
          return
        }
        const text = await invoke<string>('read_file', { path })
        const a = tabsRef.current.find((t) => t.id === activeTabIdRef.current)
        const reuse =
          a !== undefined &&
          a.filePath === null &&
          !a.isDirty &&
          a.content === ''
        if (reuse && a) {
          updateTab(a.id, { filePath: path, content: text, isDirty: false })
        } else {
          addTab(newTab({ filePath: path, content: text, isDirty: false }))
        }
        await addRecentFile(path)
      } catch (err) {
        console.error('Failed to open file by path:', err)
      }
    },
    [addRecentFile, addTab, updateTab],
  )

  const openFile = useCallback(async () => {
    try {
      const path = await invoke<string | null>('open_dialog')
      if (!path) return
      await openFileByPath(path)
    } catch (err) {
      console.error('Failed to open file:', err)
    }
  }, [openFileByPath])

  const saveFileAs = useCallback(async () => {
    try {
      const fileName = filePath ? basename(filePath) : 'untitled.md'
      const path = await invoke<string | null>('save_dialog', { defaultName: fileName })
      if (!path) return
      await invoke('write_file', { path, content })
      setFilePath(path)
      setIsDirty(false)
      await addRecentFile(path)
    } catch (err) {
      console.error('Failed to save file as:', err)
    }
  }, [content, filePath, addRecentFile])

  const saveFile = useCallback(async () => {
    if (!filePath) return saveFileAs()
    try {
      await invoke('write_file', { path: filePath, content })
      setIsDirty(false)
    } catch (err) {
      console.error('Failed to save file:', err)
      return
    }
    try {
      await invoke('write_snapshot', {
        slug: slugFromPath(filePath),
        filename: snapshotFilename(),
        content,
        maxKeep: 50,
      })
      setSnapshotTick((t) => t + 1)
    } catch (err) {
      console.warn('Snapshot write failed:', err)
    }
  }, [content, filePath, saveFileAs])

  const newFile = useCallback(() => {
    // Multi-tab: open a fresh Untitled tab; never disturb the current one.
    addTab(newTab())
  }, [addTab])

  // ----- Exports -----
  const saveExport = useCallback(
    async (defaultName: string, filters: DialogFilter[], body: string) => {
      try {
        const path = await invoke<string | null>('save_dialog', {
          defaultName,
          filters,
        })
        if (!path) return
        await invoke('write_file', { path, content: body })
      } catch (err) {
        console.error('Export failed:', err)
      }
    },
    [],
  )

  const exportTitleBase = useMemo(
    () => (filePath ? stripExt(basename(filePath)) : 'untitled'),
    [filePath],
  )

  const exportHtmlStyled = useCallback(async () => {
    const body = await renderMarkdown(content)
    const html = wrapAsStyledHtml(body, exportTitleBase)
    await saveExport(
      `${exportTitleBase}.html`,
      [{ name: 'HTML', extensions: ['html', 'htm'] }],
      html,
    )
  }, [content, exportTitleBase, saveExport])

  const exportHtmlClean = useCallback(async () => {
    const body = await renderMarkdown(content)
    const html = wrapAsCleanHtml(body, exportTitleBase)
    await saveExport(
      `${exportTitleBase}.html`,
      [{ name: 'HTML', extensions: ['html', 'htm'] }],
      html,
    )
  }, [content, exportTitleBase, saveExport])

  const exportPlainText = useCallback(async () => {
    await saveExport(
      `${exportTitleBase}.txt`,
      [{ name: 'Text', extensions: ['txt'] }],
      content,
    )
  }, [content, exportTitleBase, saveExport])

  const exportPdf = useCallback(async () => {
    try {
      // Pick the destination first so a cancel costs no rendering work.
      const outputPath = await invoke<string | null>('save_dialog', {
        defaultName: `${exportTitleBase}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })
      if (!outputPath) return

      // Render to print-styled HTML, then let the Rust side drive WebView2's
      // native PrintToPdf — no print dialog, straight to the chosen path.
      const body = await renderMarkdown(content)
      const html = wrapAsPrintHtml(body, exportTitleBase)
      await invoke('export_pdf_silent', { html, outputPath })
    } catch (err) {
      console.error('PDF export failed:', err)
      const { message } = await import('@tauri-apps/plugin-dialog')
      await message(`PDF export failed: ${String(err)}`, {
        title: 'Export Error',
        kind: 'error',
      })
    }
  }, [content, exportTitleBase])

  const exportDocx = useCallback(async () => {
    try {
      const outputPath = await invoke<string | null>('save_dialog', {
        defaultName: `${exportTitleBase}.docx`,
        filters: [{ name: 'Word Document', extensions: ['docx'] }],
      })
      if (!outputPath) return
      await invoke('export_docx', { path: outputPath, content })
    } catch (err) {
      console.error('DOCX export failed:', err)
      const { message } = await import('@tauri-apps/plugin-dialog')
      await message(`Word (.docx) export failed: ${String(err)}`, {
        title: 'Export Error',
        kind: 'error',
      })
    }
  }, [content, exportTitleBase])

  const exportWordHtml = useCallback(async () => {
    const body = await renderMarkdown(content)
    const html = wrapAsWordHtml(body, exportTitleBase)
    await saveExport(
      `${exportTitleBase}.doc`,
      [{ name: 'Word Document', extensions: ['doc'] }],
      html,
    )
  }, [content, exportTitleBase, saveExport])

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      console.error('Copy to clipboard failed:', err)
    }
  }, [content])

  // ----- Language picker (Code Block insert/replace) -----
  // openLangPicker is the low-level entry — used by the Editor click handler
  // to retag an existing fence line. The toolbar / Ctrl+Shift+K / palette use
  // openCodeBlockPicker, which inserts a blank fence first then opens the
  // picker in replace mode targeting the just-inserted opening line.
  const openLangPicker = useCallback(
    (mode: 'insert' | 'replace', fenceLine?: number) => {
      setLangPickerMode(mode)
      setCodeBlockFenceLine(fenceLine ?? null)
      setLangPickerOpen(true)
    },
    [],
  )

  const openCodeBlockPicker = useCallback(() => {
    if (!editorView) return
    // Capture the line number where the fence will land BEFORE inserting,
    // since the dispatch will move the cursor to the blank middle line.
    const fenceLine = editorView.state.doc
      .lineAt(editorView.state.selection.main.head)
      .number
    insertBlankCodeBlock(editorView)
    setCodeBlockFenceLine(fenceLine)
    setLangPickerMode('replace')
    setLangPickerOpen(true)
  }, [editorView])

  const handleLangSelect = useCallback(
    (language: string) => {
      setLangPickerOpen(false)
      if (!editorView) {
        setCodeBlockFenceLine(null)
        return
      }
      if (langPickerMode === 'insert') {
        insertCodeBlockWithLanguage(editorView, language)
      } else {
        replaceCodeBlockLanguage(
          editorView,
          language,
          codeBlockFenceLine ?? undefined,
        )
      }
      setCodeBlockFenceLine(null)
    },
    [editorView, langPickerMode, codeBlockFenceLine],
  )

  const cancelLangPicker = useCallback(() => {
    setLangPickerOpen(false)
    setCodeBlockFenceLine(null)
  }, [])

  // ----- Sidebar toggles -----
  const handlePanelToggle = useCallback(
    (panel: PanelId) => {
      if (sidebarOpen && activePanel === panel) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
        setActivePanel(panel)
      }
    },
    [sidebarOpen, activePanel],
  )

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v)
  }, [])

  // Manual file-association registration from the Settings panel. Used when
  // the user declined the first-launch prompt and wants to register later.
  const handleRegisterFileAssociation = useCallback(async () => {
    try {
      await invoke('register_file_association')
      const { message } = await import('@tauri-apps/plugin-dialog')
      await message(
        'GHS Markdown Editor is now the default app for .md files.',
        { title: 'File Association Registered', kind: 'info' },
      )
      if (settingsStore.current) {
        await settingsStore.current.set(STORE_KEY_FILE_ASSOC_PROMPT_SHOWN, true)
        await settingsStore.current.save()
      }
    } catch (err) {
      console.warn('Registration failed:', err)
      const { message } = await import('@tauri-apps/plugin-dialog')
      await message(`Could not register: ${String(err)}`, {
        title: 'Registration Failed',
        kind: 'error',
      })
    }
  }, [])

  // ----- Menu event listener (handler-ref pattern keeps listener stable) -----
  // editorView and openCodeBlockPicker are added so the context-menu cases
  // (ctx_bold, ctx_h1 …) can dispatch into CodeMirror without rebuilding the
  // listener whenever those identities change.
  const handlersRef = useRef({
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    setViewMode,
    toggleSidebar,
    exportHtmlStyled,
    exportHtmlClean,
    exportPlainText,
    exportPdf,
    exportDocx,
    exportWordHtml,
    copyMarkdown,
    editorView,
    openCodeBlockPicker,
  })
  handlersRef.current = {
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    setViewMode,
    toggleSidebar,
    exportHtmlStyled,
    exportHtmlClean,
    exportPlainText,
    exportPdf,
    exportDocx,
    exportWordHtml,
    copyMarkdown,
    editorView,
    openCodeBlockPicker,
  }

  useEffect(() => {
    const promise = listen<string>('menu-event', (event) => {
      const id = event.payload
      const h = handlersRef.current
      switch (id) {
        case 'new':
          void h.newFile()
          break
        case 'open':
          void h.openFile()
          break
        case 'save':
          void h.saveFile()
          break
        case 'save_as':
          void h.saveFileAs()
          break
        case 'exit':
          void getCurrentWindow().close()
          break
        case 'view_write':
          h.setViewMode('write')
          break
        case 'view_split':
          h.setViewMode('split')
          break
        case 'view_preview':
          h.setViewMode('preview')
          break
        case 'toggle_sidebar':
          h.toggleSidebar()
          break
        case 'export_html_styled':
          void h.exportHtmlStyled()
          break
        case 'export_html_clean':
          void h.exportHtmlClean()
          break
        case 'export_text':
          void h.exportPlainText()
          break
        case 'export_pdf':
          void h.exportPdf()
          break
        case 'export_docx':
          void h.exportDocx()
          break
        case 'export_word_html':
          void h.exportWordHtml()
          break
        case 'export_copy_md':
          void h.copyMarkdown()
          break
        case 'export_dialog':
          setExportOpen(true)
          break
        case 'show_help':
          setHelpOpen(true)
          break
        case 'show_about':
          setAboutOpen(true)
          break
        // ----- Editor context menu (Fix-O) -----
        // Predefined cut/copy/paste/select-all are routed by the WebView and
        // do not appear here.
        case 'ctx_bold':
          if (h.editorView) wrapSelection(h.editorView, '**')
          break
        case 'ctx_italic':
          if (h.editorView) wrapSelection(h.editorView, '_')
          break
        case 'ctx_strike':
          if (h.editorView) wrapSelection(h.editorView, '~~')
          break
        case 'ctx_inline_code':
          if (h.editorView) wrapSelection(h.editorView, '`')
          break
        case 'ctx_code_block':
          h.openCodeBlockPicker()
          break
        case 'ctx_h1':
          if (h.editorView) insertLinePrefix(h.editorView, '# ')
          break
        case 'ctx_h2':
          if (h.editorView) insertLinePrefix(h.editorView, '## ')
          break
        case 'ctx_h3':
          if (h.editorView) insertLinePrefix(h.editorView, '### ')
          break
        case 'ctx_h4':
          if (h.editorView) insertLinePrefix(h.editorView, '#### ')
          break
        case 'ctx_h5':
          if (h.editorView) insertLinePrefix(h.editorView, '##### ')
          break
        case 'ctx_h6':
          if (h.editorView) insertLinePrefix(h.editorView, '###### ')
          break
        case 'ctx_link':
          if (h.editorView) wrapSelection(h.editorView, '[', '](url)')
          break
        case 'ctx_image':
          if (h.editorView) insertSnippet(h.editorView, '![alt](url)')
          break
        case 'ctx_word_wrap':
          setWordWrap((v) => !v)
          break
        case 'ctx_line_numbers':
          setShowLineNumbers((v) => !v)
          break
        case 'ctx_save':
          void h.saveFile()
          break
        case 'ctx_save_as':
          void h.saveFileAs()
          break
      }
    })
    return () => {
      void promise.then((fn) => fn())
    }
  }, [])

  // ----- Single-instance warm-launch handoff -----
  // tauri-plugin-single-instance fires `open-file-from-arg` from the running
  // instance with the *new* process's argv so a second double-click opens the
  // file in another tab instead of spawning a duplicate process. Cold-launch
  // arg handling lives inside the one-time setup useEffect above (sequenced
  // after the store restore to avoid the race that wiped the just-opened
  // file). Unminimize + show are required because Windows file association
  // doesn't restore a minimized target window on its own.
  useEffect(() => {
    const unlistenPromise = listen<string>('open-file-from-arg', async (event) => {
      const path = event.payload
      if (!path) return
      try {
        await openFileByPath(path)
        const win = getCurrentWindow()
        await win.unminimize()
        await win.show()
        await win.setFocus()
      } catch (err) {
        console.warn('open-file-from-arg handling failed:', err)
      }
    })

    return () => {
      void unlistenPromise.then((fn) => fn())
    }
  }, [openFileByPath])

  // ----- Keyboard shortcuts -----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // F1 has no modifier — handle before the ctrl/meta guard.
      if (e.key === 'F1') {
        e.preventDefault()
        setHelpOpen(true)
        return
      }
      if (!e.ctrlKey && !e.metaKey) return
      const key = e.key.toLowerCase()
      // Ctrl+K opens the Command Palette regardless of editor focus.
      if (key === 'k' && !e.shiftKey) {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      // Ctrl+Shift+E opens the Export Dialog regardless of modal state.
      if (key === 'e' && e.shiftKey) {
        e.preventDefault()
        setExportOpen(true)
        return
      }
      // Suppress every other global Ctrl-shortcut while a modal is open
      // so the user can type into its input without firing actions.
      if (paletteOpen || langPickerOpen || exportOpen || aboutOpen || helpOpen) return
      const view = editorView
      // File ops
      if (key === 'n' && !e.shiftKey) {
        e.preventDefault()
        void newFile()
        return
      }
      if (key === 'o' && !e.shiftKey) {
        e.preventDefault()
        void openFile()
        return
      }
      if (key === 's' && !e.shiftKey) {
        e.preventDefault()
        void saveFile()
        return
      }
      if (key === 's' && e.shiftKey) {
        e.preventDefault()
        void saveFileAs()
        return
      }
      // Formatting
      if (!view) return
      if (key === 'b' && !e.shiftKey) {
        e.preventDefault()
        wrapSelection(view, '**')
        return
      }
      if (key === 'i' && !e.shiftKey) {
        e.preventDefault()
        wrapSelection(view, '_')
        return
      }
      if (key === 'k' && e.shiftKey) {
        e.preventDefault()
        openCodeBlockPicker()
        return
      }
      if (e.key === '`' && !e.shiftKey) {
        e.preventDefault()
        wrapSelection(view, '`')
        return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    editorView,
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    paletteOpen,
    langPickerOpen,
    exportOpen,
    aboutOpen,
    helpOpen,
    openCodeBlockPicker,
  ])

  // ----- Editor handlers -----
  const handleContentChange = useCallback((value: string) => {
    setContent(value)
    setIsDirty(true)
  }, [])

  const handleStatistics = useCallback((stats: Statistics) => {
    const head = stats.selectionAsSingle?.head ?? 0
    setLine(stats.line.number)
    setCol(head - stats.line.from + 1)
  }, [])

  const handleCreateEditor = useCallback((view: EditorView) => {
    setEditorView(view)
  }, [])

  // ----- Sync scroll -----
  // Suppression flag: while a tab switch is in flight the editor's reflow
  // can fire a scroll-to-top event that would otherwise overwrite the
  // outgoing tab's saved scrollTop with 0.
  const tabSwitching = useRef<boolean>(false)

  const handleEditorScroll = useCallback(
    (scrollTop: number, scrollHeight: number, clientHeight: number) => {
      // SmartGutter dot still rides the ratio — it's purely cosmetic and
      // anchor-based positioning would jitter for that single-element use.
      const denom = scrollHeight - clientHeight
      const ratio = denom > 0 ? scrollTop / denom : 0
      setEditorScrollRatio(ratio)

      // Persist scroll position to the active tab unless we're in the middle
      // of a programmatic tab switch.
      if (!tabSwitching.current) {
        updateActiveTab({ scrollTop })
      }

      // Bounce-back suppression — only meaningful for the in-window split
      // sync below; write/preview modes can't trigger preview→editor bounces
      // because the preview pane isn't mounted in the main window.
      if (isSyncingScroll.current) {
        isSyncingScroll.current = false
        return
      }
      const view = editorView
      if (!view) return

      // Compute once for both consumers (in-window split + detached window).
      const topLine = getEditorTopSourceLine(view)

      // ── In-window split sync ──────────────────────────────────────────
      if (viewMode === 'split') {
        const preview = previewRef.current
        if (preview) {
          // Set the suppression flag BEFORE the scrollTop write inside
          // syncPreviewToEditorLine — that write fires the preview's scroll
          // event synchronously.
          isSyncingScroll.current = true
          const synced = syncPreviewToEditorLine(preview, topLine)
          if (!synced) {
            // No anchors (empty doc / pure plaintext) — ratio fallback.
            const previewMax = preview.scrollHeight - preview.clientHeight
            if (previewMax > 0) {
              preview.scrollTop = ratio * previewMax
            } else {
              isSyncingScroll.current = false
            }
          }
        }
      }

      // Detached preview window — emit the same topLine so its local
      // syncPreviewToEditorLine call can track. One-way only: the detached
      // window is a reading surface and never writes back to the editor.
      // Read previewDetached via ref so toggling detach doesn't recompute
      // the editorPane memo.
      if (previewDetachedRef.current) {
        void emit('preview-scroll-update', { topLine })
      }
    },
    [viewMode, editorView, updateActiveTab],
  )

  // ----- Tab switch: restore scroll position for the incoming tab -----
  useEffect(() => {
    const view = editorView
    if (!view || !activeTab) return
    tabSwitching.current = true
    // Defer one frame so CodeMirror's value-prop sync (via ExternalChange)
    // settles before we set scroll. After that, allow scroll-saves again.
    const handle = window.setTimeout(() => {
      view.scrollDOM.scrollTop = activeTab.scrollTop
      const release = window.setTimeout(() => {
        tabSwitching.current = false
      }, 80)
      return () => window.clearTimeout(release)
    }, 0)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId, editorView])

  const handlePreviewScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (viewMode !== 'split') return
      if (isSyncingScroll.current) {
        isSyncingScroll.current = false
        return
      }
      const view = editorView
      if (!view) return
      const target = e.currentTarget

      // Anchor-based interpolation (Fix-T) — symmetric with the
      // syncPreviewToEditorLine path used by handleEditorScroll. Set the
      // suppression flag BEFORE the function call: it writes the editor's
      // scrollTop synchronously and the editor's scroll handler then runs
      // in the same task.
      isSyncingScroll.current = true
      const synced = syncEditorToPreviewScroll(target, view)
      if (synced) return

      // No anchors (empty doc / pure plaintext) — fall back to ratio sync.
      const denom = target.scrollHeight - target.clientHeight
      const ratio = denom > 0 ? target.scrollTop / denom : 0
      const editorScroller = view.scrollDOM
      const editorMax = editorScroller.scrollHeight - editorScroller.clientHeight
      if (editorMax > 0) {
        editorScroller.scrollTop = ratio * editorMax
      } else {
        isSyncingScroll.current = false
      }
    },
    [viewMode, editorView],
  )

  // ----- Divider drag -----
  const onDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMove = (ev: MouseEvent) => {
        const layout = splitContainerRef.current
        if (!layout) return
        const rect = layout.getBoundingClientRect()
        const pct = ((ev.clientX - rect.left) / rect.width) * 100
        setSplitRatio(clamp(pct, 20, 80))
      }
      const onUp = () => {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        setSplitRatio((current) => {
          void persistSplitRatio(current)
          return current
        })
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [persistSplitRatio],
  )

  // ----- Window close: prompt if any tab is dirty -----
  useEffect(() => {
    const win = getCurrentWindow()
    const promise = win.onCloseRequested(async (event) => {
      const dirty = tabsRef.current.filter((t) => t.isDirty)
      if (dirty.length === 0) return
      event.preventDefault()
      try {
        const confirmed = await invoke<boolean>('confirm_discard')
        if (confirmed) {
          await win.destroy()
        }
      } catch (err) {
        console.warn('confirm_discard during close failed:', err)
      }
    })
    return () => {
      void promise.then((fn) => fn())
    }
  }, [])

  // ----- Detached preview window (Fix-J) -----
  const openPreviewWindow = useCallback(async () => {
    const existing = await WebviewWindow.getByLabel('preview')
    if (existing) await existing.close()
    const titleBase = filePath ? basename(filePath) : 'Untitled'
    const previewWin = new WebviewWindow('preview', {
      url: '/?preview=true',
      title: `Preview — ${titleBase}`,
      width: 700,
      height: 800,
      minWidth: 400,
      minHeight: 400,
      resizable: true,
      center: false,
    })
    previewWin.once('tauri://created', () => {
      setPreviewDetached(true)
      setViewMode('write')
      // Backup snapshot delivery in case the preview-window-ready handshake
      // is missed (e.g. timing race with listener registration).
      window.setTimeout(() => {
        void emit('preview-content-update', previewSnapshotRef.current)
      }, 300)
    })
    previewWin.once('tauri://destroyed', () => {
      setPreviewDetached(false)
      setViewMode('split')
    })
  }, [filePath])

  const closePreviewWindow = useCallback(async () => {
    const win = await WebviewWindow.getByLabel('preview')
    if (win) await win.close()
  }, [])

  // Auto-close the preview window if the user returns the main window to
  // Split mode while detached. The destroy callback handles state reset.
  useEffect(() => {
    if (viewMode === 'split' && previewDetached) {
      void closePreviewWindow()
    }
  }, [viewMode, previewDetached, closePreviewWindow])

  // Keep previewDetachedRef in sync with the latest previewDetached value
  // so handleEditorScroll can read it without dep-list churn.
  useEffect(() => {
    previewDetachedRef.current = previewDetached
  }, [previewDetached])

  // Push content/filePath/theme/accent + topLine updates to the preview
  // window whenever they change while the window is open. topLine is
  // included so a content re-render (which clears anchors) can restore the
  // user's scroll position after the new HTML commits.
  useEffect(() => {
    if (!previewDetached) return
    const view = editorView
    const topLine = view ? getEditorTopSourceLine(view) : 0
    void emit('preview-content-update', {
      content,
      filePath,
      theme,
      accentColor,
      topLine,
    })
  }, [previewDetached, content, filePath, theme, accentColor, editorView])

  // Update the preview window's title bar when the active tab's filename
  // changes (covers Save As and tab switches).
  useEffect(() => {
    if (!previewDetached) return
    const titleBase = filePath ? basename(filePath) : 'Untitled'
    void (async () => {
      const win = await WebviewWindow.getByLabel('preview')
      if (win) await win.setTitle(`Preview — ${titleBase}`)
    })()
  }, [previewDetached, filePath])

  // Handshake: the preview window emits `preview-window-ready` once its
  // listener is registered; we respond with the current snapshot so the
  // initial paint isn't blank. The listener mounts once and reads the latest
  // snapshot via a ref to avoid resubscribe churn on every keystroke.
  // Snapshot ref carries the full payload sent on handshake (preview-window-
  // ready → preview-content-update). Includes topLine so the detached window
  // opens at the user's current scroll position rather than at the top.
  const previewSnapshotRef = useRef({
    content,
    filePath,
    theme,
    accentColor,
    topLine: 0,
  })
  useEffect(() => {
    const view = editorView
    previewSnapshotRef.current = {
      content,
      filePath,
      theme,
      accentColor,
      topLine: view ? getEditorTopSourceLine(view) : 0,
    }
  }, [content, filePath, theme, accentColor, editorView])
  useEffect(() => {
    const promise = listen('preview-window-ready', () => {
      void emit('preview-content-update', previewSnapshotRef.current)
    })
    return () => {
      void promise.then((fn) => fn())
    }
  }, [])

  // ----- File drag-and-drop onto window -----
  useEffect(() => {
    const win = getCurrentWindow()
    const promise = win.onDragDropEvent((event) => {
      const payload = event.payload
      if (payload.type === 'enter' || payload.type === 'over') {
        setIsDragOver(true)
      } else if (payload.type === 'leave') {
        setIsDragOver(false)
      } else if (payload.type === 'drop') {
        setIsDragOver(false)
        for (const path of payload.paths) {
          if (/\.(md|markdown)$/i.test(path)) {
            void openFileByPath(path)
          }
        }
      }
    })
    return () => {
      void promise.then((fn) => fn())
    }
  }, [openFileByPath])

  // ----- Word/char counts + reading time -----
  const wordCount = useMemo(() => countWords(content), [content])
  const charCount = content.length
  const readingTimeMin = wordCount === 0 ? 0 : Math.max(1, Math.ceil(wordCount / 200))

  // ----- Document topology -----
  const topology = useMemo(() => buildTopology(content), [content])
  const activeTopologyIndex = useMemo(
    () => getActiveSectionIndex(topology, line),
    [topology, line],
  )
  const activeSourceLine = useMemo(() => {
    if (activeTopologyIndex < 0 || activeTopologyIndex >= topology.length) return null
    return topology[activeTopologyIndex].lineNumber
  }, [activeTopologyIndex, topology])

  // Preview → Editor: clicking a heading in the rendered preview scrolls the
  // editor to that line and lands the cursor there.
  const handlePreviewHeadingClick = useCallback(
    (line: number) => {
      if (editorView) scrollToLine(editorView, line)
    },
    [editorView],
  )

  // ----- Command palette items -----
  const paletteItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = []

    // Commands — File
    items.push(
      { id: 'cmd-new', kind: 'command', label: 'New File', detail: 'File', shortcut: 'Ctrl+N', action: () => void newFile() },
      { id: 'cmd-open', kind: 'command', label: 'Open File', detail: 'File', shortcut: 'Ctrl+O', action: () => void openFile() },
      { id: 'cmd-save', kind: 'command', label: 'Save', detail: 'File', shortcut: 'Ctrl+S', action: () => void saveFile() },
      { id: 'cmd-save-as', kind: 'command', label: 'Save As', detail: 'File', shortcut: 'Ctrl+Shift+S', action: () => void saveFileAs() },
    )

    // Commands — View
    items.push(
      { id: 'cmd-view-write', kind: 'command', label: 'Write Mode', detail: 'View', action: () => setViewMode('write') },
      { id: 'cmd-view-split', kind: 'command', label: 'Split Mode', detail: 'View', action: () => setViewMode('split') },
      { id: 'cmd-view-preview', kind: 'command', label: 'Preview Mode', detail: 'View', action: () => setViewMode('preview') },
      { id: 'cmd-toggle-sidebar', kind: 'command', label: 'Toggle Sidebar', detail: 'View', action: toggleSidebar },
    )

    // Commands — Format (require an editor view)
    const withView = (fn: (view: EditorView) => void) => () => {
      if (editorView) fn(editorView)
    }
    items.push(
      { id: 'cmd-bold', kind: 'command', label: 'Bold', detail: 'Format', shortcut: 'Ctrl+B', action: withView((v) => wrapSelection(v, '**')) },
      { id: 'cmd-italic', kind: 'command', label: 'Italic', detail: 'Format', shortcut: 'Ctrl+I', action: withView((v) => wrapSelection(v, '_')) },
      { id: 'cmd-inline-code', kind: 'command', label: 'Inline Code', detail: 'Format', shortcut: 'Ctrl+`', action: withView((v) => wrapSelection(v, '`')) },
      { id: 'cmd-code-block', kind: 'command', label: 'Code Block', detail: 'Format', shortcut: 'Ctrl+Shift+K', action: () => openCodeBlockPicker() },
      { id: 'cmd-link', kind: 'command', label: 'Insert Link', detail: 'Format', action: withView((v) => wrapSelection(v, '[', '](url)')) },
      { id: 'cmd-table', kind: 'command', label: 'Insert Table', detail: 'Format', action: withView(insertTable) },
    )

    // Commands — Export
    items.push(
      { id: 'cmd-export-html-styled', kind: 'command', label: 'Export HTML (Styled)', detail: 'Export', action: () => void exportHtmlStyled() },
      { id: 'cmd-export-html-clean', kind: 'command', label: 'Export HTML (Clean)', detail: 'Export', action: () => void exportHtmlClean() },
      { id: 'cmd-export-text', kind: 'command', label: 'Export Plain Text', detail: 'Export', action: () => void exportPlainText() },
      { id: 'cmd-export-pdf', kind: 'command', label: 'Export PDF', detail: 'Export', action: () => void exportPdf() },
      { id: 'cmd-export-docx', kind: 'command', label: 'Export Word (.docx)', detail: 'Export', action: () => void exportDocx() },
      { id: 'cmd-export-word-html', kind: 'command', label: 'Export Word HTML (.doc)', detail: 'Export', action: () => void exportWordHtml() },
      { id: 'cmd-copy-md', kind: 'command', label: 'Copy Markdown', detail: 'Export', action: () => void copyMarkdown() },
    )

    // Headings
    topology.forEach((entry, i) => {
      items.push({
        id: `heading-${i}-${entry.lineNumber}`,
        kind: 'heading',
        label: entry.text,
        detail: `H${entry.level} · Line ${entry.lineNumber} · ${entry.wordCount} w`,
        action: () => {
          if (editorView) scrollToLine(editorView, entry.lineNumber)
        },
      })
    })

    // Snippets
    snippets.forEach((s) => {
      items.push({
        id: `snippet-${s.id}`,
        kind: 'snippet',
        label: s.name,
        detail: s.tag,
        action: () => {
          if (editorView) insertSnippet(editorView, s.body)
        },
      })
    })

    // Recent files
    recentFiles.forEach((path) => {
      items.push({
        id: `file-${path}`,
        kind: 'file',
        label: basename(path),
        detail: path,
        action: () => void openFileByPath(path),
      })
    })

    return items
  }, [
    editorView,
    topology,
    snippets,
    recentFiles,
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    toggleSidebar,
    exportHtmlStyled,
    exportHtmlClean,
    exportPlainText,
    exportPdf,
    exportDocx,
    exportWordHtml,
    copyMarkdown,
    openFileByPath,
    openCodeBlockPicker,
  ])

  // Editor right-click → ask Rust to show the native context menu, passing
  // the current toggle state so the checkmarks render correctly. Identity
  // changes whenever wordWrap/showLineNumbers flips, which forces the
  // editorPane memo to recompute — that's intentional, the new values must
  // ride along on the next right-click.
  const handleEditorContextMenu = useCallback(() => {
    void invoke('show_editor_context_menu', {
      wordWrap,
      showLineNumbers,
    })
  }, [wordWrap, showLineNumbers])

  // ----- Layout -----
  const editorPane = useMemo(
    () => (
      <Editor
        value={content}
        onChange={handleContentChange}
        onCreateEditor={handleCreateEditor}
        onStatistics={handleStatistics}
        onScroll={handleEditorScroll}
        onOpenLangPicker={openLangPicker}
        onContextMenu={handleEditorContextMenu}
        theme={theme}
        wordWrap={wordWrap}
        showLineNumbers={showLineNumbers}
        fontSize={editorFontSize}
        fontFamily={editorFontFamily}
      />
    ),
    [
      content,
      handleContentChange,
      handleCreateEditor,
      handleStatistics,
      handleEditorScroll,
      openLangPicker,
      handleEditorContextMenu,
      theme,
      wordWrap,
      showLineNumbers,
      editorFontSize,
      editorFontFamily,
    ],
  )

  const previewPane = useMemo(
    () => (
      <PreviewPane
        content={content}
        ref={previewRef}
        onScroll={handlePreviewScroll}
        onHeadingClick={handlePreviewHeadingClick}
        activeSourceLine={activeSourceLine}
      />
    ),
    [content, handlePreviewScroll, handlePreviewHeadingClick, activeSourceLine],
  )

  return (
    <>
      <Toolbar
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onNew={newFile}
        onOpen={openFile}
        onSave={saveFile}
        onSaveAs={saveFileAs}
        onInsertCodeBlock={openCodeBlockPicker}
        onExport={() => setExportOpen(true)}
        onOpenPreviewWindow={openPreviewWindow}
        onClosePreviewWindow={closePreviewWindow}
        previewDetached={previewDetached}
        editorView={editorView}
      />
      <TabBar
        tabs={tabs}
        activeTabId={activeTab.id}
        onSelect={selectTab}
        onClose={closeTab}
        onNewTab={newFile}
      />
      <div
        className="flex-1 flex overflow-hidden"
        style={{
          outline: isDragOver ? '2px dashed var(--accent)' : 'none',
          outlineOffset: -2,
        }}
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onDrop={(e) => {
          // Browser default would navigate to the file URL — Tauri's
          // onDragDropEvent handles the actual file open with absolute paths.
          e.preventDefault()
        }}
      >
        <Sidebar
          isOpen={sidebarOpen}
          activePanel={activePanel}
          onToggle={handlePanelToggle}
          topology={topology}
          activeTopologyIndex={activeTopologyIndex}
          editorView={editorView}
          recentFiles={recentFiles}
          onOpenRecent={openFileByPath}
          snippets={snippets}
          onSaveSnippets={saveSnippets}
          filePath={filePath}
          timelineSnapshots={timelineSnapshots}
          selectedSnapshot={selectedSnapshot}
          snapshotPreviewContent={snapshotPreviewContent}
          currentWordCount={wordCount}
          onSelectSnapshot={handleSelectSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
          onRefreshTimeline={handleManualRefreshTimeline}
          theme={theme}
          onThemeChange={setTheme}
          defaultViewMode={defaultViewMode}
          onDefaultViewModeChange={setDefaultViewMode}
          onRegisterFileAssociation={handleRegisterFileAssociation}
          autoSaveInterval={autoSaveInterval}
          onAutoSaveIntervalChange={(v) => {
            // Sidebar/SettingsPanel speak in plain numbers; narrow at the
            // boundary back to the validated literal-union type.
            if ((AUTOSAVE_VALID as readonly number[]).includes(v)) {
              setAutoSaveInterval(v as AutoSaveInterval)
            }
          }}
          accentColor={accentColor}
          onAccentColorChange={setAccentColor}
          editorFontSize={editorFontSize}
          onEditorFontSizeChange={setEditorFontSize}
          editorFontFamily={editorFontFamily}
          onEditorFontFamilyChange={setEditorFontFamily}
        />
        <div
          ref={splitContainerRef}
          className="flex-1 flex overflow-hidden"
          style={{ backgroundColor: 'var(--editor-bg)' }}
        >
          {viewMode === 'write' && (
            <div className="flex-1 overflow-hidden">{editorPane}</div>
          )}

          {viewMode === 'split' && (
            <>
              <div
                className="overflow-hidden"
                style={{ width: `calc(${splitRatio}% - 12px)`, flexShrink: 0 }}
              >
                {editorPane}
              </div>
              <SmartGutter
                wordCount={wordCount}
                scrollRatio={editorScrollRatio}
                onDragStart={onDividerMouseDown}
              />
              <div
                className="overflow-hidden"
                style={{ width: `calc(${100 - splitRatio}% - 12px)`, flexShrink: 0 }}
              >
                {previewPane}
              </div>
            </>
          )}

          {viewMode === 'preview' && (
            <div className="flex-1 overflow-hidden">{previewPane}</div>
          )}
        </div>
      </div>
      <StatusBar
        filePath={filePath}
        isDirty={isDirty}
        line={line}
        col={col}
        viewMode={viewMode}
        wordCount={wordCount}
        charCount={charCount}
        readingTimeMin={readingTimeMin}
      />
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={paletteItems}
      />
      <LanguagePicker
        isOpen={langPickerOpen}
        onSelect={handleLangSelect}
        onCancel={cancelLangPicker}
      />
      <ExportDialog
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        fileName={filePath ? basename(filePath) : 'Untitled'}
        onExportHtmlStyled={() => void exportHtmlStyled()}
        onExportHtmlClean={() => void exportHtmlClean()}
        onExportDocx={() => void exportDocx()}
        onExportWordHtml={() => void exportWordHtml()}
        onExportPdf={() => void exportPdf()}
        onExportText={() => void exportPlainText()}
        onCopyMarkdown={() => void copyMarkdown()}
      />
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
