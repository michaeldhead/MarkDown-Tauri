import { escapeHtml, renderMarkdown } from '../preview'

// Approximates the look of docx.ts: Arial 11pt body, blue H1.
const STYLE = `
body { margin: 0; padding: 24px; background: #e5e7eb; }
.page { box-sizing: border-box; max-width: 816px; margin: 0 auto; padding: 72px; background: #ffffff; color: #1f2937; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
h1 { font-size: 24pt; color: #1d4ed8; }
h2 { font-size: 20pt; }
h3 { font-size: 16pt; }
h4, h5, h6 { font-size: 13pt; }
a { color: #1d4ed8; }
pre, code { font-family: 'Courier New', monospace; }
pre { background: #f3f4f6; padding: 8px; overflow-x: auto; }
blockquote { margin-left: 0; padding-left: 12px; border-left: 3px solid #d1d5db; color: #6b7280; }
table { border-collapse: collapse; }
th, td { border: 1px solid #d1d5db; padding: 4px 8px; }
th { background: #1d4ed8; color: #ffffff; }
img { max-width: 100%; }
`

export async function buildWordPreviewHtml(
  markdown: string,
  title: string,
): Promise<string> {
  const body = await renderMarkdown(markdown)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="page">
${body}
</div>
</body>
</html>
`
}
