import type { EditorView } from '@codemirror/view'

// Anchor-based scroll synchronization between the CodeMirror editor and the
// rendered Markdown preview. Both sides cooperate via `data-source-line`
// attributes that `remarkSourceLines` (in preview.ts) stamps onto the rendered
// HTML. Anchors give us absolute mapping between editor source lines and
// preview block positions, replacing the old ratio-based sync that drifted
// because preview blocks have variable heights.

export type SourceLineAnchor = { line: number; el: HTMLElement }

/**
 * Returns every `[data-source-line]` element in `container`, sorted ascending
 * by source-line number. The DOM order already matches source order in
 * practice — the sort is defensive in case rehype reordering ever changes
 * that.
 */
export function getSourceLineElements(container: HTMLElement): SourceLineAnchor[] {
  const results: SourceLineAnchor[] = []
  container.querySelectorAll<HTMLElement>('[data-source-line]').forEach((el) => {
    const raw = el.getAttribute('data-source-line')
    if (!raw) return
    const line = parseInt(raw, 10)
    if (!Number.isNaN(line)) results.push({ line, el })
  })
  results.sort((a, b) => a.line - b.line)
  return results
}

/**
 * Editor → Preview sync (interpolated).
 *
 * Finds the two anchors that bracket `topEditorLine` (floor and ceil),
 * computes how far between them the editor sits as a 0–1 progress factor,
 * and scrolls the preview to the proportionally-equivalent pixel position
 * between the two anchor elements. This produces continuous tracking
 * through long sections instead of the floor-snap behaviour from Fix-M
 * which froze the preview between anchors and jumped on each crossing.
 *
 * Falls back to floor-snap when:
 *   - the editor is below the last anchor (no ceil),
 *   - both anchors share the same line (no range to interpolate over).
 *
 * Returns `false` only when the preview has no anchors at all (so the
 * caller can fall back to ratio sync). The caller is responsible for
 * setting any feedback-loop suppression flag BEFORE invoking this —
 * `previewContainer.scrollTop = …` fires the scroll event synchronously.
 */
export function syncPreviewToEditorLine(
  previewContainer: HTMLElement,
  topEditorLine: number,
): boolean {
  const anchors = getSourceLineElements(previewContainer)
  if (anchors.length === 0) return false

  // Floor index: last anchor whose line is ≤ topEditorLine. If the editor
  // is above all anchors, floorIdx stays at 0 — the progress clamp below
  // resolves it to "snap to the first anchor."
  let floorIdx = 0
  for (let i = 0; i < anchors.length; i++) {
    if (anchors[i].line <= topEditorLine) floorIdx = i
    else break
  }

  const floor = anchors[floorIdx]
  const ceil = anchors[floorIdx + 1]

  const containerRect = previewContainer.getBoundingClientRect()
  const floorOffset =
    floor.el.getBoundingClientRect().top - containerRect.top

  if (!ceil || ceil.line <= floor.line) {
    // Past the last anchor, or anchors share a line — snap to floor.
    previewContainer.scrollTop = previewContainer.scrollTop + floorOffset
    return true
  }

  const progress = Math.max(
    0,
    Math.min(1, (topEditorLine - floor.line) / (ceil.line - floor.line)),
  )
  const ceilOffset =
    ceil.el.getBoundingClientRect().top - containerRect.top
  const interpolatedOffset = floorOffset + progress * (ceilOffset - floorOffset)

  previewContainer.scrollTop = previewContainer.scrollTop + interpolatedOffset
  return true
}

/**
 * Preview → Editor sync (interpolated).
 *
 * Mirror of `syncPreviewToEditorLine`. Brackets the preview container's
 * top edge between two anchors, computes a 0–1 progress factor in *pixel*
 * space (since the preview's anchors are pixel-positioned), maps that to
 * a fractional source line, then asks CodeMirror for the corresponding
 * scroll-top via `getEditorScrollTopForLine`. Same continuous-tracking
 * goal as Fix-Q, opposite direction.
 *
 * Falls back to floor-snap when:
 *   - the container is past the last anchor (no ceil),
 *   - both anchors share the same pixel position (no range to divide).
 *
 * Returns `false` only when the preview has no anchors at all so the
 * caller can fall back to ratio sync. The caller is responsible for
 * setting any feedback-loop suppression flag BEFORE invoking this —
 * `editorView.scrollDOM.scrollTop = …` fires the editor's scroll event
 * synchronously.
 */
