import type { ReactElement, ReactNode } from 'react'
import type {
  Document,
  DocumentProps,
  Link,
  Page,
  Text,
  View,
} from '@react-pdf/renderer'
import type { List, Nodes, Table } from 'mdast'
import { parseMarkdown, walk } from './parse'
import { stripTags } from './htmlText'

export interface PdfComponents {
  Document: typeof Document
  Page: typeof Page
  View: typeof View
  Text: typeof Text
  Link: typeof Link
}

type Style = Record<string, string | number>
type Definitions = Map<string, string>

interface Ctx {
  bold: boolean
  italic: boolean
  strike: boolean
}

interface Env {
  c: PdfComponents
  defs: Definitions
  // Text color override: muted in blockquotes, white in the table header.
  color?: string
}

const BLUE = '#1D4ED8'
const GRAY = '#F3F4F6'
const RULE = '#D1D5DB'
const MUTED = '#6B7280'

const PAGE: Style = {
  padding: 72,
  fontFamily: 'Helvetica',
  fontSize: 11,
  color: '#1F2937',
}
const BLOCK: Style = { marginBottom: 10 }
const PARAGRAPH: Style = { ...BLOCK, lineHeight: 1.6 }
const HEADINGS: Style[] = [
  {
    ...BLOCK,
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    paddingBottom: 4,
  },
  { ...BLOCK, fontSize: 20, fontFamily: 'Helvetica-Bold' },
  { ...BLOCK, fontSize: 16, fontFamily: 'Helvetica-Bold' },
  { ...BLOCK, fontSize: 13, fontFamily: 'Helvetica-Bold' },
]
const H1_RULE: Style = {
  borderBottomWidth: 1,
  borderBottomColor: BLUE,
  marginBottom: 10,
}
const INLINE_CODE: Style = {
  fontFamily: 'Courier',
  backgroundColor: GRAY,
  color: '#991B1B',
}
const CODE_BOX: Style = {
  ...BLOCK,
  backgroundColor: GRAY,
  padding: 8,
  borderRadius: 3,
}
const CODE_LABEL: Style = { fontSize: 8, color: MUTED, marginBottom: 4 }
const CODE_TEXT: Style = { fontFamily: 'Courier', fontSize: 9.5 }
const QUOTE: Style = {
  ...BLOCK,
  borderLeftWidth: 3,
  borderLeftColor: RULE,
  paddingLeft: 10,
}
const LIST_ITEM: Style = { flexDirection: 'row', marginBottom: 4 }
const LIST_MARKER: Style = { width: 24 }
const LIST_BODY: Style = { flex: 1 }
const LIST_NESTED: Style = { ...BLOCK, marginLeft: 12 }
const RULE_STYLE: Style = {
  borderBottomWidth: 1,
  borderBottomColor: RULE,
  marginVertical: 12,
}
const LINK: Style = { color: BLUE, textDecoration: 'underline' }
const ROW: Style = { flexDirection: 'row' }
const CELL: Style = {
  flex: 1,
  padding: 4,
  borderWidth: 0.5,
  borderColor: RULE,
}
const HEADER_CELL: Style = { ...CELL, backgroundColor: BLUE }

const SAFE_URL = /^(https?|mailto):/i

function collectDefinitions(root: Nodes): Definitions {
  const defs: Definitions = new Map()
  walk(root, (node) => {
    if (node.type === 'definition') defs.set(node.identifier, node.url)
  })
  return defs
}

function fontFor(ctx: Ctx): string {
  if (ctx.bold && ctx.italic) return 'Helvetica-BoldOblique'
  if (ctx.bold) return 'Helvetica-Bold'
  if (ctx.italic) return 'Helvetica-Oblique'
  return 'Helvetica'
}

function run(
  env: Env,
  text: string,
  ctx: Ctx,
  key: string,
  code = false,
): ReactElement {
  const { Text } = env.c
  const style: Style = code ? { ...INLINE_CODE } : { fontFamily: fontFor(ctx) }
  if (ctx.strike) style.textDecoration = 'line-through'
  return (
    <Text key={key} style={style}>
      {text}
    </Text>
  )
}

function inlineRuns(
  nodes: Nodes[],
  env: Env,
  ctx: Ctx,
  prefix: string,
): ReactElement[] {
  return nodes.flatMap((n, i) => inline(n, env, ctx, `${prefix}-${i}`))
}

function childRuns(node: Nodes, env: Env, ctx: Ctx, key: string): ReactElement[] {
  if (!('children' in node)) return []
  return inlineRuns(node.children as Nodes[], env, ctx, key)
}

function linkRuns(
  node: Nodes,
  url: string | undefined,
  env: Env,
  ctx: Ctx,
  key: string,
): ReactElement[] {
  const runs = childRuns(node, env, ctx, key)
  if (!url || !SAFE_URL.test(url)) return runs
  const { Link } = env.c
  return [
    <Link key={key} src={url} style={LINK}>
      {runs}
    </Link>,
  ]
}

