export interface HeadingEntry {
  level: number
  text: string
  lineNumber: number
}

export function extractHeadings(content: string): HeadingEntry[] {
  const lines = content.split('\n')
  const headings: HeadingEntry[] = []
  let inFencedCode = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```') || line.startsWith('~~~')) {
      inFencedCode = !inFencedCode
      continue
    }
    if (inFencedCode) continue
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        lineNumber: i + 1,
      })
    }
  }
  return headings
}

export function countWords(content: string): number {
  if (!content) return 0
  const tokens = content.trim().split(/\s+/)
  return tokens.length === 1 && tokens[0] === '' ? 0 : tokens.length
}

export interface TopologyEntry extends HeadingEntry {
  wordCount: number
}

export function buildTopology(content: string): TopologyEntry[] {
  const headings = extractHeadings(content)
  if (headings.length === 0) return []
  const lines = content.split('\n')

  return headings.map((heading, i) => {
    const startLine = heading.lineNumber
    const endLine =
      i + 1 < headings.length ? headings[i + 1].lineNumber - 1 : lines.length
    const sectionText = lines.slice(startLine - 1, endLine).join(' ')
    return { ...heading, wordCount: countWords(sectionText) }
  })
}

export function getActiveSectionIndex(
  topology: TopologyEntry[],
  cursorLine: number,
): number {
  let active = -1
  for (let i = 0; i < topology.length; i++) {
    if (topology[i].lineNumber <= cursorLine) active = i
    else break
  }
  return active
}
