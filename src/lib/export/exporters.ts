import { buildHtmlClean, buildHtmlStyled } from './html'
import { buildPlainText } from './plainText'
import { deriveExportBaseName } from './fileName'
import { saveTextExport, type SaveFilter } from './save'

export interface ExportDoc {
  markdown: string
  filePath: string | null
}

type Save = (
  defaultName: string,
  filters: SaveFilter[],
  text: string,
) => Promise<void>

type HtmlBuild = (markdown: string, title: string) => Promise<string>
type TextBuild = (markdown: string) => string

interface Deps<B> {
  build?: B
  save?: Save
}

const HTML_FILTERS: SaveFilter[] = [{ name: 'HTML', extensions: ['html', 'htm'] }]
const TEXT_FILTERS: SaveFilter[] = [{ name: 'Text', extensions: ['txt'] }]

async function exportHtml(
  doc: ExportDoc,
  build: HtmlBuild,
  save: Save,
): Promise<void> {
  const base = deriveExportBaseName(doc.markdown, doc.filePath)
  const html = await build(doc.markdown, base)
  await save(`${base}.html`, HTML_FILTERS, html)
}

export function exportHtmlStyled(
  doc: ExportDoc,
  deps: Deps<HtmlBuild> = {},
): Promise<void> {
  return exportHtml(doc, deps.build ?? buildHtmlStyled, deps.save ?? saveTextExport)
}

export function exportHtmlClean(
  doc: ExportDoc,
  deps: Deps<HtmlBuild> = {},
): Promise<void> {
  return exportHtml(doc, deps.build ?? buildHtmlClean, deps.save ?? saveTextExport)
}

export async function exportPlainText(
  doc: ExportDoc,
  deps: Deps<TextBuild> = {},
): Promise<void> {
  const build = deps.build ?? buildPlainText
  const save = deps.save ?? saveTextExport
  const base = deriveExportBaseName(doc.markdown, doc.filePath)
  await save(`${base}.txt`, TEXT_FILTERS, build(doc.markdown))
}
