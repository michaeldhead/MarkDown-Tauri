import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import type { Nodes, Root } from 'mdast'

export function parseMarkdown(markdown: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown)
}

// Depth-first, pre-order walk. The visitor gets each node and its parent
// (null for the root).
export function walk(
  node: Nodes,
  visitor: (node: Nodes, parent: Nodes | null) => void,
  parent: Nodes | null = null,
): void {
  visitor(node, parent)
  if ('children' in node) {
    for (const child of node.children as Nodes[]) walk(child, visitor, node)
  }
}
