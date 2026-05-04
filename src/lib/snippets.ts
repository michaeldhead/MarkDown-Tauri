export interface Snippet {
  id: string
  name: string
  tag: string
  body: string
}

export const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 's1',
    name: 'Frontmatter',
    tag: 'meta',
    body: '---\ntitle: \ndate: \ntags: []\n---\n',
  },
  {
    id: 's2',
    name: 'Code Block',
    tag: 'code',
    body: '```\n\n```',
  },
  {
    id: 's3',
    name: 'Table (3×3)',
    tag: 'table',
    body:
      '| Header | Header | Header |\n' +
      '|--------|--------|--------|\n' +
      '| Cell   | Cell   | Cell   |\n' +
      '| Cell   | Cell   | Cell   |',
  },
  {
    id: 's4',
    name: 'Task List',
    tag: 'list',
    body: '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3',
  },
  {
    id: 's5',
    name: 'Blockquote',
    tag: 'format',
    body: '> ',
  },
  {
    id: 's6',
    name: 'Link',
    tag: 'insert',
    body: '[link text](https://)',
  },
  {
    id: 's7',
    name: 'Image',
    tag: 'insert',
    body: '![alt text](image-url)',
  },
  {
    id: 's8',
    name: 'Callout Note',
    tag: 'format',
    body: '> **Note:** ',
  },
  {
    id: 's9',
    name: 'Horizontal Rule',
    tag: 'format',
    body: '\n---\n',
  },
  {
    id: 's10',
    name: 'Bold',
    tag: 'format',
    body: '**text**',
  },
]
