import { describe, expect, it } from 'vitest'
import { parseMarkdown, walk } from './parse'

describe('parseMarkdown', () => {
  it('parses a GFM table and a task list item', () => {
    const root = parseMarkdown('| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n')
    expect(root.children[0].type).toBe('table')
    const list = root.children[1]
    expect(list.type).toBe('list')
    if (list.type === 'list') expect(list.children[0].checked).toBe(true)
  })
})

describe('walk', () => {
  it('visits nodes in pre-order with their parent', () => {
    const root = parseMarkdown('# Hi *there*')
    const seen: string[] = []
    walk(root, (node, parent) => seen.push(`${node.type}<${parent?.type ?? '-'}`))
    expect(seen).toEqual([
      'root<-',
      'heading<root',
      'text<heading',
      'emphasis<heading',
      'text<emphasis',
    ])
  })
})
