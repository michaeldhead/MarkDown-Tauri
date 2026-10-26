import type * as Docx from 'docx'
import type { List, ListItem, Nodes, Table } from 'mdast'
import { parseMarkdown, walk } from './parse'
import { stripTags } from './htmlText'

type Lib = typeof Docx
type Block = Docx.Paragraph | Docx.Table
type Inline = Docx.TextRun | Docx.ExternalHyperlink
type Definitions = Map<string, string>

interface Ctx {
  bold: boolean
  italic: boolean
  strike: boolean
  underline: boolean
  color?: string
}

interface Env {
  lib: Lib
  defs: Definitions
  quote: boolean
  // Next numbering instance, so each ordered list restarts at 1.
  instances: { next: number }
}

interface ParaOpts {
  heading?: (typeof Docx.HeadingLevel)[keyof typeof Docx.HeadingLevel]
  numbering?: { reference: string; level: number; instance?: number }
  indentLeft?: number
}

const BLUE = '1D4ED8'
const GRAY = 'F3F4F6'
const RULE = 'D1D5DB'
const MUTED = '6B7280'
const BODY = '1F2937'
const CODE_RED = '991B1B'
const FONT = 'Arial'
const MONO = 'Courier New'

const PAGE_WIDTH = 12240
const PAGE_HEIGHT = 15840
const MARGIN = 1440
const CONTENT_WIDTH = 9360
const INDENT = 720
const HANGING = 360
const MAX_LEVEL = 8

const BULLET_REF = 'bullets'
const ORDERED_REF = 'ordered'
const BULLET_CHARS = ['•', '◦', '▪']

const SAFE_URL = /^(https?|mailto):/i

// Point size, color and spacing (twips) for Heading1 to Heading4.
const HEADINGS = [
  { size: 24, color: BLUE, before: 360, after: 160 },
  { size: 20, color: BODY, before: 320, after: 140 },
  { size: 16, color: BODY, before: 280, after: 120 },
  { size: 13, color: BODY, before: 240, after: 100 },
]

function collectDefinitions(root: Nodes): Definitions {
  const defs: Definitions = new Map()
  walk(root, (node) => {
    if (node.type === 'definition') defs.set(node.identifier, node.url)
  })
  return defs
}

// Soft line breaks become a single space; a TextRun never holds a newline.
function flat(text: string): string {
  return text.replace(/\r\n|\r|\n/g, ' ')
}

function run(env: Env, text: string, ctx: Ctx, code = false): Docx.TextRun {
  const { TextRun, UnderlineType } = env.lib
  return new TextRun({
    text: flat(text),
    bold: ctx.bold || undefined,
    italics: ctx.italic || undefined,
    strike: ctx.strike || undefined,
    color: code ? CODE_RED : ctx.color,
    font: code ? MONO : undefined,
    underline: ctx.underline ? { type: UnderlineType.SINGLE } : undefined,
  })
}

function inlineRuns(nodes: Nodes[], env: Env, ctx: Ctx): Inline[] {
  return nodes.flatMap((n) => inline(n, env, ctx))
}

function childRuns(node: Nodes, env: Env, ctx: Ctx): Inline[] {
  if (!('children' in node)) return []
  return inlineRuns(node.children as Nodes[], env, ctx)
}

function linkRuns(
  node: Nodes,
  url: string | undefined,
  env: Env,
  ctx: Ctx,
): Inline[] {
  if (!url || !SAFE_URL.test(url)) return childRuns(node, env, ctx)
  const runs = childRuns(node, env, { ...ctx, color: BLUE, underline: true })
  return [new env.lib.ExternalHyperlink({ link: url, children: runs })]
}

function inline(node: Nodes, env: Env, ctx: Ctx): Inline[] {
  switch (node.type) {
    case 'text':
      return [run(env, node.value, ctx)]
    case 'inlineCode':
      return [run(env, node.value, ctx, true)]
    case 'break':
      return [new env.lib.TextRun({ break: 1 })]
    case 'html':
      return [run(env, stripTags(node.value), ctx)]
    case 'image':
    case 'imageReference':
      return [run(env, `[image: ${node.alt ?? ''}]`, ctx)]
    case 'strong':
      return childRuns(node, env, { ...ctx, bold: true })
    case 'emphasis':
      return childRuns(node, env, { ...ctx, italic: true })
    case 'delete':
      return childRuns(node, env, { ...ctx, strike: true })
    case 'link':
      return linkRuns(node, node.url, env, ctx)
    case 'linkReference':
      return linkRuns(node, env.defs.get(node.identifier), env, ctx)
    default:
      return childRuns(node, env, ctx)
  }
}

