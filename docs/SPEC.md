# GHS Markdown Editor — Tauri
## Living Specification · v1.0

---

## Identity

| Field | Value |
|---|---|
| App name | GHS Markdown Editor (Tauri) |
| Identifier | com.ghs.markdown-tauri |
| Repository | github.com/michaeldhead/MarkDown-Tauri |
| Ecosystem position | Fourth app — Windows-only portable desktop companion |
| Distribution | Single `.exe` (~5–10 MB), no installer, no admin rights required |
| Target OS | Windows 10/11 (64-bit) |
| Version | 0.1.0 (initial) |

---

## Ecosystem Context

| App | Stack | Status |
|---|---|---|
| GHS Markdown Editor (Web) | React 18 / Firebase | Live at md.theheadfamily.com |
| GHS Markdown Editor (WPF) | C# / .NET 8 / WPF | Released v1.0.1 |
| GHS Markdown Editor (Cross-Platform) | .NET 10 / Avalonia | Active development v1.1.2+ |
| **GHS Markdown Editor (Tauri)** | **Rust / Tauri 2 / React 19** | **This project** |

All four apps are companion projects. READMEs cross-reference each other.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Tauri runtime | Tauri | 2.x (latest stable) |
| Tauri CLI | @tauri-apps/cli | ^2 |
| Rust edition | Rust | 2021 edition (stable) |
| Frontend framework | React | ^19 |
| Build tool | Vite | ^7 |
| Language | TypeScript | ~5.8 |
| Styling | Tailwind CSS | v4 |
| Editor engine | CodeMirror 6 | via @uiw/react-codemirror |
| Markdown parsing | remark + rehype pipeline | latest |
| Persistence | tauri-plugin-store | 2.4.2 (match Kanban precedent) |
| File I/O | tauri-plugin-fs | ^2 |
| Native dialogs | tauri-plugin-dialog | ^2 |
| OS shell / open | tauri-plugin-opener | ^2 (match Kanban) |
| Serde | serde + serde_json | 1.x |
| Tauri build dep | tauri-build | 2.x |

### Rust lib structure (matches Kanban precedent)
- `main.rs` — thin entry point, delegates to lib
- `lib.rs` — plugin registration + Tauri command handlers
- `lib name` — `markdown_tauri_lib` (crate-type: staticlib, cdylib, rlib)

### Window defaults
```json
{
  "title": "GHS Markdown Editor",
  "width": 1280,
  "height": 800,
  "minWidth": 900,
  "minHeight": 600,
  "resizable": true,
  "center": true
}
```

---

## Architecture

### Layer separation

```
┌─────────────────────────────────────────────┐
│  Frontend (React 19 + Vite + Tailwind v4)   │
│  - CodeMirror 6 editor                      │
│  - remark/rehype preview pipeline           │
│  - Toolbar, sidebar panels, themes          │
│  - Calls Tauri commands via invoke()        │
└───────────────┬─────────────────────────────┘
                │ Tauri IPC bridge
┌───────────────▼─────────────────────────────┐
│  Rust backend (src-tauri/src/lib.rs)        │
│  - File read / write / save-as              │
│  - Native open/save dialog                  │
│  - App settings persistence (store plugin)  │
│  - Recent files list management             │
│  - Export commands (HTML, PDF, Plain Text)  │
└─────────────────────────────────────────────┘
```

### State persistence strategy
- **App settings** (theme, view mode, window state, recent files): `tauri-plugin-store` → `settings.json` on disk
- **Current document**: in-memory React state; auto-saved to disk every 30 seconds if file path is known
- **Draft recovery**: last unsaved content written to `draft.md` in app data dir on every change (debounced 1s); restored on next launch if no file was open

### Tauri command surface (Rust)
| Command | Description |
|---|---|
| `read_file(path)` | Read file contents as string |
| `write_file(path, content)` | Write string to path |
| `save_dialog(default_name)` | Open native Save As dialog, return chosen path |
| `open_dialog()` | Open native Open dialog, return chosen path |
| `get_app_data_dir()` | Return platform app data directory |
| `export_html(path, content)` | Write rendered HTML string to file |
| `export_html(path, content)` | Write rendered HTML string to file |
| ~~`export_docx`~~ | Removed in Fix-F — DOCX export eliminated |

---

## Feature Scope

Features are organized in three tiers mapped to phases.

### Tier 1 — Web App Parity
Everything the web app has, rebuilt properly for native desktop.

- Write / Split / Preview modes
- Ratio-based synchronized scroll (Split mode)
- Draggable, resizable split divider (persisted in store)
- Full toolbar ribbon (headings, bold, italic, code, link, image, lists, HR, table)
- Keyboard shortcuts matching web app
- CodeMirror 6 with Markdown syntax highlighting
- Live HTML preview (remark + rehype pipeline, same as web app)
- Native file open / save / save-as via Tauri dialog + fs plugins
- Title bar reflects filename and unsaved state (`*` indicator)
- Auto-save to disk (30s interval, only when file path known)
- Draft recovery on launch
- Document Outline sidebar panel (heading tree, click-to-navigate)
- Snippet library sidebar panel (insert at cursor)
- Themes: GHS Dark (default), GHS Ink, GHS Light
- Export: HTML (styled), HTML (clean), plain text, Markdown (copy to clipboard)

### Tier 2 — Desktop Enhancements
Capabilities the web app cannot do cleanly.

- Recent files list (up to 20, stored in settings, shown in File menu + sidebar panel)
- `.md` file association (double-click `.md` opens in app)
- Native application menu bar (File, Edit, View, Export)
- Export to DOCX via `docx-rs` Rust crate *(removed in Fix-F — unformatted output; replaced by HTML + PDF)*
- Export to PDF via OS print-to-PDF (Tauri shell)
- Word count, character count, reading time in status bar

### Tier 3 — Avalonia Signature Features
Features that differentiate this from the web app and bring it toward Avalonia parity.

- **Smart Gutter** — narrow channel between editor and preview showing scroll sync indicator and live word count
- **Document Topology View** — heading structure panel with section word-count balance bars
- **Contextual Command Palette** — `Ctrl+K` fuzzy search over commands, headings, snippets, recent files
- **Snippet Studio** — full snippet management UI (create, edit, tag, delete)
- **Version Timeline** — local automatic snapshots (every save), scrubber UI to browse and restore

---

## Design System

All themes use CSS custom properties. Tailwind v4 configured to consume them.

### GHS Dark (default)
| Token | Value |
|---|---|
| `--bg-primary` | `#1e1e2e` |
| `--bg-surface` | `#2a2a3d` |
| `--bg-elevated` | `#313147` |
| `--text-primary` | `#cdd6f4` |
| `--text-muted` | `#6c7086` |
| `--accent` | `#89b4fa` |
| `--accent-hover` | `#74a8f0` |
| `--border` | `#45475a` |
| `--editor-bg` | `#181825` |

### GHS Ink (light / print-friendly)
| Token | Value |
|---|---|
| `--bg-primary` | `#f8f8f2` |
| `--bg-surface` | `#ececec` |
| `--bg-elevated` | `#ffffff` |
| `--text-primary` | `#282a36` |
| `--text-muted` | `#6272a4` |
| `--accent` | `#6272a4` |
| `--border` | `#d0d0d0` |
| `--editor-bg` | `#ffffff` |

