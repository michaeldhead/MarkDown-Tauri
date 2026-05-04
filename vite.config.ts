import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // src-tauri output never feeds the frontend bundle.
      // *.md / *.markdown ignored so saves to user-edited Markdown files
      // inside the project tree don't trigger Vite HMR (which would
      // full-page-reload the editor and wipe tab state).
      ignored: ['**/src-tauri/**', '**/*.md', '**/*.markdown'],
    },
  },
})