function paragraph(
  env: Env,
  children: Inline[],
  opts: ParaOpts = {},
): Docx.Paragraph {
  const { Paragraph, BorderStyle } = env.lib
  const quoted = env.quote && !opts.heading
  let left = opts.indentLeft
  if (quoted && !opts.numbering) left = left ?? HANGING
  return new Paragraph({
    heading: opts.heading,
    numbering: opts.numbering,
    indent: left === undefined ? undefined : { left },
    border: quoted
      ? { left: { style: BorderStyle.SINGLE, size: 18, color: RULE, space: 8 } }
      : undefined,
    spacing: opts.heading ? undefined : { after: 160 },
    children,
  })
}

function textParagraph(
  env: Env,
  nodes: Nodes[],
  ctx: Ctx,
  opts: ParaOpts = {},
): Docx.Paragraph {
  return paragraph(env, inlineRuns(nodes, env, ctx), opts)
}

function borders(lib: Lib) {
  const side = { style: lib.BorderStyle.SINGLE, size: 4, color: RULE }
  return { top: side, bottom: side, left: side, right: side }
}

// Keeps a table from running into the next block or merging with another table.
function spacer(env: Env): Docx.Paragraph {
  return new env.lib.Paragraph({ spacing: { after: 120 }, children: [] })
}

function codeBlock(
  env: Env,
  lang: string | null | undefined,
  value: string,
): Block[] {
  const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType } =
    env.lib
  const out: Block[] = []
  if (lang) {
    out.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: flat(lang), font: FONT, size: 16, color: MUTED }),
        ],
      }),
    )
  }
  const lines = value.split(/\r\n|\r|\n/).map(
    (line) =>
      new Paragraph({
        children: line ? [new TextRun({ text: line, font: MONO, size: 19 })] : [],
      }),
  )
  out.push(
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [CONTENT_WIDTH],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: CONTENT_WIDTH, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: GRAY, color: 'auto' },
              borders: borders(env.lib),
              margins: { top: 100, bottom: 100, left: 160, right: 160 },
              children: lines,
            }),
          ],
        }),
      ],
    }),
    spacer(env),
  )
  return out
}

function tableBlock(node: Table, env: Env, ctx: Ctx): Block[] {
  const { Table, TableRow, TableCell, Paragraph, WidthType, ShadingType } =
    env.lib
  const columns = Math.max(...node.children.map((r) => r.children.length))
  const colWidth = Math.floor(CONTENT_WIDTH / columns)
  const rows = node.children.map((row, r) => {
    const head = r === 0
    const cellCtx: Ctx = head ? { ...ctx, bold: true, color: 'FFFFFF' } : ctx
    const cell = (children: Block[]) =>
      new TableCell({
        width: { size: colWidth, type: WidthType.DXA },
        shading: head
          ? { type: ShadingType.CLEAR, fill: BLUE, color: 'auto' }
          : undefined,
        borders: borders(env.lib),
        children: children as Docx.Paragraph[],
      })
    const cells = row.children.map((c) =>
      cell([paragraph(env, inlineRuns(c.children, env, cellCtx))]),
    )
    for (let i = cells.length; i < columns; i++) {
      cells.push(cell([new Paragraph({ children: [] })]))
    }
    return new TableRow({ tableHeader: head, children: cells })
  })
  return [
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: Array<number>(columns).fill(colWidth),
      rows,
    }),
    spacer(env),
  ]
}

function listItem(
  item: ListItem,
  list: List,
  env: Env,
  ctx: Ctx,
  level: number,
  instance: number,
): Block[] {
  const numbering = {
    reference: list.ordered ? ORDERED_REF : BULLET_REF,
    level,
    instance: list.ordered ? instance : undefined,
  }
  const box = item.checked == null ? '' : item.checked ? '☑ ' : '☐ '
  const out: Block[] = []
  let rest = item.children
  const first = rest[0]
  if (first?.type === 'paragraph') {
    const runs = inlineRuns(first.children, env, ctx)
    if (box) runs.unshift(run(env, box, ctx))
    out.push(paragraph(env, runs, { numbering }))
    rest = rest.slice(1)
  } else {
    out.push(paragraph(env, box ? [run(env, box, ctx)] : [], { numbering }))
  }
  const indentLeft = INDENT * (level + 1)
  for (const child of rest) {
    if (child.type === 'list') {
      out.push(...listBlock(child, env, ctx, level + 1))
    } else if (child.type === 'paragraph') {
      out.push(textParagraph(env, child.children, ctx, { indentLeft }))
    } else {
      out.push(...block(child, env, ctx))
    }
  }
  return out
}

