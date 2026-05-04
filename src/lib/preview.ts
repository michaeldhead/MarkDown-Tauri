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

// Remark plugin: stamps block-level mdast nodes with a `data-source-line`
// attribute carrying their 1-based source line. The preview pane uses this
// for click-to-scroll headings (Fix-K), active-section highlight (Fix-K),
// and anchor-based scroll synchronization (Fix-M). Tagging non-heading
// blocks gives the scroll-sync code many anchor points so it can land
// exactly on the block at the editor's viewport top instead of guessing
// from a scroll ratio.
//
// `code` mdast nodes (fenced code blocks) become `<pre><code>` in HTML;
// `data-source-line` ends up on the outer `<pre>` because that's where
// mdast-util-to-hast applies hProperties for the code handler.
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

const PRINT_HTML_CSS = `
  @page { margin: 18mm 16mm; }
  body { font-family: Georgia, "Times New Roman", serif;
         font-size: 11pt; line-height: 1.55; color: #1a1a1a; background: #fff;
         margin: 0; padding: 0; }
  h1, h2, h3, h4, h5, h6 { color: #000; line-height: 1.2;
                            margin: 1.2em 0 0.4em; font-weight: 700;
                            page-break-after: avoid; }
  h1 { font-size: 22pt; border-bottom: 1px solid #999; padding-bottom: 4pt; }
  h2 { font-size: 17pt; border-bottom: 1px solid #ccc; padding-bottom: 3pt; }
  h3 { font-size: 14pt; }
  h4 { font-size: 12pt; }
  h5, h6 { font-size: 11pt; color: #444; }
  p { margin: 0.5em 0; }
  a { color: #0050a0; text-decoration: underline; }
  code { font-family: "Consolas", "Courier New", monospace;
         background: #f0f0f0; padding: 1pt 4pt; border-radius: 2pt;
         font-size: 0.92em; }
  pre { background: #f6f6f6; border: 1px solid #ddd; padding: 8pt 10pt;
        border-radius: 3pt; overflow: hidden;
        page-break-inside: avoid; }
  pre code { background: transparent; padding: 0; font-size: 9.5pt; }
  blockquote { border-left: 3pt solid #888; padding: 0 12pt;
               margin: 0.8em 0; color: #444; font-style: italic; }
  ul, ol { padding-left: 1.6em; margin: 0.5em 0; }
  li { margin: 0.15em 0; }
  hr { border: 0; border-top: 1px solid #ccc; margin: 1.4em 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.8em 0;
          page-break-inside: avoid; }
  th, td { border: 1px solid #888; padding: 4pt 7pt; text-align: left;
           font-size: 10pt; }
  th { background: #efefef; font-weight: 700; }
  img { max-width: 100%; }
`

export function wrapAsPrintHtml(bodyHtml: string, title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${PRINT_HTML_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`
}

/**
 * Renders the current document and triggers the OS print dialog through a
 * hidden iframe. The user can choose "Microsoft Print to PDF" to save as PDF.
 * Printing the iframe (rather than `window.print()`) keeps toolbar / sidebar /
 * editor chrome out of the printout regardless of the current view mode.
 */
export async function printDocumentAsPdf(content: string, title: string): Promise<void> {
  const body = await renderMarkdown(content)
  const html = wrapAsPrintHtml(body, title)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  } as Partial<CSSStyleDeclaration>)

  document.body.appendChild(iframe)
  await new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve()
    iframe.onerror = () => reject(new Error('Print iframe failed to load'))
    iframe.srcdoc = html
  })

  try {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
  } finally {
    // Give the print dialog a beat to take ownership of the iframe before removing it.
    window.setTimeout(() => {
      iframe.remove()
    }, 1500)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
