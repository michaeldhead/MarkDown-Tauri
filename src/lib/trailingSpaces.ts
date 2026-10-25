import { RangeSetBuilder, type Extension } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view'

/**
 * Offsets within the line of a trailing run of 2+ U+0020 spaces, or null.
 * Tabs and other whitespace end the run.
 */
export function trailingSpaceRun(lineText: string): { from: number; to: number } | null {
  const to = lineText.length
  let from = to
  while (from > 0 && lineText[from - 1] === ' ') from--
  return to - from >= 2 ? { from, to } : null
}

const spaceMark = Decoration.mark({ class: 'cm-trailingSpace' })

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  let lastLine = 0
  for (const { from, to } of view.visibleRanges) {
    let pos = from
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos)
      pos = line.to + 1
      if (line.number <= lastLine) continue
      lastLine = line.number
      const run = trailingSpaceRun(line.text)
      if (!run) continue
      for (let i = run.from; i < run.to; i++) {
        builder.add(line.from + i, line.from + i + 1, spaceMark)
      }
    }
  }
  return builder.finish()
}

export function trailingSpaceMarkers(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = buildDecorations(view)
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view)
        }
      }
    },
    { decorations: (v) => v.decorations },
  )
}
