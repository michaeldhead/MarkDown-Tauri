export type ViewMode = 'write' | 'split' | 'preview'

export interface Tab {
  id: string
  filePath: string | null
  content: string
  isDirty: boolean
  scrollTop: number
  cursorLine: number
  cursorCol: number
  viewMode?: ViewMode
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function newTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: genId(),
    filePath: null,
    content: '',
    isDirty: false,
    scrollTop: 0,
    cursorLine: 1,
    cursorCol: 1,
    ...overrides,
  }
}

export function tabBasename(tab: Tab): string {
  if (!tab.filePath) return 'Untitled'
  return tab.filePath.split(/[\\/]/).pop() ?? 'Untitled'
}

export function tabDisplayName(tab: Tab): string {
  const base = tabBasename(tab)
  return tab.isDirty ? `* ${base}` : base
}
