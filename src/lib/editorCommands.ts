import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

export function wrapSelection(view: EditorView, before: string, after: string = before): void {
  const { state } = view
  const changes = state.changeByRange((range) => {
    const selected = state.sliceDoc(range.from, range.to)
    return {
      changes: { from: range.from, to: range.to, insert: `${before}${selected}${after}` },
      range: EditorSelection.range(range.from + before.length, range.to + before.length),
    }
  })
  view.dispatch(changes)
  view.focus()
}

export function insertLinePrefix(view: EditorView, prefix: string): void {
  const { state } = view
  const changes = state.changeByRange((range) => {
    const startLine = state.doc.lineAt(range.from)
    const endLine = state.doc.lineAt(range.to)
    const lineChanges: { from: number; insert: string }[] = []
    for (let i = startLine.number; i <= endLine.number; i++) {
      const line = state.doc.line(i)
      lineChanges.push({ from: line.from, insert: prefix })
    }
    const lineCount = endLine.number - startLine.number + 1
    return {
      changes: lineChanges,
      range: EditorSelection.range(
        range.from + prefix.length,
        range.to + prefix.length * lineCount,
      ),
    }
  })
  view.dispatch(changes)
  view.focus()
}

export function insertSnippet(view: EditorView, snippet: string): void {
  const { state } = view
  const range = state.selection.main
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: snippet },
    selection: EditorSelection.cursor(range.from + snippet.length),
  })
  view.focus()
}

export function insertCodeBlock(view: EditorView): void {
  const { state } = view
  const range = state.selection.main
  const selected = state.sliceDoc(range.from, range.to)
  const insertion = '```\n' + selected + '\n```'
  const cursorOffset = selected.length === 0 ? 4 : insertion.length
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: insertion },
    selection: EditorSelection.cursor(range.from + cursorOffset),
  })
  view.focus()
}

// Build a three-backtick fence via charcode to eliminate every conceivable
// backtick-counting hazard (template literal escaping, minifier glitches,
// editor display ambiguity). U+0060 = GRAVE ACCENT.
function buildFence(): string {
  const backtick = String.fromCharCode(96)
  return backtick + backtick + backtick
}

export function insertCodeBlockWithLanguage(
  view: EditorView,
  language: string,
): void {
  const { state } = view
  const range = state.selection.main
  const selectedText = state.sliceDoc(range.from, range.to)

  const fence = buildFence()
  const tag = language === 'plaintext' || language === '' ? '' : language
  const snippet = fence + tag + '\n' + (selectedText || '') + '\n' + fence
  const cursorPos = range.from + 3 + tag.length + 1

  view.dispatch({
    changes: { from: range.from, to: range.to, insert: snippet },
    selection: EditorSelection.cursor(cursorPos),
  })
  view.focus()
}

/**
 * Insert an empty (untagged) three-backtick fence and place the cursor on
 * the blank middle line. Used by the insert-first/pick-second flow — the
 * caller follows up with replaceCodeBlockLanguage when the user picks a tag.
 */
export function insertBlankCodeBlock(view: EditorView): void {
  const { state } = view
  const range = state.selection.main

  const fence = buildFence()
  const snippet = fence + '\n\n' + fence
  // After opening fence (3) + newline (1) — start of the empty middle line.
  const cursorPos = range.from + 4

  view.dispatch({
    changes: { from: range.from, to: range.to, insert: snippet },
    selection: EditorSelection.cursor(cursorPos),
  })
  view.focus()
}

const FENCE_RE = /^(`{3,}|~{3,})\s*(\S*)/

export function replaceCodeBlockLanguage(
  view: EditorView,
  newLanguage: string,
  targetLineNumber?: number,
): void {
  const { state } = view
  const lineNum =
    targetLineNumber ?? state.doc.lineAt(state.selection.main.head).number
  const totalLines = state.doc.lines
  if (lineNum < 1 || lineNum > totalLines) return
  const line = state.doc.line(lineNum)
  const match = line.text.match(FENCE_RE)
  if (!match) return
  const fenceEnd = line.from + match[1].length
  const langEnd = fenceEnd + (match[2]?.length ?? 0)
  const tag = newLanguage === 'plaintext' || newLanguage === '' ? '' : newLanguage
  view.dispatch({
    changes: { from: fenceEnd, to: langEnd, insert: tag },
  })
  view.focus()
}

export function getCodeBlockLanguageAtPos(
  view: EditorView,
  pos: number,
): string | null {
  const line = view.state.doc.lineAt(pos)
  const match = line.text.match(FENCE_RE)
  if (!match) return null
  return match[2] ?? ''
}

export function insertTable(view: EditorView): void {
  const table =
    '| Header | Header | Header |\n' +
    '|--------|--------|--------|\n' +
    '| Cell   | Cell   | Cell   |\n' +
    '| Cell   | Cell   | Cell   |\n'
  insertSnippet(view, table)
}

export function insertHorizontalRule(view: EditorView): void {
  insertSnippet(view, '\n---\n')
}

export function insertImage(view: EditorView): void {
  insertSnippet(view, '![alt](url)')
}

export function insertLink(view: EditorView): void {
  wrapSelection(view, '[', '](url)')
}

export function scrollToLine(view: EditorView, lineNumber: number): void {
  const total = view.state.doc.lines
  const target = Math.max(1, Math.min(total, lineNumber))
  const line = view.state.doc.line(target)
  view.dispatch({
    selection: EditorSelection.cursor(line.from),
    effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 8 }),
  })
  view.focus()
}