### GHS Glass (dark translucent — visual accent theme)
Same base as GHS Dark with `backdrop-filter: blur` applied to panel surfaces. Defined in Phase 3+.

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Menu bar (File · Edit · View · Export)                      │
├──────────────────────────────────────────────────────────────┤
│  Toolbar ribbon                                              │
├───┬──────────────────────────────────────────────────────────┤
│   │                                                          │
│ S │  Editor pane  │ Smart Gutter │  Preview pane            │
│ i │               │              │                           │
│ d │  (CodeMirror) │  (Phase 6)   │  (remark/rehype HTML)    │
│ e │               │              │                           │
│ b │               │              │                           │
│ a │                                                          │
│ r ├──────────────────────────────────────────────────────────┤
│   │  Status bar: file name · cursor · word count · theme    │
└───┴──────────────────────────────────────────────────────────┘
```

Sidebar panels (left, collapsible): Outline · Recent Files · Snippets · Settings
View modes: Write (editor only) · Split (editor + preview) · Preview (preview only)

---

## Phased Delivery Plan

### Phase 1 — Project Scaffold + Editor Shell
**Goal:** Tauri v2 project running with React 19 + Vite + Tailwind v4. CodeMirror editor renders. App window opens correctly.

**Scope:**
- Initialize Tauri v2 project matching Kanban structural patterns
- `src-tauri/`: `main.rs`, `lib.rs`, `tauri.conf.json`, `Cargo.toml`
- Register plugins: store, fs, dialog, opener
- React 19 + Vite 7 + TypeScript 5.8 frontend
- Tailwind v4 configured with GHS Dark CSS tokens
- CodeMirror 6 editor renders full-height in Write mode
- Markdown syntax highlighting active
- Toolbar stub (buttons present, no actions yet)
- Status bar stub (shows placeholder text)
- No file I/O yet

**Acceptance Criteria:**
- [ ] `npm run tauri dev` launches app window
- [ ] Editor is visible and accepts typed input
- [ ] GHS Dark theme applied (correct background/text colors)
- [ ] `npm run tauri build` produces a `.exe` with zero errors
- [ ] `tsc --noEmit` passes with zero TypeScript errors

**Entry state:** Empty repo, Rust + Node toolchain installed
**Exit state:** Running shell, buildable `.exe`

**Phase 1 Actuals (completed 2026-05-01)**

_Versions locked:_
- `@tauri-apps/api@2.11.0`, `@tauri-apps/cli@2.11.0`
- `@tauri-apps/plugin-dialog@2.7.0`, `plugin-fs@2.5.0`, `plugin-opener@2.5.3`, `plugin-store@2.4.2`
- `@uiw/react-codemirror@4.25.9`, `@codemirror/lang-markdown@6.5.0`, `@codemirror/theme-one-dark@6.1.3`
- `react@19.2.5`, `react-dom@19.2.5`
- `vite@7.3.2`, `@vitejs/plugin-react@4.7.0`, `typescript@5.8.3`
- `@tailwindcss/vite@4.2.4`, `tailwindcss@4.2.4` (both required — peer dependency)
- `tauri@2.11.0`, `tauri-build@2.6.0`, `serde@1.0.228`, `serde_json@1.0.149`

_Architectural discoveries:_
- `tsconfig.node.json` requires `composite: true`; `noEmit: true` is incompatible with composite projects and must be omitted
- `tailwindcss` must be listed as an explicit devDependency alongside `@tailwindcss/vite` (v4 peer requirement)
- CodeMirror theme: use explicit `oneDark` import from `@codemirror/theme-one-dark` — not the string `theme="dark"`
- **Tauri v2 requires `src-tauri/capabilities/default.json`** granting `core:default` plus each plugin's `:default` permission set. Build fails without it. All future phases must account for this when adding new plugins.
- Icons generated via `npx tauri icon` from a 1024×1024 source PNG. Placeholder icon in place — replace with designed icon pre-release.

_Artifacts produced:_
- `src-tauri/target/release/markdown-tauri.exe`
- MSI and NSIS installers in `src-tauri/target/release/bundle/`

_All four completion gates passed. Zero TypeScript errors._

---

### Phase 2 — File I/O + View Modes + Preview
**Goal:** Open, save, and preview Markdown files natively.

**Scope:**
- Tauri Rust commands: `read_file`, `write_file`, `open_dialog`, `save_dialog`
- File open (Ctrl+O), save (Ctrl+S), save-as (Ctrl+Shift+S)
- Title bar: shows filename, `*` prefix for unsaved changes
- remark + rehype preview pipeline (matching web app)
- Write / Split / Preview mode switcher (toolbar buttons + keyboard shortcuts)
- Ratio-based synchronized scroll in Split mode
- Draggable split divider, persisted via store plugin
- Draft recovery: write to `draft.md` on change (debounced 1s), restore on launch

**Acceptance Criteria:**
- [ ] Open dialog filters to `.md` files; file loads into editor
- [ ] Save writes file to disk; title bar loses `*`
- [ ] Save As opens dialog, saves to chosen path
- [ ] Preview renders HTML from editor content
- [ ] Split mode shows editor and preview side-by-side
- [ ] Scrolling one pane proportionally scrolls the other
- [ ] Split divider is draggable and position persists across restarts
- [ ] Draft is restored on relaunch when no file was open
- [ ] Zero TypeScript errors

**Entry state:** Phase 1 complete
**Exit state:** Fully functional open/save/preview loop

**Phase 2 Actuals (completed 2026-05-01)**

_Packages added:_
- `unified@11.0.5`, `remark-parse@11.0.0`, `remark-rehype@11.1.2`, `rehype-sanitize@6.0.0`, `rehype-stringify@10.0.1`
- No new Rust crates

_Architectural discoveries:_
- **Dialog API:** Use `blocking_pick_file()` / `blocking_save_file()` — callback+channel pattern does not match public API of `tauri-plugin-dialog@2.7.0`. This is the upstream recommended pattern.
- **Store:** Use `LazyStore('settings.json')` — `new Store()` does not exist in `@tauri-apps/plugin-store@2.4.2`; `LazyStore` is the ergonomic match for module-level construction.
- **Capabilities:** No changes needed — `core:default`, `dialog:default`, `fs:default`, `store:default`, `opener:default` already granted from Phase 1.
- **`write_file` must call `fs::create_dir_all(parent)`** — app data dir may not exist on first launch; required for draft auto-save.
- **`getCurrentWindow()`** is the correct Tauri v2 export (not a named `appWindow` import).
- **Path joining:** Use a platform-aware helper that detects the separator from the app data dir string returned by Rust.
- **Persist `splitRatio` on `mouseup`** (drag end only) — avoids 60+ store writes/sec during drag.
- **Hooks inlined in `App.tsx`** (~270 lines) — extraction to `src/hooks/` deferred to Phase 3/4.
- **TypeScript:** `Extension[]` must be typed explicitly on the CodeMirror extension array — inference narrows to `LanguageSupport[]` and rejects `domEventHandlers` without it.
- **Scroll sync:** `EditorView.domEventHandlers({ scroll })` on editor + `onScroll` on preview div; `isSyncingScroll` ref prevents feedback loops.
- **Bundle size:** 961 kB uncompressed / 318 kB gzipped. Code-splitting deferred to BL-10.

_All three completion gates passed. Zero TypeScript errors._

---

### Phase 3 — Toolbar + Keyboard Shortcuts + Sidebar Shell
**Goal:** Full toolbar ribbon operational. Sidebar panel structure in place.

**Scope:**
- Toolbar actions: H1–H6, Bold, Italic, Strikethrough, Inline Code, Code Block, Link, Image, Unordered List, Ordered List, Blockquote, HR, Table
- All toolbar actions insert/wrap correctly at CodeMirror cursor
- Keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+K (link), Ctrl+` (code)
- Sidebar: collapsible left panel with tab icons (Outline, Recent Files, Snippets, Settings)
- Document Outline panel: live heading tree, click scrolls editor to heading
- Settings panel stub (theme selector: GHS Dark / GHS Ink; view mode default)
- Status bar: filename, cursor position (line:col), word count, character count

**Acceptance Criteria:**
- [ ] All toolbar buttons insert correct Markdown syntax
- [ ] Outline panel reflects document headings in real time
- [ ] Clicking an outline entry scrolls editor to that heading
- [ ] Sidebar collapses and expands, state persists
- [ ] Theme switcher changes CSS tokens app-wide
- [ ] Status bar updates on cursor move and content change
- [ ] Zero TypeScript errors

**Entry state:** Phase 2 complete
**Exit state:** Full editing experience, sidebar functional

**Phase 3 Actuals (completed 2026-05-01)**

_Packages added:_ None.

