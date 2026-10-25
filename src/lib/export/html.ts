import {
  renderMarkdown,
  wrapAsCleanHtml,
  wrapAsStyledHtml,
} from '../preview'

export async function buildHtmlStyled(
  markdown: string,
  title: string,
): Promise<string> {
  return wrapAsStyledHtml(await renderMarkdown(markdown), title)
}

export async function buildHtmlClean(
  markdown: string,
  title: string,
): Promise<string> {
  return wrapAsCleanHtml(await renderMarkdown(markdown), title)
}
