import { mockIPC, mockWindows } from '@tauri-apps/api/mocks'

export const BROWSER_HARNESS_MARKER = 'ghs-tauri-browser-harness'

export function shouldInstallBrowserMocks(isDev: boolean, win: object): boolean {
  return isDev && !('__TAURI_INTERNALS__' in win)
}

export function handleMockCommand(cmd: string, _args?: unknown): unknown {
  switch (cmd) {
    case 'get_app_data_dir':
      return 'C:\mock-app-data'
    case 'read_file':
    case 'read_snapshot':
      return ''
    case 'path_exists':
      return false
    case 'check_file_association':
    case 'confirm_discard':
      return true
    case 'list_snapshots':
      return []
    case 'plugin:store|load':
      return 1
    case 'plugin:store|get':
      return [null, false]
    case 'take_launch_arg':
    case 'open_dialog':
    case 'save_dialog':
    case 'write_file':
    case 'write_file_bytes':
    case 'write_snapshot':
    case 'register_file_association':
    case 'show_editor_context_menu':
    case 'export_pdf_silent':
    case 'export_docx':
    case 'plugin:store|set':
    case 'plugin:store|save':
      return null
  }
  if (cmd.startsWith('plugin:window|')) return null
  console.warn(`[${BROWSER_HARNESS_MARKER}] unknown command: ${cmd}`)
  return null
}

export function installTauriBrowserMocks(): void {
  if (!shouldInstallBrowserMocks(import.meta.env.DEV, window)) return
  mockWindows('main')
  mockIPC(handleMockCommand, { shouldMockEvents: true })
  console.info(`[${BROWSER_HARNESS_MARKER}] Tauri mocks installed`)
}