_Architectural discoveries:_
- **`editorView` must be `useState`, not a ref** — Toolbar disabled state and Sidebar outline-click handler need to react to it becoming non-null. Refs do not trigger re-renders.
- **Theme tokens:** Centralize both themes in a `THEME_TOKENS` const map + `applyTheme` helper in App.tsx. Branching `if/else` blocks are unnecessary.
- **CodeMirror theme also swaps on theme change** — swap between `oneDark` (dark) and built-in `'light'` (ink) via the `theme` prop on `@uiw/react-codemirror`. The wrapper applies `StateEffect.reconfigure` in place, preserving cursor/scroll/content.
- **Session `viewMode` is ephemeral** — only `defaultViewMode` is persisted (applied on launch). The Phase 2 `useEffect` persisting live `viewMode` on every change was removed.
- **`scrollToLine` must also move the cursor** — `EditorView.scrollIntoView` alone leaves the cursor in the wrong place; set selection to heading line start for correct resume-typing behavior.
- **Sidebar persistence:** `sidebarOpen` and `activePanel` written in a single `useEffect` (one store trip per change). Persisted keys in `settings.json` are now: `splitRatio`, `theme`, `defaultViewMode`, `sidebarOpen`, `activePanel`.
- **Icon rail:** 3-letter text labels (Out, Fil, Snp, Set) with `title` tooltips. Icon library (likely `lucide-react`) deferred to a later phase.
- **Outline:** Also handles `~~~` fenced code blocks (CommonMark compliant). Strips trailing `#` from ATX headings. Empty doc shows hint message.
- **`editorCommands.ts`** includes higher-level helpers beyond the spec primitives: `insertCodeBlock` (cursor-aware), `insertTable`, `insertHorizontalRule`, `insertImage`, `insertLink`, `scrollToLine`.
- **Divider drag math** anchored to `splitContainerRef`, not the outer flex — sidebar width is excluded from split ratio calculation.
- **Bundle size:** 971 kB / 321 kB gz (up from 961 kB in Phase 2). Code-splitting deferred per BL-10.

_Known limitations carried forward:_
- GHS Ink CodeMirror theme is bare `'light'` default — custom Ink CodeMirror theme deferred to Phase 5+.
- No sidebar collapse animation (spec deferred this).
- Outline active-section highlighting on scroll deferred to Phase 7 (Document Topology View).

_All three completion gates passed. Zero TypeScript errors._

---

### Phase 4 — Native Menu Bar + Recent Files + File Association
**Goal:** Native OS menu bar. Recent files tracking. `.md` file association.

**Scope:**
- Native Tauri menu bar: File (New, Open, Save, Save As, Recent Files submenu, Exit), Edit (Undo, Redo, Cut, Copy, Paste, Select All), View (Write, Split, Preview, Toggle Sidebar), Export (HTML Styled, HTML Clean, Plain Text, Copy Markdown)
- Recent files: up to 20 paths stored in store plugin; shown in File menu and Recent Files sidebar panel
- Recent Files sidebar panel: clickable list, removes missing files automatically
- `.md` file association registered in `tauri.conf.json` (Windows file type handler)
- App accepts file path as launch argument (open file passed via CLI/double-click)
- New file command (Ctrl+N): prompts save if unsaved, clears editor

**Acceptance Criteria:**
- [ ] All menu items function correctly
- [ ] Recent files list populates on open/save and persists
- [ ] Double-clicking a `.md` file opens it in the app
- [ ] New file clears editor and resets title bar
- [ ] Export commands produce correct output files
- [ ] Zero TypeScript errors

**Entry state:** Phase 3 complete
**Exit state:** Full native desktop app feel

**Phase 4 Actuals (completed 2026-05-01)**

_Packages added:_
- `lucide-react@1.14.0` — `AlignLeft`, `Clock`, `Scissors`, `Settings` icons replace 3-letter sidebar labels

_Architectural discoveries:_
- **Launch arg: pull-based, not emit-based.** Capture path in `Mutex<Option<String>>` via `app.manage`; expose `take_launch_arg` command; frontend invokes on mount. Emit-from-setup drops because the webview isn't listening yet.
- **Menu event listener: handler-ref pattern.** Mount once with `[]` deps; store all callbacks in a `useRef` updated each render; switch reads `handlersRef.current`. Eliminates stale-closure hazard without making all callbacks identity-stable.
- **`save_dialog` generalized** to accept optional `filters: Vec<DialogFilter>` — one command handles Markdown, HTML, and text exports.
- **`renderMarkdown`** extracted to `src/lib/preview.ts` — shared by `PreviewPane` and all export functions.
- **HTML Styled export** uses hard-coded GHS Dark CSS — canonical export appearance independent of live theme.
- **`confirm_discard`:** `MessageDialogBuilder` with `kind(Warning)` + `buttons(OkCancel)` + `blocking_show()` → `bool`.
- **`path_exists(path)`:** synchronous `Path::exists` — used for recent-files prune on launch.
- **Edit menu** uses `PredefinedMenuItem` variants — OS/WebView owns shortcuts; no `"menu-event"` emission needed.
- **Capabilities:** No changes needed — `core:default` already includes `core:event:default`.
- **Bundle size:** ~980 kB / 324 kB gz (lucide-react adds ~5 kB, tree-shaken).
- **`stripExt` helper** prevents `untitled.md.html` in export save dialogs.

_Store keys now in `settings.json`:_ `splitRatio`, `theme`, `defaultViewMode`, `sidebarOpen`, `activePanel`, `recentFiles`

_All three completion gates passed. Zero TypeScript errors._

---

### Phase 5 — Export (HTML + PDF) + Snippet Library + Auto-Save
**Goal:** HTML and PDF export. DOCX initially added then removed in Fix-F (unformatted output). Snippet panel operational. Auto-save to disk.

**Scope:**
- Export to DOCX: Rust command using `docx-rs` crate; triggered from Export menu *(subsequently removed in Fix-F)*
- Export to PDF: Tauri shell print-to-PDF or `tauri-plugin-webview` print API
- Snippet library sidebar panel: pre-loaded default snippets; insert at cursor on click
- Auto-save: every 30 seconds when file path is known, writes silently to disk
- Word count, reading time (avg 200 wpm) in status bar

**Acceptance Criteria:**
- [ ] ~~DOCX export~~ (removed in Fix-F)
- [ ] PDF export produces a valid `.pdf` file
- [ ] Snippets panel lists items; clicking inserts at cursor
- [ ] Auto-save fires every 30s (confirmed via file modification timestamp)
- [ ] Reading time shown in status bar
- [ ] Zero TypeScript errors

**Entry state:** Phase 4 complete
**Exit state:** Export-complete, snippet-enabled app

**Phase 5 Actuals (completed 2026-05-01)**

_Packages added:_
- `docx-rs@0.4.20` (Rust) — transitive deps: `zip@0.6.6`, `quick-xml@0.36.2` *(removed in Fix-F)*
- No new npm packages

_Architectural discoveries:_
- **PDF export: hidden iframe + `window.print()`**, not `Webview.print()`. `@tauri-apps/api@2.11.0` does not expose a `print()` method on `Webview` or `WebviewWindow`. iframe is sized 0×0, `visibility: hidden` (not `display: none` — WebView2/Chromium skips printing for `display:none`). iframe removed after 1500ms timeout post-print() call.
- **`wrapAsPrintHtml(body, title)`** in `src/lib/preview.ts` — light-themed, print-friendly typography (Georgia 11pt), page-break-aware for headings/tables/pre.
- **Auto-save is effectively debounced by keystroke** — `content` in the deps array resets the 30s timer on every change. Fires 30s after last keystroke, not on a fixed wall-clock. This is the correct UX behavior per spec intent.
- **`export_docx`** supported H1–H6. Auto-created parent directories before write. *(command removed in Fix-F)*
- **Export submenu separator** added between disk exports and "Copy Markdown" clipboard action.
- **Snippet data:** `src/lib/snippets.ts` — `Snippet` interface + `DEFAULT_SNIPPETS` (10 entries, tags: meta/code/table/list/format/insert). Store key `snippets` hydrated on mount; falls back to defaults. Phase 9 Snippet Studio writes to the same key.
- **Snippet card:** shows name + tag badge + first-line body preview (monospace, clamped). Empty first lines show `(empty line)`.
- **DOCX limitations:** Inline formatting not converted — plain text only. This limitation led to removal in Fix-F.
- **Capabilities:** No changes needed.
- **Bundle size:** Unchanged (~980 kB / 324 kB gz).

_All four completion gates passed. Zero TypeScript errors._

---

### Phase 6 — Smart Gutter
**Goal:** Smart Gutter between editor and preview in Split mode.

**Scope:**
- 24px channel between editor and preview (visible in Split mode only)
- Scroll sync position indicator: small dot tracking proportional scroll position
- Live word count badge in gutter center
- Gutter does not interfere with draggable divider (divider moves as a unit with gutter)

**Acceptance Criteria:**
- [ ] Gutter visible in Split mode; hidden in Write and Preview modes
- [ ] Scroll indicator dot tracks scroll position accurately
- [ ] Word count badge updates in real time
- [ ] Divider drag still works with gutter present
- [ ] Zero TypeScript errors

