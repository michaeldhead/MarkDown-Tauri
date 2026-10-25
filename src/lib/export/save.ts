import { invoke } from '@tauri-apps/api/core'

export interface SaveFilter {
  name: string
  extensions: string[]
}

export async function saveTextExport(
  defaultName: string,
  filters: SaveFilter[],
  text: string,
): Promise<void> {
  const path = await invoke<string | null>('save_dialog', {
    defaultName,
    filters,
  })
  if (!path) return
  await invoke('write_file', { path, content: text })
}

export async function saveBinaryExport(
  defaultName: string,
  filters: SaveFilter[],
  bytes: Uint8Array,
): Promise<void> {
  const path = await invoke<string | null>('save_dialog', {
    defaultName,
    filters,
  })
  if (!path) return
  // A bare Uint8Array in the args does not serialize to a JSON array.
  await invoke('write_file_bytes', { path, bytes: Array.from(bytes) })
}
