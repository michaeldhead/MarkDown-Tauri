export const PREVIEW_DEBOUNCE_MS = 800

export type PreviewFormat = 'pdf' | 'docx' | 'html-styled' | 'html-clean' | 'text'

export const PREVIEW_FORMATS: { id: PreviewFormat; label: string }[] = [
  { id: 'pdf', label: 'PDF' },
  { id: 'docx', label: 'Word Document' },
  { id: 'html-styled', label: 'Web Page (Styled)' },
  { id: 'html-clean', label: 'Web Page (Clean)' },
  { id: 'text', label: 'Plain Text' },
]

export function createPreviewCache<T>() {
  const entries = new Map<PreviewFormat, { content: string; value: T }>()
  return {
    get(format: PreviewFormat, content: string): T | undefined {
      const entry = entries.get(format)
      return entry && entry.content === content ? entry.value : undefined
    },
    set(format: PreviewFormat, content: string, value: T): void {
      entries.set(format, { content, value })
    },
    clear(): void {
      entries.clear()
    },
  }
}

export function createDebouncer(ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }
  return {
    schedule(fn: () => void): void {
      cancel()
      timer = setTimeout(() => {
        timer = null
        fn()
      }, ms)
    },
    cancel,
  }
}