function listBlock(node: List, env: Env, ctx: Ctx, depth: number): Block[] {
  const level = Math.min(depth, MAX_LEVEL)
  const instance = node.ordered ? env.instances.next++ : 0
  return node.children.flatMap((item) =>
    listItem(item, node, env, ctx, level, instance),
  )
}

function blocks(nodes: Nodes[], env: Env, ctx: Ctx): Block[] {
  return nodes.flatMap((n) => block(n, env, ctx))
}

function block(node: Nodes, env: Env, ctx: Ctx): Block[] {
  const { HeadingLevel, Paragraph, BorderStyle } = env.lib
  switch (node.type) {
    case 'definition':
      return []
    case 'paragraph':
      return [textParagraph(env, node.children, ctx)]
    case 'heading': {
      const levels = [
        HeadingLevel.HEADING_1,
        HeadingLevel.HEADING_2,
        HeadingLevel.HEADING_3,
        HeadingLevel.HEADING_4,
      ]
      return [
        textParagraph(env, node.children, ctx, {
          heading: levels[Math.min(node.depth, 4) - 1],
        }),
      ]
    }
    case 'code':
      return codeBlock(env, node.lang, node.value)
    case 'blockquote':
      return blocks(
        node.children,
        { ...env, quote: true },
        { ...ctx, italic: true, color: MUTED },
      )
    case 'list':
      return listBlock(node, env, ctx, 0)
    case 'thematicBreak':
      return [
        new Paragraph({
          spacing: { before: 120, after: 120 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 1 },
          },
          children: [],
        }),
      ]
    case 'table':
      return tableBlock(node, env, ctx)
    default:
      if (!('children' in node)) return [textParagraph(env, [node], ctx)]
      return blocks(node.children as Nodes[], env, ctx)
  }
}

function numberingLevels(lib: Lib, format: (typeof Docx.LevelFormat)[keyof typeof Docx.LevelFormat], ordered: boolean) {
  return Array.from({ length: MAX_LEVEL + 1 }, (_, level) => ({
    level,
    format,
    text: ordered ? `%${level + 1}.` : BULLET_CHARS[level % BULLET_CHARS.length],
    alignment: lib.AlignmentType.LEFT,
    style: {
      paragraph: { indent: { left: INDENT * (level + 1), hanging: HANGING } },
    },
  }))
}

export function buildDocxDocument(
  markdown: string,
  title: string,
  lib: Lib,
): Docx.Document {
  const root = parseMarkdown(markdown)
  const env: Env = {
    lib,
    defs: collectDefinitions(root),
    quote: false,
    instances: { next: 1 },
  }
  const ctx: Ctx = { bold: false, italic: false, strike: false, underline: false }
  return new lib.Document({
    title,
    styles: {
      default: {
        document: { run: { font: FONT, size: 22, color: BODY } },
      },
      paragraphStyles: HEADINGS.map((h, i) => ({
        id: `Heading${i + 1}`,
        name: `Heading ${i + 1}`,
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { font: FONT, bold: true, size: h.size * 2, color: h.color },
        paragraph: {
          spacing: { before: h.before, after: h.after },
          outlineLevel: i,
        },
      })),
    },
    numbering: {
      config: [
        {
          reference: BULLET_REF,
          levels: numberingLevels(lib, lib.LevelFormat.BULLET, false),
        },
        {
          reference: ORDERED_REF,
          levels: numberingLevels(lib, lib.LevelFormat.DECIMAL, true),
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: {
              top: MARGIN,
              right: MARGIN,
              bottom: MARGIN,
              left: MARGIN,
            },
          },
        },
        children: blocks(root.children, env, ctx),
      },
    ],
  })
}

export async function buildDocxBlob(
  markdown: string,
  title: string,
): Promise<Blob> {
  const lib = await import('docx')
  return lib.Packer.toBlob(buildDocxDocument(markdown, title, lib))
}