export function syncEditorToPreviewScroll(
  previewContainer: HTMLElement,
  editorView: EditorView,
): boolean {
  const anchors = getSourceLineElements(previewContainer)
  if (anchors.length === 0) return false

  const containerTop = previewContainer.getBoundingClientRect().top

  // floor: the last anchor whose top edge is at or above containerTop
  //        (i.e., the anchor we've scrolled to or past).
  // ceil:  the first anchor whose top edge is below containerTop
  //        (i.e., the next anchor coming into view).
  let floorIdx = -1
  let ceilIdx = -1
  for (let i = 0; i < anchors.length; i++) {
    const top = anchors[i].el.getBoundingClientRect().top
    if (top <= containerTop) {
      floorIdx = i
    } else {
      ceilIdx = i
      break
    }
  }
  if (floorIdx === -1) floorIdx = 0

  const floor = anchors[floorIdx]
  const ceil = ceilIdx !== -1 ? anchors[ceilIdx] : undefined

  if (!ceil) {
    // Past the last anchor — pin editor to its line.
    editorView.scrollDOM.scrollTop = getEditorScrollTopForLine(
      editorView,
      floor.line,
    )
    return true
  }

  const floorTop = floor.el.getBoundingClientRect().top
  const ceilTop = ceil.el.getBoundingClientRect().top
  const pixelRange = ceilTop - floorTop

  if (pixelRange <= 0) {
    // Anchors overlap pixel-wise (e.g., zero-height block) — snap to floor.
    editorView.scrollDOM.scrollTop = getEditorScrollTopForLine(
      editorView,
      floor.line,
    )
    return true
  }

  const progress = clamp01((containerTop - floorTop) / pixelRange)
  const targetLine = floor.line + progress * (ceil.line - floor.line)
  editorView.scrollDOM.scrollTop = getEditorScrollTopForLine(
    editorView,
    Math.round(targetLine),
  )
  return true
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/**
 * Preview → Editor sync. Returns the source line of the first anchor whose
 * bounding box intersects the preview viewport. Returns `null` if there are
 * no anchors at all (caller should fall back to ratio sync).
 */
export function getPreviewTopSourceLine(previewContainer: HTMLElement): number | null {
  const anchors = getSourceLineElements(previewContainer)
  if (anchors.length === 0) return null

  const containerRect = previewContainer.getBoundingClientRect()
  for (const anchor of anchors) {
    const rect = anchor.el.getBoundingClientRect()
    if (rect.bottom > containerRect.top && rect.top < containerRect.bottom) {
      return anchor.line
    }
  }
  // Scrolled past the last anchor — pin to it.
  return anchors[anchors.length - 1].line
}

/**
 * Computes the editor's `scrollDOM.scrollTop` value that places `line` at
 * the viewport's top edge. Uses CodeMirror's block-layout API which respects
 * line wrapping and fold heights; clamps `line` into the document's range.
 */
export function getEditorScrollTopForLine(view: EditorView, line: number): number {
  const doc = view.state.doc
  const clamped = Math.max(1, Math.min(doc.lines, line))
  try {
    const lineObj = doc.line(clamped)
    return view.lineBlockAt(lineObj.from).top
  } catch {
    return 0
  }
}

/**
 * Returns the 1-based source line of the first visible line at the editor's
 * scroll-viewport top. Uses the block layout to find the block at the
 * current scroll offset, then maps its starting position back to a line
 * number.
 */
export function getEditorTopSourceLine(view: EditorView): number {
  const scrollTop = view.scrollDOM.scrollTop
  try {
    const block = view.lineBlockAtHeight(scrollTop)
    return view.state.doc.lineAt(block.from).number
  } catch {
    return 1
  }
}
