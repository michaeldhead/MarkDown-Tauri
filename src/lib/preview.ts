import { unified, type Plugin } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { defaultSchema } from 'hast-util-sanitize'
import { visit } from 'unist-util-visit'
import type { Root } from 'mdast'
import type { Element, Root as HastRoot } from 'hast'

// Remark plugin: stamps block-level mdast nodes with a `data-source-line`
// attribute carrying their 1-based source line. The preview pane uses this
// for click-to-scroll headings (Fix-K), active-section highlight (Fix-K),
// and anchor-based scroll synchronization (Fix-M). Tagging non-heading
// blocks gives the scroll-sync code many anchor points so it can land
// exactly on the block at the editor's viewport top instead of guessing
// from a scroll ratio.
//
// `code` mdast nodes (fenced code blocks) become `<pre><code>` in HTML, but
// mdast-util-to-hast applies hProperties to the inner `<code>`. The
// `rehypeLiftCodeSourceLine` plugin below lifts the attribute to `<pre>`
// before sanitizing.
//
// `list` mdast nodes become `<ul>` or `<ol>` based on the `ordered` flag;
// the schema below allow-lists both.
const TAGGABLE_NODE_TYPES = new Set([
  'heading',
  'paragraph',
  'code',
  'blockquote',
  'list',
  'table',
])

const remarkSourceLines: Plugin<[], Root> = () => (tree) => {
  visit(tree, (node) => {
    if (!TAGGABLE_NODE_TYPES.has(node.type)) return
    const line = node.position?.start?.line
    if (line == null) return
    const data = (node.data ??= {})
    const hProperties = ((data as { hProperties?: Record<string, unknown> }).hProperties ??= {})
    hProperties['data-source-line'] = line
  })
}

// Rehype plugin: moves `data-source-line` from the inner `<code>` to its
// parent `<pre>`. The sanitize schema strips the attribute from `<code>`, so
// without this fenced code blocks would have no scroll-sync anchor.
const rehypeLiftCodeSourceLine: Plugin<[], HastRoot> = () => (tree) => {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'pre') return
    const code = node.children.find(
      (child): child is Element => child.type === 'element' && child.tagName === 'code',
    )
    const line = code?.properties?.['data-source-line']
    if (code == null || line == null) return
    node.properties['data-source-line'] = line
    delete code.properties['data-source-line']
  })
}

// rehype-highlight adds `hljs` and `hljs-{token}` classes. The default
// hast-util-sanitize schema only permits `className=/^language-./` on <code>
// and doesn't permit className on <span> at all, so the highlight markup
// would be stripped without these overrides. Heading levels need
// `data-source-line` allow-listed so the remark plugin's annotations survive
// sanitization.
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: ['className'],
    span: ['className'],
    h1: ['data-source-line'],
    h2: ['data-source-line'],
    h3: ['data-source-line'],
    h4: ['data-source-line'],
    h5: ['data-source-line'],
    h6: ['data-source-line'],
    p: ['data-source-line'],
    pre: ['data-source-line'],
    blockquote: ['data-source-line'],
    ul: ['data-source-line'],
    ol: ['data-source-line'],
    table: ['data-source-line'],
  },
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkSourceLines)
  .use(remarkRehype)
  .use(rehypeLiftCodeSourceLine)
  .use(rehypeHighlight, { detect: true, ignoreMissing: true })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify)

export async function renderMarkdown(md: string): Promise<string> {
  const file = await processor.process(md)
  return String(file)
}

const STYLED_HTML_CSS = `
  body {
    background-color: #1e1e2e;
    color: #cdd6f4;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 15px;
    line-height: 1.7;
    max-width: 760px;
    margin: 32px auto;
    padding: 0 24px;
  }
  h1, h2, h3, h4, h5, h6 { color: #cdd6f4; line-height: 1.3; margin: 1.5em 0 0.5em; font-weight: 600; }
  h1 { font-size: 2em; border-bottom: 1px solid #45475a; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #45475a; padding-bottom: 0.3em; }
  h3 { font-size: 1.25em; }
  h4 { font-size: 1em; }
  h5, h6 { color: #6c7086; }
  a { color: #89b4fa; }
  code { background: #313147; color: #89b4fa; padding: 0.15em 0.4em; border-radius: 4px;
         font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 0.9em; }
  pre { background: #181825; border: 1px solid #45475a; border-radius: 6px;
        padding: 12px 16px; overflow-x: auto; }
  pre code { background: transparent; color: #cdd6f4; padding: 0; }
  blockquote { border-left: 4px solid #89b4fa; background: #2a2a3d; padding: 0.25em 1em;
               margin: 1em 0; color: #6c7086; border-radius: 0 4px 4px 0; }
  ul, ol { padding-left: 1.75em; }
  hr { border: none; border-top: 1px solid #45475a; margin: 2em 0; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #45475a; padding: 0.5em 0.75em; text-align: left; }
  th { background: #2a2a3d; font-weight: 600; }
  img { max-width: 100%; border-radius: 4px; }
`

export function wrapAsStyledHtml(bodyHtml: string, title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${STYLED_HTML_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`
}

export function wrapAsCleanHtml(bodyHtml: string, title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
</head>
<body>
${bodyHtml}
</body>
</html>
`
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
