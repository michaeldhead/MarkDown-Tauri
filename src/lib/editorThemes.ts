import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

// ── GHS Dark editor theme ──────────────────────────────────────────────────
// Matches the GHS Dark preview: gold H1, teal H2/H3, pink-red inline code,
// coral keywords, light-blue strings, purple functions, orange classes.

const ghsDarkBase = EditorView.theme(
  {
    '&': {
      backgroundColor: '#0d1117',
      color: '#e6edf3',
      height: '100%',
    },
    '.cm-content': {
      caretColor: '#58a6ff',
      // Font family + size inherited from the wrapper <div> driven by
      // user settings (Fix-V). Keeps the theme stable while letting the
      // Settings panel mutate type without rebuilding the extension.
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: '1.6',
      padding: '8px 0',
    },
    '.cm-cursor': { borderLeftColor: '#58a6ff' },
    // Translucent active-line background so the selection layer (which CM6
    // renders at z-index: -1, behind lines) bleeds through. The previous
    // opaque #161b22 painted over single-line selections, making them
    // invisible while multi-line drags looked fine because their final
    // cursor — and so the active-line — was outside the selected range.
    '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
    '.cm-activeLineGutter': { backgroundColor: '#161b22' },
    // Selection — !important is required because CodeMirror's internal
    // styles win otherwise. Focused state is brighter for clear visibility;
    // unfocused dims slightly so an open menu/dialog reads as the active
    // surface without losing the selection cue entirely.
    '.cm-selectionBackground': { backgroundColor: '#2d5f8f !important' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: '#3a7ac0 !important' },
    '::selection': { backgroundColor: '#3a7ac0' },
    '.cm-gutters': {
      backgroundColor: '#0d1117',
      color: '#7d8590',
      border: 'none',
      borderRight: '1px solid #30363d',
    },
    '.cm-gutter': { minWidth: '40px' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 4px' },
    '.cm-foldGutter': { color: '#7d8590' },
    '.cm-matchingBracket': {
      backgroundColor: '#3a7ac0',
      outline: '1px solid #79c0ff',
    },
    '.cm-searchMatch': {
      backgroundColor: '#2d3f50',
      outline: '1px solid #58a6ff',
    },
    '.cm-tooltip': {
      backgroundColor: '#21262d',
      border: '1px solid #30363d',
      color: '#e6edf3',
    },
  },
  { dark: true },
)

const ghsDarkHighlight = HighlightStyle.define([
  // Markdown headings — match preview colors
  { tag: tags.heading1, color: '#d4a843', fontWeight: '700', fontSize: '1.1em' },
  { tag: tags.heading2, color: '#4ec9b0', fontWeight: '600' },
  { tag: tags.heading3, color: '#4ec9b0', fontWeight: '600' },
  { tag: tags.heading, color: '#4ec9b0' }, // h4-h6 fallback

  // Markdown inline
  { tag: tags.emphasis, fontStyle: 'italic', color: '#e6edf3' },
  { tag: tags.strong, fontWeight: '700', color: '#e6edf3' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#7d8590' },

  // Code
  { tag: tags.monospace, color: '#f97583' }, // inline code — pink-red

  // Links
  { tag: tags.link, color: '#58a6ff', textDecoration: 'underline' },
  { tag: tags.url, color: '#79c0ff' },

  // Programming language tokens (inside fenced code blocks)
  { tag: tags.keyword, color: '#ff7b72' }, // coral red
  { tag: tags.operator, color: '#ff7b72' },
  { tag: tags.string, color: '#a5d6ff' }, // light blue
  { tag: tags.number, color: '#79c0ff' }, // blue
  { tag: tags.bool, color: '#79c0ff' },
  { tag: tags.null, color: '#79c0ff' },
  { tag: tags.function(tags.variableName), color: '#d2a8ff' }, // purple
  { tag: tags.definition(tags.variableName), color: '#d2a8ff' },
  { tag: tags.className, color: '#ffa657' }, // orange
  { tag: tags.typeName, color: '#ffa657' },
  { tag: tags.comment, color: '#8b949e', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#8b949e', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#8b949e', fontStyle: 'italic' },
  { tag: tags.attributeName, color: '#79c0ff' },
  { tag: tags.attributeValue, color: '#a5d6ff' },
  { tag: tags.variableName, color: '#e6edf3' },
  { tag: tags.propertyName, color: '#79c0ff' },
  { tag: tags.tagName, color: '#ff7b72' },
  { tag: tags.angleBracket, color: '#7d8590' },
  { tag: tags.punctuation, color: '#7d8590' },
  { tag: tags.separator, color: '#7d8590' },

  // Markdown-specific
  { tag: tags.quote, color: '#8b949e', fontStyle: 'italic' },
  { tag: tags.meta, color: '#7d8590' },
  { tag: tags.atom, color: '#79c0ff' },
])

export const ghsDarkTheme: Extension = [
  ghsDarkBase,
  syntaxHighlighting(ghsDarkHighlight),
]

// ── GHS Ink editor theme ───────────────────────────────────────────────────
// Matches the GHS Ink preview: steel-blue H1, forest-green H2/H3,
// pink-red inline code, GitHub-light syntax colors.

const ghsInkBase = EditorView.theme(
  {
    '&': {
      backgroundColor: '#ffffff',
      color: '#24292f',
      height: '100%',
    },
    '.cm-content': {
      caretColor: '#0550ae',
      // See GHS Dark — inherits from wrapper for live font updates.
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: '1.6',
      padding: '8px 0',
    },
    '.cm-cursor': { borderLeftColor: '#0550ae' },
    // Translucent active-line — see GHS Dark for the rationale. Same fix
    // applies to the white background.
    '.cm-activeLine': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
    '.cm-activeLineGutter': { backgroundColor: '#f6f8fa' },
    // Selection — same focus/blur split as GHS Dark, on a lighter palette
    // tuned for the white background. !important parallels the dark theme
    // for the same CodeMirror-internal-styles reason.
    '.cm-selectionBackground': { backgroundColor: '#a8c8f8 !important' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: '#90b8f0 !important' },
    '::selection': { backgroundColor: '#90b8f0' },
    '.cm-gutters': {
      backgroundColor: '#ffffff',
      color: '#57606a',
      border: 'none',
      borderRight: '1px solid #d0d7de',
    },
    '.cm-gutter': { minWidth: '40px' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 4px' },
    '.cm-foldGutter': { color: '#57606a' },
    '.cm-matchingBracket': {
      backgroundColor: '#b6d4fe',
      outline: '1px solid #0550ae',
    },
    '.cm-searchMatch': {
      backgroundColor: '#fff8c5',
      outline: '1px solid #d4a72c',
    },
    '.cm-tooltip': {
      backgroundColor: '#ffffff',
      border: '1px solid #d0d7de',
      color: '#24292f',
    },
  },
  { dark: false },
)

const ghsInkHighlight = HighlightStyle.define([
  // Markdown headings
  { tag: tags.heading1, color: '#0550ae', fontWeight: '700', fontSize: '1.1em' },
  { tag: tags.heading2, color: '#1a7f37', fontWeight: '600' },
  { tag: tags.heading3, color: '#1a7f37', fontWeight: '600' },
  { tag: tags.heading, color: '#0550ae' },

  // Markdown inline
  { tag: tags.emphasis, fontStyle: 'italic', color: '#24292f' },
  { tag: tags.strong, fontWeight: '700', color: '#24292f' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#57606a' },

  // Code
  { tag: tags.monospace, color: '#cf222e' }, // red for light mode

  // Links
  { tag: tags.link, color: '#0550ae', textDecoration: 'underline' },
  { tag: tags.url, color: '#0550ae' },

  // Programming language tokens
  { tag: tags.keyword, color: '#cf222e' },
  { tag: tags.operator, color: '#cf222e' },
  { tag: tags.string, color: '#0a3069' },
  { tag: tags.number, color: '#0550ae' },
  { tag: tags.bool, color: '#0550ae' },
  { tag: tags.null, color: '#0550ae' },
  { tag: tags.function(tags.variableName), color: '#6639ba' },
  { tag: tags.definition(tags.variableName), color: '#6639ba' },
  { tag: tags.className, color: '#953800' },
  { tag: tags.typeName, color: '#953800' },
  { tag: tags.comment, color: '#6e7781', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#6e7781', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#6e7781', fontStyle: 'italic' },
  { tag: tags.attributeName, color: '#0550ae' },
  { tag: tags.attributeValue, color: '#0a3069' },
  { tag: tags.variableName, color: '#24292f' },
  { tag: tags.propertyName, color: '#0550ae' },
  { tag: tags.tagName, color: '#cf222e' },
  { tag: tags.angleBracket, color: '#57606a' },
  { tag: tags.punctuation, color: '#57606a' },
  { tag: tags.separator, color: '#57606a' },

  // Markdown-specific
  { tag: tags.quote, color: '#57606a', fontStyle: 'italic' },
  { tag: tags.meta, color: '#57606a' },
  { tag: tags.atom, color: '#0550ae' },
])

export const ghsInkTheme: Extension = [
  ghsInkBase,
  syntaxHighlighting(ghsInkHighlight),
]
