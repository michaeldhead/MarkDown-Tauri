export type PaletteItemKind = 'command' | 'heading' | 'snippet' | 'file'

export interface PaletteItem {
  id: string
  kind: PaletteItemKind
  label: string
  detail?: string
  shortcut?: string
  action: () => void
}

export function fuzzyMatch(query: string, target: string): number {
  if (query === '') return 1
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  let qi = 0
  let score = 0
  let lastMatch = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += lastMatch === ti - 1 ? 2 : 1
      lastMatch = ti
      qi++
    }
  }
  return qi === q.length ? score : -1
}

export interface ScoredItem {
  item: PaletteItem
  score: number
}

export function filterAndScore(items: PaletteItem[], query: string): PaletteItem[] {
  if (query === '') return items
  const scored: ScoredItem[] = []
  for (const item of items) {
    const score = fuzzyMatch(query, item.label)
    if (score >= 0) scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.item)
}
