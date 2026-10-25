import { basename, stripExt } from '../paths'
import { stripKnownTags } from './htmlText'
import { parseMarkdown, walk } from './parse'

const MAX_LENGTH = 80
const RESERVED = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i

function lineText(line: string): string {
  let out = ''
  walk(parseMarkdown(line), (node) => {
    if (node.type === 'text' || node.type === 'inlineCode') out += node.value
    else if (node.type === 'image') out += node.alt ?? ''
    else if (node.type === 'html') out += stripKnownTags(node.value)
    else if (node.type === 'break') out += ' '
  })
  return out
}

export function deriveExportBaseName(
  markdown: string,
  filePath: string | null,
): string {
  const line = markdown.split(/\r\n|\r|\n/).find((l) => l.trim() !== '')
  const name = (line === undefined ? '' : lineText(line.trim()))
    .replace(/\s+/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_LENGTH)
    .replace(/[. ]+$/, '')
  if (name !== '' && !RESERVED.test(name)) return name
  return (filePath ? stripExt(basename(filePath)) : '') || 'untitled'
}