function inline(node: Nodes, env: Env, ctx: Ctx, key: string): ReactElement[] {
  switch (node.type) {
    case 'text':
      return [run(env, node.value, ctx, key)]
    case 'inlineCode':
      return [run(env, node.value, ctx, key, true)]
    case 'break':
      return [run(env, '\n', ctx, key)]
    case 'html':
      return [run(env, stripTags(node.value), ctx, key)]
    case 'image':
    case 'imageReference':
      return [run(env, `[image: ${node.alt ?? ''}]`, ctx, key)]
    case 'strong':
      return childRuns(node, env, { ...ctx, bold: true }, key)
    case 'emphasis':
      return childRuns(node, env, { ...ctx, italic: true }, key)
    case 'delete':
      return childRuns(node, env, { ...ctx, strike: true }, key)
    case 'link':
      return linkRuns(node, node.url, env, ctx, key)
    case 'linkReference':
      return linkRuns(node, env.defs.get(node.identifier), env, ctx, key)
    default:
      return childRuns(node, env, ctx, key)
  }
}

function textBlock(
  env: Env,
  nodes: Nodes[],
  ctx: Ctx,
  style: Style,
  key: string,
): ReactElement {
  const { Text } = env.c
  const merged = env.color ? { ...style, color: env.color } : style
  return (
    <Text key={key} style={merged}>
      {inlineRuns(nodes, env, ctx, key)}
    </Text>
  )
}

function blocks(
  nodes: Nodes[],
  env: Env,
  ctx: Ctx,
  prefix: string,
): ReactElement[] {
  return nodes.flatMap((n, i) => block(n, env, ctx, `${prefix}-${i}`))
}

function tableBlock(node: Table, env: Env, ctx: Ctx, key: string): ReactElement {
  const { View, Text } = env.c
  return (
    <View key={key} style={BLOCK}>
      {node.children.map((row, r) => (
        <View key={`${key}-${r}`} style={ROW}>
          {row.children.map((cell, i) => {
            const head = r === 0
            const cellKey = `${key}-${r}-${i}`
            const cellCtx = head ? { ...ctx, bold: true } : ctx
            const cellEnv = head ? { ...env, color: '#FFFFFF' } : env
            return (
              <View key={cellKey} style={head ? HEADER_CELL : CELL}>
                <Text style={cellEnv.color ? { color: cellEnv.color } : {}}>
                  {inlineRuns(cell.children, cellEnv, cellCtx, cellKey)}
                </Text>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function listBlock(
  node: List,
  env: Env,
  ctx: Ctx,
  key: string,
  nested: boolean,
): ReactElement {
  const { View, Text } = env.c
  const start = node.start ?? 1
  return (
    <View key={key} style={nested ? LIST_NESTED : BLOCK}>
      {node.children.map((item, i) => {
        const itemKey = `${key}-${i}`
        let marker = node.ordered ? `${start + i}.` : '•'
        if (item.checked != null) {
          const box = item.checked ? '☑' : '☐'
          marker = node.ordered ? `${marker} ${box}` : box
        }
        return (
          <View key={itemKey} style={LIST_ITEM}>
            <Text style={LIST_MARKER}>{marker}</Text>
            <View style={LIST_BODY}>
              {item.children.flatMap((child, j) =>
                child.type === 'list'
                  ? [listBlock(child, env, ctx, `${itemKey}-${j}`, true)]
                  : block(child, env, ctx, `${itemKey}-${j}`),
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

function block(node: Nodes, env: Env, ctx: Ctx, key: string): ReactElement[] {
  const { View, Text } = env.c
  switch (node.type) {
    case 'definition':
      return []
    case 'paragraph':
      return [textBlock(env, node.children, ctx, PARAGRAPH, key)]
    case 'heading': {
      const style = HEADINGS[Math.min(node.depth, 4) - 1]
      if (node.depth !== 1) return [textBlock(env, node.children, ctx, style, key)]
      return [
        <View key={key} style={H1_RULE}>
          {textBlock(
            env,
            node.children,
            ctx,
            { ...style, marginBottom: 0 },
            `${key}-h`,
          )}
        </View>,
      ]
    }
    case 'code': {
      const label: ReactNode = node.lang ? (
        <Text style={CODE_LABEL}>{node.lang}</Text>
      ) : null
      return [
        <View key={key} style={CODE_BOX}>
          {label}
          <Text style={CODE_TEXT}>{node.value}</Text>
        </View>,
      ]
    }
    case 'blockquote':
      return [
        <View key={key} style={QUOTE}>
          {blocks(
            node.children,
            { ...env, color: MUTED },
            { ...ctx, italic: true },
            key,
          )}
        </View>,
      ]
    case 'list':
      return [listBlock(node, env, ctx, key, false)]
    case 'thematicBreak':
      return [<View key={key} style={RULE_STYLE} />]
    case 'table':
      return [tableBlock(node, env, ctx, key)]
    default:
      if (!('children' in node)) {
        return [textBlock(env, [node], ctx, PARAGRAPH, key)]
      }
      return blocks(node.children as Nodes[], env, ctx, key)
  }
}

export function buildPdfDocument(
  markdown: string,
  title: string,
  components: PdfComponents,
): ReactElement {
  const { Document, Page } = components
  const root = parseMarkdown(markdown)
  const env: Env = { c: components, defs: collectDefinitions(root) }
  const ctx: Ctx = { bold: false, italic: false, strike: false }
  return (
    <Document title={title}>
      <Page size="LETTER" style={PAGE}>
        {blocks(root.children, env, ctx, 'b')}
      </Page>
    </Document>
  )
}

export async function buildPdfBlob(
  markdown: string,
  title: string,
): Promise<Blob> {
  const lib = await import('@react-pdf/renderer')
  const doc = buildPdfDocument(markdown, title, lib)
  return lib.pdf(doc as ReactElement<DocumentProps>).toBlob()
}
