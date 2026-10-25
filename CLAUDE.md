# CLAUDE.md

## Project

GHS Markdown Editor: a Windows desktop Markdown editor built with Tauri 2, React 19, TypeScript, Vite, CodeMirror 6, and a unified/remark/rehype preview pipeline. Part of the GHS Markdown Ecosystem.

## Living spec

`docs/SPEC.md` is the source of truth for architecture, decisions, and lessons learned. Read it before changing an area.

**Every change that alters behavior must add an entry to `docs/SPEC.md`** saying what was built, any deviations, and lessons learned. Only append to it; never regenerate it.

## Commands

- **Setup (fresh checkout):** `npm ci`
- **Dev server:** `npm run tauri dev`
  - In a plain browser (`http://localhost:1420`), `src/dev/tauriBrowserMocks.ts` is installed by `src/main.tsx` only in Vite dev mode and only when `window.__TAURI_INTERNALS__` is absent, so it is inactive under `npm run tauri dev` and absent from production builds. It fakes the `main` window, the event plugin, a settings store that is always empty so defaults apply, and the app's commands as no-op or empty responses. Unknown commands log a `console.warn` and resolve `null`. File dialogs, real file I/O, export, native menus, and the detached preview window still can't be exercised in a browser.
  - **On a given port** (browser only, for factory agents): `npx vite --port <port>`. The config sets `strictPort`, so it fails instead of drifting if the port is taken. `npm run tauri dev` always uses 1420, so only one can run at a time.
- **Validation** (these will become `factory/checks.sh`):
  - `npm test`: Vitest, node environment; tests live next to their sources as `src/**/*.test.ts`
  - `npx tsc --noEmit`
  - `npm run build`: `tsc --noEmit && vite build`, producing the `dist/` that Tauri embeds
  - `cargo check --manifest-path src-tauri/Cargo.toml`
  - `factory/checks.sh` runs `npm ci` and then all of the above.
- **Release build:** `npm run tauri build`. It is slow; use it for releases, not routine validation.

## Environment

Windows. Humans use PowerShell; agent Bash runs through Git Bash. Use `python3`.

Never invoke plain `bash` from PowerShell, because it may resolve to WSL. Use `C:\Program Files\Git\bin\bash.exe`.

## Git rules

- Never add `Co-Authored-By` or any other trailer to commits.
- Never force-push.
- Never push to `main` directly.

## Docs folder

Only `docs/SPEC.md` is tracked. `docs/Results*.md` and `docs/FIX*.md` are local working files and are gitignored.

## Hard-won rules

Details for each are in `docs/SPEC.md`.

- Every Tauri window needs its own `src-tauri/capabilities/*.json`. Missing permissions fail silently.
- `rehype-sanitize` schema keys for `data-*` attributes must use the dashed form verbatim (`'data-source-line'`).
- Set `isSyncingScroll` BEFORE any programmatic `scrollTop` write, because the scroll event fires synchronously.
- `settingsLoaded` is a ref, so it can't be a `useEffect` dependency.
- For event listeners that must not drop events, use empty deps plus a ref to the latest values.
- Wrap async Tauri setup in `try/catch` with `console.error`. Rejections are otherwise swallowed.

## Software factory

`/factory run` builds every open GitHub issue labeled `factory` through
intake → spec → build → gate → review → approve, one PR per issue. State is in
`factory/jobs/` (gitignored); `factory/bin/job` is its only writer. Checks:
`factory/checks.sh`. Dashboard: `cd factory; python -m http.server`, then
open http://localhost:8000/dashboard.html.