**Entry state:** Phase 5 complete
**Exit state:** Smart Gutter shipped

**Phase 6 Actuals (completed 2026-05-01)**

_Packages added:_ None.

_Architectural discoveries:_
- **Dot positioning: pure CSS percent + transform** — `top: ${r*100}%; transform: translateY(${-r*100}%)` gives pixel-perfect placement without JS `clientHeight` measurement. Scales correctly through window resizes.
- **`editorScrollRatio` is React state** (not ref) — simpler than imperative DOM writes; scroll re-renders are <1ms at desktop frame rates.
- **Badge label is `N words`** (not bare number) — self-documenting with `writing-mode: vertical-rl`. No `rotate(180deg)` — that would render upside-down; spec text described top-to-bottom reading order.
- **Split-pane width:** `calc(${ratio}% - 12px)` on both sides — each pane gives up half the gutter's 24px. Symmetric at `splitRatio = 50`.
- **Box-shadow ring** (`box-shadow: 0 0 0 2px var(--bg-elevated)`) on the dot — punches the gutter background out around the dot so it remains readable when crossing the badge digits.
- **`.split-divider` CSS class removed** — no longer has a consumer.
- **`editorScrollRatio`** updated in `handleEditorScroll` before the `viewMode !== 'split'` early return — keeps ratio current when user switches into Split.
- **Bundle size:** ~986 kB / 326 kB gz (+7 kB from Phase 5).

_All three completion gates passed. Zero TypeScript errors._

---

### Toolbar Polish (between Phase 6 and Phase 7)
**Completed 2026-05-01**

_Icon mapping:_ All 21 lucide icons resolved without substitution. `Table`, `Link`, `Image` imported as `TableIcon`, `LinkIcon`, `ImageIcon` to avoid DOM global namespace collisions.

