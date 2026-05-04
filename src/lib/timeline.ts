export function snapshotFilename(date: Date = new Date()): string {
  const iso = date.toISOString()
  // Replace colons (illegal on Windows) with hyphens, drop the milliseconds.
  return `${iso.replace(/:/g, '-').replace(/\.\d+Z$/, 'Z')}.md`
}

export function parseSnapshotDate(filename: string): Date {
  const stem = filename.replace(/\.md$/, '')
  // Reverse only the two hyphens that came from colons in HH:MM:SS — the
  // last two `-NN-NN` groups before the trailing `Z`.
  const iso = stem.replace(/-(\d{2})-(\d{2})Z$/, ':$1:$2Z')
  return new Date(iso)
}

export function formatSnapshotDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return '(invalid date)'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function slugFromPath(filePath: string): string {
  const base = filePath.split(/[\\/]/).pop() ?? 'untitled'
  const stem = base.replace(/\.[^.]+$/, '')
  const cleaned = stem.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 64)
  return cleaned || 'untitled'
}
