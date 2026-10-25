// Known HTML element names. File-name derivation strips only these, so a
// stray `<c>` in prose survives as text.
const TAG_NAMES =
  'a|abbr|b|blockquote|br|caption|center|cite|code|dd|del|details|div|dl|dt|em|font|h[1-6]|hr|i|img|ins|kbd|li|mark|ol|p|pre|q|s|samp|small|span|strike|strong|sub|summary|sup|table|tbody|td|tfoot|th|thead|tr|tt|u|ul|var|script|style|iframe|input|button|form|label|section|article|nav|header|footer|main|aside|figure|figcaption|video|audio|source'

const KNOWN_TAG = new RegExp(`</?(?:${TAG_NAMES})(?:\\s[^>]*)?/?>`, 'gi')

// Strips every tag, keeping the text between them.
export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

// Strips only recognised HTML tags and comments.
export function stripKnownTags(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(KNOWN_TAG, '')
}