_Key changes:_
- `Toolbar.tsx` fully rewritten — 25 icon-only buttons, 7 groups with `.toolbar-sep` dividers, View Mode group `marginLeft: auto` pins right
- New File (`FilePlus`) button added to toolbar — `onNew` prop wired to existing `newFile` callback (had been keyboard-only since Phase 4)
- `.toolbar-btn`, `.toolbar-sep`, `.toolbar-group` CSS classes in `index.css` (inline styles can't express `:hover`/`:active`/`:disabled` pseudo-classes)
- `aria-label` on buttons + `aria-hidden` on SVG icons for accessibility
- Sidebar `"Outline"` tooltip corrected to `"Document Outline"`; other three tooltips were already correct
- Sidebar icon rail left at 40px height (spec said adjust only if significantly different — 40px is appropriate for a 40px-wide rail)
- Bundle size: ~999 kB / 323 kB gz (+13 kB from 24 additional lucide icons, all tree-shaken)

---

### Phase 7 — Document Topology View
**Goal:** Heading topology panel with section balance visualization.

**Scope:**
- Sidebar panel (replaces or augments Outline panel slot)
- Heading tree with nesting depth indentation
- Per-section word count badge
- Section balance bar: horizontal bar proportional to section word count
- Active section highlighted (based on editor cursor position)
- Click navigates editor to heading

**Acceptance Criteria:**
- [ ] Topology panel shows all headings with depth indentation
- [ ] Word count per section is accurate
- [ ] Balance bars scale proportionally to largest section
- [ ] Active section updates as cursor moves through document
- [ ] Zero TypeScript errors

**Entry state:** Phase 6 complete
**Exit state:** Topology View shipped

**Phase 7 Actuals (completed 2026-05-01)**

_Packages added:_ None.

_Architectural discoveries:_
- **`buildTopology` reuses `countWords`** from `outline.ts` — keeps word-tokenization consistent with status bar; avoids two divergent implementations.
- **Active section tracking** uses existing `line` cursor state from Phase 2's `onStatistics` callback — no new editor wiring needed.
- **Indent base is 8px** (`8 + (level-1)*12px` total) — spec said `(level-1)*12px` but H1 touching the left edge of the panel looks jarring. Depth differentiation (12px per level) preserved.
- **Balance bar omitted entirely when `wordCount === 0`** — no empty 3px bar.
- **`font-variant-numeric: tabular-nums`** on word count badge — prevents digit-jitter as count updates while typing.
- **`title` attribute per row:** `"Line N · N words"` — native tooltip with line number + section size.
- **`OutlinePanel.tsx` deleted from disk** (not orphaned).
- **Sidebar props:** removed `content: string`; added `topology: TopologyEntry[]` and `activeTopologyIndex: number`.
- **Preamble words (above first heading) not counted in any section** — by design; status bar count includes them, topology total does not.
- **Active row auto-scroll-into-view deferred** — reasonable polish for a later phase.
- **Bundle size:** ~1003 kB / 325 kB gz (+4 kB from Phase 6 toolbar polish baseline).

_All three completion gates passed. Zero TypeScript errors._

---

### Phase 8 — Contextual Command Palette
**Goal:** `Ctrl+K` command palette with fuzzy search.

**Scope:**
- Modal overlay, triggered by Ctrl+K
- Search categories: Commands (toolbar actions, menu items), Headings (jump to), Snippets (insert), Recent Files (open)
- Fuzzy matching on all items
- Keyboard navigation (arrow keys, Enter to execute, Escape to dismiss)
- Category badges on results

**Acceptance Criteria:**
- [ ] Ctrl+K opens palette; Escape closes it
- [ ] Typing filters results in real time with fuzzy match
- [ ] Enter executes the selected item
- [ ] All four categories populated with correct items
- [ ] Zero TypeScript errors

**Entry state:** Phase 7 complete
**Exit state:** Command Palette shipped

**Phase 8 Actuals (completed 2026-05-01)**

_Packages added:_ None.

_Architectural discoveries:_
- **Action execution deferred via `queueMicrotask`** after `onClose()` — palette unmounts and focus returns to editor before action's own `view.focus()` fires. Prevents focus flicker.
- **Global Ctrl-shortcuts suppressed while palette open** — `if (paletteOpen) return` early-exit in keydown handler after the Ctrl+K branch. Prevents Ctrl+S etc. firing while user types in search input.
- **Click-to-execute uses `onMouseDown` + `preventDefault()`**, not `onClick` — keeps input focused during click, prevents mid-press blur.
- **Hover moves selection** (`onMouseEnter` → `setSelectedIndex`) — single unified highlight indicator for both keyboard and mouse nav.
- **`paletteItems` useMemo** depends on: `editorView`, `topology`, `snippets`, `recentFiles`, and all `useCallback`-wrapped action callbacks. 20 command entries + per-heading + per-snippet + per-file.
- **Format commands use `withView` helper** — no-ops when `editorView` is null, avoids null-guard boilerplate at every call site.
- **`onKeyDown` on overlay div** (not input alone) — captures Arrow keys reliably; `preventDefault` on arrows prevents page scroll.
- **`selectedIndex` clamps to filtered length** on result set change; `useEffect` on `selectedIndex` calls `scrollIntoView({ block: 'nearest' })` on active row.
- **Ctrl+K → `insertLink` removed** from global keyboard handler and from App.tsx imports. Link still available via toolbar button and palette "Insert Link" command.
- **Palette renders `null` when closed** (mounted/unmounted with prop) — input autofocus runs fresh every open.
- **`MAX_RESULTS = 50`** cap applied after score sort.
- **Bundle size:** ~1008 kB / 326 kB gz (+5 kB).

_All three completion gates passed. Zero TypeScript errors._

---

### Phase 9 — Snippet Studio
**Goal:** Full snippet management UI inside Sidebar.

**Scope:**
- Snippet Studio panel: list of snippets with name, tag, preview
- Create new snippet (name, body, tag)
- Edit existing snippet inline
- Delete snippet with confirmation
- Snippets persisted in store plugin (`snippets.json` key)
- Snippets panel (Phase 3) reads from same store key

**Acceptance Criteria:**
- [ ] Create, edit, delete snippets all work and persist across restarts
- [ ] Snippet created in Studio appears immediately in Snippets panel
- [ ] Tags filter the snippet list
- [ ] Zero TypeScript errors

**Entry state:** Phase 8 complete
**Exit state:** Snippet Studio shipped

**Phase 9 Actuals (completed 2026-05-01)**

_Packages added:_ None (`Wand2` + `ArrowLeft` already in `lucide-react@1.14.0`).

_Architectural discoveries:_
- **`editing: { draft: Snippet, isNew: boolean } | null`** — single state drives list/edit mode. `null` = list view.
- **`EditView` child component** — owns name/tag/body state; unmounts when `editing === null`, resets form cleanly on each entry. Prevents list parent re-rendering on every keystroke.
- **`window.confirm()`** for Reset to Defaults — `confirm_discard` Rust command has hardcoded "unsaved buffer" wording; `window.confirm()` is cleaner and supported natively in WebView2.
- **`activePanel` validator updated** to accept `'studio'` — without this, a session ending in Studio would silently fall back to `'outline'` on relaunch.
- **Tag badge falls back to `'—'`** when tag is empty; name falls back to `'(untitled)'` — prevents zero-width rendering bugs.
- **`body` not trimmed on save** — trailing newlines are intentional in snippet bodies (e.g. Frontmatter ends with `
---
`). `name` and `tag` are trimmed.
- **Focus/blur outline on inputs** via `onFocus`/`onBlur` event handlers toggling `style.outline` — avoids dropping a `.studio-input` rule into `index.css` for a pseudo-class.
- **Empty studio list state:** `"No snippets. Add one above."` muted hint row added defensively.
- **Delete has no confirm** per spec (lightweight single-item delete; Reset to Defaults has the confirm).
- **`paletteItems` and `SnippetsPanel` propagate automatically** — both depend on `snippets` state; Studio CRUD triggers re-render with no extra wiring.
- **Bundle size:** ~1015 kB / 328 kB gz (+7 kB).

_All three completion gates passed. Zero TypeScript errors._

---

### Phase 10 — Version Timeline
**Goal:** Local automatic snapshots and scrubber UI.

**Scope:**
- Snapshot taken on every Save (Ctrl+S), stored in app data dir as timestamped `.md` files (max 50 per document)
- Version Timeline panel: list of snapshots with timestamp and word count delta
- Select snapshot: shows diff preview (before/after word count, first changed line)
- Restore snapshot: loads snapshot content into editor (prompts confirmation)
- Prune old snapshots beyond limit (oldest removed first)

**Acceptance Criteria:**
- [ ] Snapshot created on every Ctrl+S
- [ ] Timeline panel lists snapshots with correct timestamps
- [ ] Selecting a snapshot shows preview metadata
- [ ] Restore loads content into editor after confirmation
- [ ] Snapshots pruned at 50 per document
- [ ] Zero TypeScript errors

**Entry state:** Phase 9 complete
**Exit state:** Version Timeline shipped — all Tier 3 features complete

**Phase 10 Actuals (completed 2026-05-01)**

_Packages added:_ None (`History` + `RotateCw` lucide icons already in `lucide-react@1.14.0`).

_Architectural discoveries:_
- **`snapshotTick` counter pattern** — `saveFile` increments a `snapshotTick: number` state after a successful snapshot write; a separate `useEffect` on `[activePanel, sidebarOpen, filePath, snapshotTick]` triggers the refresh. Keeps `saveFile` dep-stable (no sidebar state in its deps array); same observable behavior as the spec's inline conditional.
- **Lazy snapshot preview fetch** — `read_snapshot` invoked only on row selection, not on list load. Avoids reading up to 50 × ~5 KB = 250 KB the user may not need.
- **`handleRestoreSnapshot` ignores the filename argument** — operates on already-loaded `snapshotPreviewContent` from selection; re-fetching by filename would be redundant.
- **`snapshotFilename(date = new Date())`** — default-arg form identical to spec behavior; allows future test/inspection use.
- **Slug falls back to `'untitled'`** if regex produces an empty string (e.g. file named `"!.md"`).
- **Panel header shows snapshot count** (`"N snapshots"`) instead of redundant title — useful info in same real estate.
- **`activePanel` validator extended** to accept `'timeline'`.
- **Prune in `write_snapshot`** sorts by `OsString` (stable, native); uses `let _ = remove_file(...)` so a single failed delete doesn't cascade.
- **Snapshots only on Ctrl+S** (not auto-save, not Save As) — user-intent moments only. Auto-save (`write_file` directly) and Save As are separate code paths.
- **Restore is in-memory only** — user must Ctrl+S to persist. Same shape as draft recovery (Phase 2).
- **Bundle size:** ~1018 kB / 329 kB gz (final).

_Known limitations (all per spec):_
- Files with same basename share a snapshot directory (slug collision).
- 50-cap is per-document; no global cleanup command.
- No diff viewer (out of scope).

_All four completion gates passed. Zero TypeScript errors._

---

## Fix Pass Actuals (Post-Phase 10)

### Fix-A — GFM Tables (completed 2026-05-01)
Added `remark-gfm@4.0.1` to the unified pipeline in `src/lib/preview.ts`. All export paths (Styled HTML, Clean HTML, Print/PDF) pick up GFM table support automatically. DOCX was subsequently removed in Fix-F. `rehype-sanitize` default schema already permits table elements — no schema override needed. Bundle grew ~14 kB / 5 kB gz.

### Fix-B — Preview Prose Styles (completed 2026-05-01)
Root cause: headings were styled `var(--text-primary)` (same as body text) — correct cascade, insufficient visual distinction. Fix: comprehensive `.preview-content` rewrite in `index.css` — headings now `var(--accent)`, serif body font (Georgia), accent list markers, task list `accent-color`, table row striping, `text-underline-offset`. All values use CSS custom properties so GHS Ink theme propagates automatically.

### Fix-C — Code Block Language Picker (completed 2026-05-01)
Added `LanguagePicker` modal (29 languages, chip UI, fuzzy substring filter). UX flow: toolbar Code Block button inserts blank three-backtick fence immediately, then opens picker; user selects language → `replaceCodeBlockLanguage` tags the opening fence in place. Escape leaves the blank fence (plaintext). Clicking an existing fence line opens picker in replace mode. `Ctrl+Shift+K` and Command Palette "Code Block" use the same flow. Added `rehype-highlight` + `highlight.js` for syntax highlighting in preview; `rehype-sanitize` schema extended to allow `className` on `code` and `span`. GHS Dark highlight.js theme written in `index.css`.

**Key architectural note:** `core:window:allow-destroy` must be explicitly listed in `src-tauri/capabilities/default.json` — `core:default` does NOT cover it. Any `getCurrentWindow().*` call (setSize, minimize, destroy, hide, show, etc.) needs its own explicit `core:window:allow-*` entry. The WebView2 dev console error message always names the exact permission constant required.

### Fix-D — Multi-Tab + Drag and Drop (completed 2026-05-01)
Full state refactor: `tabs: Tab[]` + `activeTabId` replace single-document state. Setter shim pattern preserves all ~20 existing call sites. `updateActiveTab` uses `activeTabIdRef` for identity stability. Auto-save rewritten to mount once and read from refs (not closure values) — prevents wrong-tab dirty-flag writes. `TabBar` component: 36px, accent bottom border on active tab, per-tab `×` close, middle-click close, `+` new tab, horizontal overflow scroll. `onDragDropEvent` for file drop (paths from Tauri event, not DOM dataTransfer). Visual drag-over indicator: `outline: 2px dashed var(--accent)` inset on content area.

**D2:** Auto-save ref pattern fixed — interval mounts once, reads `activeTabFilePathRef`/`activeTabContentRef`/`activeTabIsDirtyRef`. Prevents stale closure writing `isDirty: false` to the wrong tab.

**D3:** Vite HMR was triggering file-write events on `.md` files being written by the app (draft auto-save), causing dev-server reloads mid-session. Fixed via `vite.config.ts` `server.watch.ignored` pattern for app data dir.

**D4:** Tab session persistence — `openFiles: string[]` and `activeFilePath` written to `settings.json` on every tab change; restored on launch. Missing paths pruned via `path_exists`. Untitled/unsaved tabs not persisted. `onCloseRequested` handler for dirty-on-close confirm dialog. Required adding `core:window:allow-destroy` to capabilities (see note above).

### Fix-E — Export Dialog + About Modal + Help Modal (completed 2026-05-01)
- `Download` icon toolbar button (right-aligned, `Ctrl+Shift+E`) opens Export Dialog modal
- Export Dialog: HTML Styled, HTML Clean, PDF, Plain Text, Copy Markdown (5 rows — DOCX removed in Fix-F)
- About modal: "Mike and the Machine" tagline, version, Mike Head attribution, Claude attribution, ecosystem list, stack
- Help modal (`F1`): keyboard shortcut reference + feature descriptions for all 6 signature features
- Native Help menu added to menu bar: "Help & Keyboard Shortcuts" (F1) + "About GHS Markdown Editor"
- All three modals: Escape to close, suppress other shortcuts while open

### Fix-F — Remove DOCX Export (completed 2026-05-01)
Removed entirely: `export_docx` Rust command, `docx-rs` Cargo dependency, JS callback, menu item, Command Palette entry, Export Dialog row. Zero docx references remain. Binary shrank ~600 kB (docx-rs + zip transitive dep removed). Export surface: HTML Styled, HTML Clean, PDF, Plain Text, Copy Markdown.

### Fix-G — Settings Panel Styling (completed 2026-05-01)
Replaced unstyled inline text selectors with proper pill segmented controls. `sectionLabelStyle` (small-caps, muted, letter-spaced), `groupStyle` (flex, 6px gap), `btnStyle(isActive)` (accent fill + bg-primary text when active, elevated bg + border when inactive, 999px border-radius, 100ms transitions). `THEME_OPTIONS` and `VIEW_MODE_OPTIONS` arrays for clean `.map()` rendering.

### Fix-H — Theme Color Refresh (completed 2026-05-01)
GHS Dark and GHS Ink refreshed to GitHub-dark / GitHub-light inspired palette:

**GHS Dark:** `#0d1117` bg, `#161b22` surface, `#21262d` elevated, `#e6edf3` text, `#58a6ff` accent, `#30363d` border.
**GHS Ink:** `#f6f8fa` bg (warm gray), `#eaeef2` surface, `#24292f` text, `#0550ae` accent, `#d0d7de` border.

Preview heading colors — Dark: H1 gold `#d4a843`, H2/H3 teal `#4ec9b0`. Ink: H1 steel blue `#0550ae`, H2/H3 forest green `#1a7f37`. Inline code: `#f97583` both themes.

`applyTheme()` now adds `dark`/`ink` class to `document.documentElement` enabling `:root.ink .preview-content h1` CSS selectors for Ink heading overrides. Highlight.js syntax theme also updated with full GitHub-dark/light token palette.

### Fix-I — Custom CodeMirror Editor Theme (completed 2026-05-01)
Replaced `oneDark` import with custom `ghsDarkTheme` and `ghsInkTheme` extensions in `src/lib/editorThemes.ts`. Editor now matches preview token-for-token: gold H1, teal H2/H3, pink-red inline code, coral keywords, light-blue strings, purple functions, orange classes. Theme extension in `extensions` array (not `theme` prop) with `theme` in `useMemo` deps — swaps instantly with Settings toggle alongside preview. `@lezer/highlight` was already available as transitive dep. `tags.code` does not exist in lezer 1.2.3 — `tags.monospace` used instead for inline code.

### Fix-Z — DOCX Export + HTML-for-Word Fallback (completed 2026-06-10)
Two new Word-compatible export formats added to Export Dialog, native menu, and Command Palette.

**Word (.docx):** `export_docx` Rust command via `docx-rs v0.4.20` + `pulldown-cmark v0.12.2` AST walk. Neither was a transitive dep — both added explicitly. Heading H1–H6 → built-in Word heading styles, bold/italic/strikethrough → Run formatting, inline code → Consolas 9pt, code blocks → per-line Normal paragraphs with indent, blockquotes → IntenseQuote style, lists → literal bullet/number prefix + ListParagraph. `CowStr` text requires `.as_ref()` not `&text` for `Into<String>`. Limitations: tables and images silently dropped, lists are literal text not native Word list objects, horizontal rule degrades to blank line.

**Word HTML (.doc):** `wrapAsWordHtml` in `preview.ts` — `renderMarkdown` output wrapped with Office namespace declarations, Word ProgId meta, and Calibri/Word-blue CSS. Saved with `.doc` extension. Word opens natively. Superior fidelity for tables, images, and syntax-highlighted code blocks — the recommended format for rich documents.

Export Dialog order: HTML Styled, HTML Clean, Word (.docx), Word HTML (.doc), PDF, Plain Text, Copy Markdown. Generic `app.on_menu_event` handler already forwards all menu IDs — no per-ID Rust arms needed, just the two new MenuItems.

### Fix-Y — Silent PDF Export via WebView2 PrintToPdf (completed 2026-06-10)
Replaced `window.print()` iframe approach with silent PDF via WebView2 COM API. `tauri::WebviewWindow::print_to_pdf()` does not exist in tauri@2.11.0 — the actual API is `ICoreWebView2_7::PrintToPdf` (COM, Windows-only). Implementation: creates hidden off-screen `WebviewWindow` (816×1056), uses `with_webview` closure on WebView2 UI thread, loads HTML via `NavigateToString` (not data URL), fires `PrintToPdf` on `NavigationCompleted` event, waits on `mpsc` channel on a `spawn_blocking` worker (30s timeout), destroys hidden window. Added Windows-only deps: `webview2-com = "0.38"`, `windows = { version = "0.61", features = ["Win32_Foundation"] }` — both already transitive, so no new compiled crates.

_Critical findings:_ `None` print settings → US Letter, not A4, and `ShouldPrintBackgrounds` defaults to `false` (drops all background shading). Must create explicit `ICoreWebView2PrintSettings` with A4 dimensions (8.27×11.69 in), 20mm/18mm margins, `ShouldPrintBackgrounds(true)`. CSS `@page` margin set to 0 to avoid double-stacking with print settings margins. Event-driven (NavigationCompleted) is superior to fixed sleep — eliminated the 1500ms delay entirely. PDF producer: `Skia/PDF m149` (Chromium). Capabilities already present from Fix-J.

### Fix-X — Detached Preview Window Scroll Sync (completed 2026-05-02)
One-way editor → detached preview scroll sync. `handleEditorScroll` in App.tsx emits `preview-scroll-update { topLine }` when `previewDetached` is true. `PreviewWindowApp` listens and calls `syncPreviewToEditorLine` on its local container. `previewSnapshotRef` extended to include `topLine` and `accentColor` — the handshake and every content update carry both, so the detached window opens at the correct scroll position and re-applies after content re-renders. 50ms `setTimeout` after HTML state update to allow DOM layout to settle before `getBoundingClientRect()` calls. `previewDetachedRef` added to App.tsx so `handleEditorScroll` reads detach state without widening its dep list. One-way only by design — detached window is a reading surface; reverse sync would interfere with typing. Bonus: detached window now also receives `accentColor` on every update (latent Fix-V inconsistency fixed).

### Fix-W — Table Scroll Anchors (completed 2026-05-02)
Two-line addition to `preview.ts`. Added `'table'` to `TAGGABLE_NODE_TYPES` and `table: ['data-source-line']` to sanitize schema. GFM tables now carry `data-source-line` on the outer `<table>` element, joining headings, paragraphs, code blocks, blockquotes, and lists in the anchor set. Tables are typically tall — without this, scrolling through a table-heavy section produced no preview movement. Both changes required: remark plugin stamps the attribute, sanitize schema preserves it through the pipeline.

### Fix-V — Accent Color, Font Size, Font Family (completed 2026-05-02)
Three new Settings panel controls, all persisted in `settings.json`. Accent color: 10 preset circles (`ACCENT_PRESETS` in `theme.ts`), selected circle has white ring + colored glow. `applyTheme(theme, accentColor?)` extended — writes full theme tokens first then overlays `--accent`/`--accent-hover` to avoid one-frame flash. Font size: slider 12–20px, default 14. Font family: 4 presets (Cascadia Code, Consolas, Georgia, Arial) — all guaranteed on Windows, spanning monospace/monospace/serif/sans-serif for obvious visual differentiation. Each font family button renders in its own typeface. Font applied via wrapper div `fontSize`/`fontFamily` with `inherit` on `.cm-content` and `.cm-scroller` (`.cm-scroller` had hardcoded `font-size: 14px` in `index.css` that was shadowing the inherit — fixed). Store keys: `accentColor`, `editorFontSize`, `editorFontFamily`. Accent validation: loose (starts with `#`) to preserve future user values not in current presets.

### Fix-U — GHS-Styled Search Panel (completed 2026-05-02)
CSS-only addition to `index.css`. CodeMirror search panel (Ctrl+F) now matches GHS palette: elevated background, accent-bordered focused inputs, accent-on-hover buttons, accent-tinted checkboxes. Search match highlights: translucent gold `rgba(212,168,67,0.25)` in dark, translucent steel blue `rgba(5,80,174,0.15)` in ink — both use rgba so syntax highlighting shows through. Active match gets stronger opacity + solid outline. `:root.ink` selector handles theme switching. `!important` required throughout (same as Fix-O2). Close button targeted via `button[name="close"]`. Existing `.cm-searchMatch` color rules in `editorThemes.ts` functionally overridden by the new `index.css` rules with `!important`.

### Fix-T — Interpolated Preview → Editor Scroll Sync (completed 2026-05-02)
Added `syncEditorToPreviewScroll` to `scrollSync.ts`. Mirror of Fix-Q for the reverse direction. Math: `progress = (containerTop - floorAnchorTop) / (ceilAnchorTop - floorAnchorTop)`, `targetLine = floor.line + progress × (ceil.line - floor.line)`, `scrollTop = getEditorScrollTopForLine(view, round(targetLine))`. Floor-snap fallback past last anchor or when anchors share pixel position. Suppression flag set BEFORE the function call (same discipline as Fix-M/Q). Remaining asymmetry: Fix-Q output is continuous preview pixels; Fix-T output is quantized to integer editor line numbers (CodeMirror doesn't accept fractional lines). Sub-line precision improvement deferred as potential Fix-T2. `getPreviewTopSourceLine` left exported but no longer imported by App.tsx.

### Fix-S — Configurable Auto-Save (completed 2026-05-02)
Auto-save changed from hardcoded 30s-always to user-configurable Off/30s/1m/2m/5m. Default is Off. `AutoSaveInterval = 0 | 30 | 60 | 120 | 300` type in App.tsx. `AUTOSAVE_VALID` array doubles as valid-value list and type-narrowing input. Sidebar/SettingsPanel speak plain `number`; App narrows at the boundary. Auto-save `useEffect` now has `[autoSaveInterval, updateTab]` deps — re-mounts on change, short-circuits to no-op when 0. Changing interval resets the countdown (standard clearInterval/setInterval semantic). Settings panel: "AUTO-SAVE" label with five pill buttons, italic descriptive caption updates to match selection. Persisted under `autoSaveInterval` in `settings.json`.

### Fix-Q — Interpolated Scroll Sync (completed 2026-05-02)
Replaced floor-snap in `syncPreviewToEditorLine` with bracket-and-interpolate. Finds floor anchor (line ≤ topEditorLine) and ceil anchor (next anchor), computes `progress = (topLine - floor.line) / (ceil.line - floor.line)`, interpolates preview scroll as `floorOffset + progress × (ceilOffset - floorOffset)`. Preview now scrolls continuously through long sections — no freeze/jump between anchors. Edge cases: above all anchors → progress clamped to 0; below last anchor → floor-snap fallback; same-line anchors → floor-snap fallback; single anchor → floor-snap. Preview → Editor direction still uses floor-snap (Fix-T will address this).

### Fix-P — Status Bar Polish (completed 2026-05-02)
Single-file rewrite of `StatusBar.tsx`. Changes: 16px side padding (fixes rounded-corner clipping), three `<Sep />` vertical separator strokes between groups, amber dirty dot `#d4a843` replacing `*` prefix (hardcoded gold — works on both themes; `var(--accent)` is steel blue in Ink which doesn't read as warning), locale `toLocaleString()` on word/char counts, reading time hidden when `< 2 min`, view mode shown as `PenLine`/`Columns2`/`Eye` icon (accent-colored) instead of text label. `flex: 1` spacer pushes view icon right. `overflow: hidden` + `whiteSpace: nowrap` prevents wrapping on narrow windows. `VIEW_ICONS` record typed via `typeof PenLine` (no public `LucideIcon` type in lucide-react v1).

### Fix-O — Editor Right-Click Context Menu (completed 2026-05-02)
Native context menu via `show_editor_context_menu` Tauri command. `WebviewWindow::popup_menu()` available directly at 2.11.0. `CheckMenuItem` with runtime boolean correctly renders checkmarks. Context menu events route through existing `app.on_menu_event` handler — no separate wiring needed. `editorView` added to `handlersRef` for editor-dependent cases. `basicSetup={{ lineNumbers: showLineNumbers }}` drives gutter toggle cleanly. `EditorView.lineWrapping` pushed conditionally into extensions memo. Word Wrap and Show Line Numbers persisted in `settings.json`. Clipboard items (Cut/Copy/Paste/Select All) use `PredefinedMenuItem` — handled by WebView directly, no `menu-event` payload needed.

### Fix-O2 — Editor Selection Visibility (completed 2026-05-02)
**Root cause:** CodeMirror 6 renders `.cm-selectionLayer` at `z-index: -1` (behind text). An opaque `.cm-activeLine` background (`#161b22`) painted over the selection rect on the active line, making single-line selections invisible. Multi-line drags appeared to work because the cursor landed outside the selected range, so the active line never overlapped the selection rects.

**Fix:** Converted `.cm-activeLine` background to translucent `rgba(255,255,255,0.04)` (dark) and `rgba(0,0,0,0.04)` (ink) — visually identical to originals but lets the selection layer show through. Also brightened selection colors: GHS Dark focused `#3a7ac0`, unfocused `#2d5f8f`; GHS Ink focused `#90b8f0`, unfocused `#a8c8f8`. `!important` required on `.cm-selectionBackground` to win specificity battle against CodeMirror's internal ruleset.

_Key lesson:_ When selection is visible in multi-line drag but invisible on single-line click, suspect a z-index/stacking issue, not a color issue. The asymmetry is caused by cursor geometry — active line only overlaps selection when cursor is within the selected range.

### Fix-N — Singleton App + File Open on Double-Click (completed 2026-05-02)
Added `tauri-plugin-single-instance v2.4.2`. Second launch intercepted at OS level; markdown path extracted and forwarded via `open-file-from-arg` event to running instance. `extract_markdown_path()` shared helper used by both cold-launch and warm-launch paths. `trim_matches('"')` defense-in-depth against quoted paths. `@tauri-apps/plugin-single-instance` npm package does not exist — plugin is Rust-only, no JS surface. Added `core:window:allow-set-focus` capability.

### Fix-N2 — Cold Launch File Open + Window Restore (completed 2026-05-02)
**Root cause of cold-launch file not opening:** React state race — `openFileByPath` ran and added the file tab, but was then overwritten by `setTabs(restored)` from the saved-tabs restore which finished later (more async hops). Fix: move cold-launch arg pull inside the one-time setup closure, after `setTabs(restored)`. Eager manual ref sync (`tabsRef.current = restored`, `activeTabIdRef.current = ...`) required because `useEffect` ref-sync hasn't committed yet at that point.

**Diagnostic confirmed:** raw args arrive without literal quote characters — Windows' argument parser strips them. `extract_markdown_path` was already returning `Some(path)` correctly. The Rust side was never the problem.

**Window restore:** Added `window.unminimize()` + `window.show()` before `setFocus()` in both Rust single-instance closure and JS `open-file-from-arg` handler. Added `core:window:allow-unminimize` and `core:window:allow-show` capabilities.

_Key lesson:_ When debugging "feature does nothing," check React effect ordering before assuming the data pipeline is broken. Two concurrent `setTabs` calls where one is absolute (`setTabs(restored)`) will clobber a functional `addTab` callback if it resolves first.

### Fix-M — Anchor-Based Scroll Synchronization (completed 2026-05-01)
Replaced ratio-based scroll sync with anchor-based sync using `data-source-line` attributes. Extended `remarkSourceLines` plugin to tag `paragraph`, `code` (→ `<pre>`), `blockquote`, `list` (→ `<ul>`/`<ol>`) in addition to headings. Sanitize schema updated for all new tags. New `src/lib/scrollSync.ts` with five exported functions.

_Editor → Preview:_ `getEditorTopSourceLine(view)` uses `lineBlockAtHeight(scrollTop)` to find the line at the editor's top pixel. `syncPreviewToEditorLine(preview, topLine)` does a floor-match (largest anchor line ≤ topLine) and sets `preview.scrollTop` via `getBoundingClientRect()` deltas. `isSyncingScroll.current = true` must be set BEFORE calling `syncPreviewToEditorLine` — `scrollTop` assignment fires the scroll event synchronously.

_Preview → Editor:_ `getPreviewTopSourceLine(preview)` finds the first anchor intersecting the preview viewport. `getEditorScrollTopForLine(view, line)` uses `lineBlockAt(pos)` (position-based, not pixel-based) to compute pixel offset. SmartGutter dot still uses ratio (cosmetic only).

_Key technical notes:_
- `code` mdast node → `<pre>` hast (outer element), not inner `<code>` — attribute correctly on the block parent
- Floor-match (not closest-match) for anchor selection — correct UX when cursor is mid-paragraph
- `isSyncingScroll` reset in the no-overflow fallback path to prevent flag getting stuck
- Ratio fallback retained for empty/anchor-free documents
- `syncPreviewToEditorLine` is pure — flag management stays in App.tsx

_Known limitations:_ List anchors at `<ul>`/`<ol>` level only (not `<li>`). Tables not tagged. Detached preview window (Fix-J) not synced. Sparse-anchor documents (heading-only) may show visible "stepping" rather than gliding.

### Fix-L — .md File Association, Per-User, No Admin (completed 2026-05-01)
On first launch, native `ask()` dialog prompts to register as default `.md` app. Writes four `HKCU\Software\Classes` keys via `reg.exe` (no admin required). `check_file_association` checks current state; if already registered (e.g. via MSI), prompt is silently suppressed. `fileAssocPromptShown` key in `settings.json` prevents repeat prompting. Settings panel "File Association" section with "Register for .md files" button for manual re-registration. `run_reg_add` Rust helper extracted to avoid four near-identical command blocks.

_Key notes:_ `settingsLoaded` is a ref — cannot be used as a `useEffect` dep (ref mutation doesn't trigger re-render). Prompt logic inlined into the existing one-time setup IIFE instead. `std::process::Command` in Rust requires no capability — it runs in the Rust process, not the WebView. Best-effort `assoc` shell-refresh often fails for HKCU operations; Explorer picks up HKCU keys on F5 refresh or next logon. Icon path points to the `.exe` at registration time — re-register if the exe is moved.

### Fix-K — Active Line & Section Highlighting (completed 2026-05-01)
`remarkSourceLines` plugin stamps `data-source-line` on every heading node before `remarkRehype`. `rehype-sanitize` schema explicitly allows `data-source-line` on h1–h6 using the dashed form (not camelCase — `data-*` attrs are stored verbatim in hast, not normalized like known HTML attrs). `unist-util-visit` promoted from transitive to direct dep.

_Preview → Editor:_ Click handler walks up from click target via `parentElement`, finds heading with `data-source-line`, calls `scrollToLine(editorView, line)`. Heading cursor changes to pointer on hover with slight opacity reduction. Only headings with `data-source-line` get the affordance.

_Editor → Preview:_ `activeSourceLine` derived from `topology[activeTopologyIndex].lineNumber`. Passed to `PreviewPane` as prop. `useEffect` keyed on `[activeSourceLine, html]` removes previous `.preview-heading-active` class and applies it to the matching heading. Effect dep on `html` is critical — `dangerouslySetInnerHTML` replaces the entire subtree on each render, so the class must be reapplied after every content change.

_Key lessons:_ `data-*` schema keys in `hast-util-sanitize` must use the dashed form verbatim. Schema mismatches fail silently — attributes are stripped with no error. `forwardRef` + local ref fan-out pattern for components that need both external ref exposure and internal DOM access.

_Known limitation:_ Detached preview window (Fix-J) does not receive `activeSourceLine` — heading click in detached window is a no-op. Wiring reverse handshake deferred.

### Fix-J — Preview in Separate Window (completed 2026-05-01)
`ExternalLink` toolbar button detaches preview into a separate Tauri window, live-synced via `preview-content-update` event. Detaching auto-switches main window to Write mode; closing preview window restores Split; manually switching to Split closes the preview window.

_Architecture:_ Same Vite app, `/?preview=true` query param discriminates. `IS_PREVIEW_WINDOW` constant at module load. `PreviewWindowApp` renders only `<PreviewPane>` with a 100vh container. `THEME_TOKENS` and `applyTheme` extracted to `src/lib/theme.ts` (shared by both windows). Handshake pattern: preview emits `preview-window-ready` after `listen()` resolves; main responds with snapshot. Stable listener + ref pattern (same as Fix-D2 auto-save) — deps-reactive listener creates gaps where events drop.

_Critical architectural lessons (apply to all future multi-window Tauri work):_
- **`app.set_menu()` sets app-wide default** — all new windows inherit it. Use `window.set_menu()` scoped to the main window only.
- **Every Tauri window needs its own capability file.** `default.json` scoped to `["main"]` silently denies all Tauri API calls (including `listen()`) in secondary windows. Rejection comes as a swallowed promise rejection — no visible error. Symptom: feature appears to do nothing. Fix: create `src-tauri/capabilities/preview.json` with `"windows": ["preview"]`.
- **Diagnostic technique:** wrap async setup in `try/catch` with explicit `console.error`. Turns silent failures into actionable errors.
- **Stable event listeners:** any `useEffect` with non-empty deps that registers an event listener creates a gap on cleanup/remount. Pattern: empty deps + ref to latest values.
- **Belt-and-braces:** 300ms backup emit after `tauri://created` covers slow React mounts in the secondary window.
Replaced `oneDark` import with custom `ghsDarkTheme` and `ghsInkTheme` extensions in `src/lib/editorThemes.ts`. Editor now matches preview token-for-token: gold H1, teal H2/H3, pink-red inline code, coral keywords, light-blue strings, purple functions, orange classes. Theme extension in `extensions` array (not `theme` prop) with `theme` in `useMemo` deps — swaps instantly with Settings toggle alongside preview. `@lezer/highlight` was already available as transitive dep. `tags.code` does not exist in lezer 1.2.3 — `tags.monospace` used instead for inline code.

---

## Backlog

| ID | Item | Notes |
|---|---|---|
| BL-01 | GHS Glass theme | Tailwind backdrop-blur panel effect; deferred to post-Phase 3 |
| BL-02 | macOS support | Tauri supports macOS; not in v1.0 scope. Re-evaluate post-ship. |
| BL-03 | Linux support | Same as macOS. AppImage distribution. Post-ship. |
| BL-04 | Find & Replace | Ctrl+H panel in editor. Post-Phase 3. |
| BL-05 | Table editor UI | Visual table editor overlay. Post-Phase 5. |
| BL-06 | AI writing assist panel | Sidebar slot. Requires API key management. Post-v1.0. |
| BL-07 | GitHub Gist sync | Optional cloud backup. Post-v1.0. |
| BL-08 | Spell check | CodeMirror spell-check extension. Post-Phase 3. |
| BL-09 | Cross-README sync | Ensure all four ecosystem READMEs cross-reference each other. Pre-v1.0 release. |
| BL-10 | Bundle size audit | Tree-shake remark plugins; lazy-load sidebar panels. Post-Phase 5. |

---

## Known Constraints

- Tauri uses the OS WebView (WebView2 on Windows). CSS rendering is Chromium-based on Windows 10/11 — consistent and reliable.
- ~~`docx-rs` DOCX export~~ — removed in Fix-F. DOCX output was unformatted plain text; HTML (Styled/Clean) and PDF are the supported export formats.
- PDF export via print-to-PDF is OS-dependent. Windows 10+ has built-in PDF printer support.
- File association on Windows requires the app to be installed (not just run as portable). Association is registered at build time via `tauri.conf.json`. A portable `.exe` drop will not auto-associate.
- Snapshots (Phase 10) are stored in `%APPDATA%\com.ghs.markdown-tauri\snapshots\`. Directory grows unbounded per document until pruning logic runs.

---

## Process Rules

- **Plan in Claude app · Implement in Claude Code (CC)**
- Phase-gated: each phase verified against acceptance criteria before next prompt generated
- After each phase: paste implementation notes back to Claude → spec updated with actuals → next prompt generated
- Spec lives at `docs/SPEC.md` in the repo root (`D:\Source\MarkDown-Tauri\docs\SPEC.md`)
- CC prompts saved as `docs/PHASE{N}-PROMPT.md` and invoked via `read docs/PHASE{N}-PROMPT.md and execute it`
- Spec is always source of truth — never regenerated from scratch, only updated with actuals
- `tsc --noEmit` + `npm run tauri build` passing with zero errors is the non-negotiable completion gate per phase
- Explicit "Do Not Implement" list in every CC prompt to prevent scope creep

---

*SPEC.md v1.0 — GHS Markdown Editor (Tauri) — generated 2026-05-01*