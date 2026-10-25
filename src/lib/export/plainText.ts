import type { Nodes, Table } from 'mdast'
import { parseMarkdown, walk } from './parse'
import { stripTags } from './htmlText'

type Definitions = Map<string, string>

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'code',
  'list',
  'listItem',
  'table',
  'blockquote',
  'thematicBreak',
  'definition',
  'footnoteDefinition',
])

function collectDefinitions(root: Nodes): Definitions {
  const defs: Definitions = new Map()
  walk(root, (node) => {
    if (node.type === 'definition') defs.set(node.identifier, node.url)
  })
  return defs
}

function linkText(text: string, url: string | undefined): string {
  if (!url || text === url) return text
  return `${text} (${url})`
}

function children(node: Nodes, defs: Definitions): string {
  if (!('children' in node)) return ''
  return (node.children as Nodes[]).map((c) => inline(c, defs)).join('')
}

function inline(node: Nodes, defs: Definitions): string {
  switch (node.type) {
    case 'text':
    case 'inlineCode':
      return node.value
    case 'break':
      return '\n'
    case 'html':
      return stripTags(node.value)
    case 'image':
    case 'imageReference':
      return `[image: ${node.alt ?? ''}]`
    case 'link':
      return linkText(children(node, defs), node.url)
    case 'linkReference':
      return linkText(children(node, defs), defs.get(node.identifier))
    default:
      return children(node, defs)
  }
}

function blocks(nodes: Nodes[], defs: Definitions, sep: string): string {
  return nodes
    .map((n) => block(n, defs))
    .filter((s) => s !== '')
    .join(sep)
}

function tableText(node: Table, defs: Definitions): string {
  return node.children
    .map((row) => row.children.map((cell) => children(cell, defs)).join('\t'))
    .join('\n')
}

function block(node: Nodes, defs: Definitions): string {
  switch (node.type) {
    case 'definition':
      return ''
    case 'code':
      return node.value
    case 'thematicBreak':
      return '---'
    case 'table':
      return tableText(node, defs)
    case 'blockquote':
      return blocks(node.children, defs, '\n\n')
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
    case 'list': {
      const start = node.start ?? 1
      return node.children
        .map((item, i) => {
          let marker = node.ordered ? `${start + i}. ` : '- '
          if (item.checked === true) marker += '[x] '
          else if (item.checked === false) marker += '[ ] '
          const body = blocks(item.children, defs, '\n')
          return marker + body.split('\n').join('\n  ')
        })
        .join('\n')
    }
    default: {
      if (!('children' in node)) return inline(node, defs)
      const kids = node.children as Nodes[]
      return kids.some((k) => BLOCK_TYPES.has(k.type))
        ? blocks(kids, defs, '\n\n')
        : children(node, defs)
    }
  }
}

export function buildPlainText(markdown: string): string {
  const root = parseMarkdown(markdown)
  const text = blocks(root.children, collectDefinitions(root), '\n\n')
  return text.trim() === '' ? '' : `${text}\n`
}
