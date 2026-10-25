# CLAUDE.md

## Project

GHS Markdown Editor: a Windows desktop Markdown editor built with Tauri 2, React 19, TypeScript, Vite, CodeMirror 6, and a unified/remark/rehype preview pipeline. Part of the GHS Markdown Ecosystem.

## Living spec

`docs/SPEC.md` is the source of truth for architecture, decisions, and lessons learned. Read it before changing an area.

**Every change that alters behavior must add an entry to `docs/SPEC.md`** saying what was built, any deviations, and lessons learned. Only append to it; never regenerate it.

## Commands

- **Setup (fresh checkout):** `npm ci`
- **Dev server:** `npm run tauri dev`
  - The Vite frontend on its own (`http://localhost:1420`) loads in a browser, but Tauri `invoke()` calls fail there because there is no native backend. File dialogs, export, menus, and file I/O can't be exercised in a plain browser.
- **Validation** (these will become `factory/checks.sh`):
  - `npm test`: Vitest, node environment; tests live next to their sources as `src/**/*.test.ts`
  - `npx tsc --noEmit`
  - `cargo check --manifest-path src-tauri/Cargo.toml`
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
