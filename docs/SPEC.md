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

_Correction (Issue #4):_ The earlier note above that the `code` mdast node maps to `<pre>` hast was wrong. mdast-util-to-hast applies hProperties to the inner `<code>` element, where the sanitize schema (`code: ['className']`) stripped `data-source-line`, so fenced code blocks had no scroll-sync anchor. A rehype step in `preview.ts` (`rehypeLiftCodeSourceLine`, between `remarkRehype` and `rehypeSanitize`) now lifts the attribute to `<pre>` before sanitizing. The sanitize schema was not widened.

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

### Software Factory Install (completed 2026-10-25)
Installed the zazencodes software factory v2 (`/factory run`: GitHub issues labeled `factory` → intake → spec → build → gate → review → approve, one PR per issue). Files: `.claude/skills/factory/SKILL.md`, eight agents in `.claude/agents/`, `factory/{config.json,checks.sh,dashboard.html}`, `factory/bin/{job,gate,route}`. `factory/jobs/` is gitignored runtime state. Config: `concurrency` 1, `merge_method` squash, `src/*.test.ts` protected (the gate fails any branch that modifies or deletes an existing test; new tests are fine). `checks.sh` = `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run build`, `cargo check`, with a shared `CARGO_TARGET_DIR` under `~/.cache` across job worktrees. No app code changed.

**Deviations from upstream:**
- **Skill and agents are reconstructed.** Upstream's root `.gitignore` ignores `.claude` with no exception for v2, so the published v2 skill and agents don't exist (404). They were rebuilt from the published v1 skill and agents plus v2's `BUILD_PROMPT.md`, `DESIGN.md` and example jobs, against the published v2 scripts. Each file carries a `Reconstructed from v1 + BUILD_PROMPT.md…` comment so they can be diffed if upstream publishes the originals.
- **Windows patches to `factory/bin/job` and `factory/bin/route`**, each marked `local patch, not upstream`: (1) `fcntl` is POSIX-only, so the job lock falls back to `msvcrt.locking`, retried until acquired, because `LK_LOCK` gives up after ~10s while `flock` waits; (2) the scripts call each other via `[sys.executable, path]`, because Windows can't exec a shebang script ([WinError 2]); (3) the cost meter compares `Job folder:` paths with forward slashes on both sides.
- **`PYTHONUTF8=1`** in `.claude/settings.json` `env`. Python 3.14 on Windows defaults to cp1252 for file I/O, and Claude Code transcripts contain non-cp1252 UTF-8, which would crash every `job sync`/`advance`. Manual runs outside Claude Code need `$env:PYTHONUTF8 = "1"`.

**Lessons learned:**
- Python factory scripts written for macOS/Linux break on Windows in three quiet ways: `fcntl`, shebang exec from `subprocess`, and locale-default encoding. Check all three before trusting a POSIX tool here.
- The builder's stop hook goes in the frontmatter under `Stop`; Claude Code converts it to `SubagentStop` when the agent runs as a subagent.
- Browser review uses `npx vite --port <port>` (CLI overrides the 1420 config port, and `strictPort` still applies). `npm run tauri dev` is pinned to 1420, which is another reason to keep `concurrency` at 1.


### Fix — Preview List Markers (completed 2026-10-25)

Issue #6: the preview pane showed list items with indent but no bullets or numbers.

**What was built:** In `src/index.css`, `.preview-content ul` is `disc` and `ol` is `decimal`. Nested lists: `ul ul` is `circle`, `ul ul ul` (and deeper) is `square`, `ol ol` is `decimal`; a `ul` inside an `ol` keeps `disc`. `li.task-list-item` is `list-style-type: none` so GFM task lists keep showing only the checkbox. The existing `li::marker { color: var(--accent) }` now has something to color, so markers follow the theme accent and any accent override.

**Cause:** Tailwind v4 preflight (`@layer base`) sets `list-style: none` on `ol, ul, menu`, and `.preview-content` set only padding. Unlayered rules in `index.css` override preflight without `!important`.

**Export stylesheets:** The styled HTML and PDF stylesheets in `src/lib/preview.ts` are standalone documents without Tailwind, use browser default list styles, and were checked and left unchanged.

**Lessons learned:**
- Any element styled under `.preview-content` must restate the properties preflight resets, such as list styles.

### Factory Tuning 1 (completed 2026-10-25)

Tuning after the first two factory jobs (001 fenced code blocks, #4; 002 preview list markers, #6). No app code changed.

**What changed and why:**
- **`factory/checks.sh` retries `npm ci`** up to 3 times, 5 seconds apart, logging each failed attempt to stderr and exiting non-zero only if all 3 fail. On Windows `npm ci` fails on transient file locks under `node_modules` (job 002's first checks run failed this way). Nothing else in the script changed.
- **Factory skill: the orchestrator never reruns a failed gate on its own.** A FAIL always follows the pipeline: back to the builder with the log, or to a human when rounds are exhausted. Rerunning a failed gate by hand hides real failures and skips the round count. Added under **gate** and **Guardrails**.
- **Builder: confirm the dev server has exited** (nothing listening on its port) after stopping it and before running `checks.sh` or finishing. A running Vite server keeps files under `node_modules` locked, which is what broke `npm ci` in job 002.
- **Spec writer: every acceptance criterion must be verifiable by a command or by `agent-browser` against the Vite dev server.** No manual-only criteria; what can't be verified that way goes under Assumptions. Job 001's spec had a "Manual (browser only)" criterion the builder skipped and marked not performed.
- **UI and UX reviewers check the narrowest supported window width** (the main window's `minWidth` in `src-tauri/tauri.conf.json`, currently 900) instead of phone width. If no `minWidth` is set, they say so as a Note, not a finding. Job 002's UI review spent effort on a 390px layout the desktop app never supports.

**Lessons learned:**
- Agent prompts written for web apps need adjusting for a desktop-only Tauri app: phone widths and manual browser checks don't fit it.
- On Windows, any process left running in a worktree can break the next `npm ci`. Agents must confirm their processes have exited, and the checks retry to absorb brief locks.

### Auto Theme (completed 2026-10-25)

Added an Auto option to Settings > Theme that follows the Windows light/dark mode (job 003, #9).

**What was built:**
- `src/lib/theme.ts` keeps `Theme = 'dark' | 'ink'` as the resolved theme and adds `ThemePreference = Theme | 'auto'`, `resolveTheme(preference, osPrefersDark)` and `isThemePreference(value)`. Auto maps dark to GHS Dark and light to GHS Ink; no new palette.
- `App.tsx` state `theme` is now the preference. A separate `osPrefersDark` state starts from `matchMedia('(prefers-color-scheme: dark)')`; while the preference is `'auto'` an effect listens for the query's `change` event and removes the listener on cleanup. `resolvedTheme = resolveTheme(theme, osPrefersDark)` is what `applyTheme`, `<Editor>`, the `preview-content-update` emit and `previewSnapshotRef` receive. Re-running `applyTheme(resolvedTheme, accentColor)` on an OS switch keeps the accent override.
- `settings.json` `theme` may now be `"auto"`. Load uses `isThemePreference`; missing or invalid values still fall back to `dark`.
- The detached preview window still only receives `dark`/`ink`, so `PreviewWindowApp.tsx` is unchanged.
- Unit tests in `src/lib/theme.test.ts`.

**Lessons learned:**
- Keep the stored preference separate from the resolved theme so downstream consumers never need to know about Auto.
- `agent-browser set media` fires the same `change` event as a Windows mode switch, so live switching is verifiable in a plain browser.

### Factory Tuning 2 (completed 2026-10-25)

Job 003's (#9) merge-time gate failed: the UX reviewer's Vite dev server was still running in the worktree and kept files under `node_modules` locked, so `npm ci` in `checks.sh` failed. The builder rule from Factory Tuning 1 didn't cover the reviewers. No app code changed.

**What changed and why:**
- **`factory/bin/gate` frees the job's ports before running `checks.sh`** (marked `local patch, not upstream`). It computes the ports the orchestrator assigns (`ports.base + ports.step * n` for the builder, `+1` for reviewer-ux, `+2` for reviewer-ui, with `n` the job number), finds any process `LISTENING` on them in `netstat -ano`, and stops it with its children (`taskkill /PID <pid> /T /F`), printing `gate: freed port <port> ...` for each. Free ports are left alone. It only runs on Windows. `job merge` calls the gate, so the merge-time gate gets it too. The builder's stop hook (`gate --hook`) doesn't.
- **UX and UI reviewers confirm the dev server has exited** (nothing listening on their port) after stopping it and before writing their review file. This is the same rule the builder has.

**Lessons learned:**
- Every agent that starts a dev server can leave a lock behind, not just the builder. Agent rules can be skipped, so the gate cleans up deterministically as well.
- The `+1`/`+2` reviewer offsets live in the factory skill, not `config.json`. The gate hard-codes them, so the two must change together.

### Editor Tab Size (completed 2026-10-25)

Job 004 (#10) adds an editor tab size setting with two choices, 2 and 4 spaces.

**What was built:**
- **Settings panel:** a "Tab Size" pill row (2 / 4) after "Editor Font". `Sidebar` forwards `editorTabSize` and `onEditorTabSizeChange` from `App`.
- **Persistence:** the `editorTabSize` key in `settings.json`, default 2. It is saved by the existing editor-font effect. On load, `normalizeTabSize` in `src/lib/theme.ts` maps any stored value other than the number 2 or 4 to 2.
- **Editor:** `Editor` takes a `tabSize` prop and pushes `EditorState.tabSize.of(tabSize)` and `indentUnit.of(' '.repeat(tabSize))` into the `extensions` memo, with `tabSize` in its deps. The change applies to the open editor live, without a remount or touching the document. Existing text is not reformatted; indentation is always spaces.
- **Tests:** `src/lib/theme.tabSize.test.ts` covers `normalizeTabSize`.

**Lessons learned:**
- Changing a dep of the `extensions` memo reconfigures the live CodeMirror editor, so settings that map to extensions need no special apply step.
- Existing test files are protected, so new tests for `theme.ts` go in a separate `theme.<topic>.test.ts` file.

### Dim Markdown Syntax Markers (completed 2026-10-25)

Job 005 (#11) dims Markdown syntax characters in the editor so content stands out.

**What was built:**
- **Rule:** a `tags.processingInstruction` rule, colour only, added as the last entry of `ghsDarkHighlight` (`#6e7681`) and `ghsInkHighlight` (`#8c959f`) in `src/lib/editorThemes.ts`. Both styles are now exported by name.
- **Nodes dimmed:** `HeaderMark`, `EmphasisMark`, `CodeMark`, `QuoteMark`, `ListMark`, `LinkMark` (so link brackets dim too) and `HardBreak`. They all share the `processingInstruction` tag.
- **Weight and size:** the rule sets no font size, weight or style, so a marker keeps its parent's (the H1 `#` stays bold at 1.1em).
- **Tests:** `src/lib/editorThemes.test.ts` runs `highlightTree` over a sample for both styles and checks marker spans, content spans, the rule's colour and the rule order.

**Lessons learned:**
- `processingInstruction` is a subtag of `meta`, so markers previously got the `meta` colour by fallback, only slightly dimmed and identical to the quote text in GHS Ink.
- Marker spans carry the parent's class too (heading, emphasis, quote), and same-specificity rules resolve by array order. The `processingInstruction` rule must stay last in each array or parent colours win.

### Trailing-Space Markers and Hard Line Break (completed 2026-10-25)

Job 006 (#12) shows trailing spaces as faint dots and adds a hard line break toolbar button.

**What was built:**
- **Decoration:** `src/lib/trailingSpaces.ts` exports `trailingSpaceRun` (offsets of a trailing run of 2+ U+0020 spaces, else null; tabs end the run) and `trailingSpaceMarkers()`, a `ViewPlugin` that adds one `Decoration.mark` (`cm-trailingSpace`) per space for each line in `visibleRanges`. Only runs of 2+ are marked; the document is never changed.
- **Theme:** `.cm-trailingSpace` in `ghsDarkBase` (`#6e7681`) and `ghsInkBase` (`#8c959f`) draws a centred, non-repeating radial-gradient dot per span.
- **Setting:** `showTrailingSpaces` (store key `showTrailingSpaces`, default On) is saved in the editor-toggles persistence effect in `App.tsx`, passed to `Editor`, and toggled by an On/Off "Trailing Spaces" section in Settings between Tab Size and Default View Mode.
- **Toolbar:** `insertHardLineBreak` (`insertSnippet(view, '  \n')`) is bound to a `CornerDownLeft` button titled "Hard Line Break (two trailing spaces)" after Horizontal Rule.
- **Tests:** `src/lib/trailingSpaces.test.ts` covers `trailingSpaceRun`.

**Lessons learned:**
- One mark per space (not one per run) keeps the dot centred in each space, which matters for proportional editor fonts where a space is not `1ch`.
- `insertHardLineBreak` needs a live `EditorView`, so it is verified in the browser rather than in node Vitest.

### Focus Mode (completed 2026-10-25)

Job 007 (#13) adds a distraction-free Focus Mode toggled with Ctrl+Shift+F.

**What was built:**
- **Toggle:** a `focusMode` boolean in `App`, flipped by Ctrl+Shift+F (placed after the modal guard, so it does nothing while a modal is open) and by the `cmd-toggle-focus-mode` palette command. It is also listed in the Help shortcuts.
- **Hidden and kept:** `Toolbar`, `TabBar`, `Sidebar` and `StatusBar` are not rendered while it is on, using in-place `{!focusMode && ...}` so `Editor`, `PreviewPane` and `SmartGutter` are never remounted. The CodeMirror instance, undo history, cursor and scroll positions survive. `viewMode`, `splitRatio`, `sidebarOpen` and `activePanel` are untouched, so the sidebar returns as it was. The existing flex layout makes the split container fill the window.
- **Session-only:** the state is never written to the settings store or `localStorage`; each launch starts with it off.
- **Exit button:** a fixed 28px `Minimize2` button at the top right (`zIndex` 900, below the 1000 modals), coloured only with theme variables.
- **Escape:** exits Focus Mode only when it is on, no modal flag (`paletteOpen`, `langPickerOpen`, `exportOpen`, `aboutOpen`, `helpOpen`) is set, `e.defaultPrevented` is false, and the target is not inside `.cm-panels`.

**Lessons learned:**
- `ExportDialog`, `AboutModal` and `HelpModal` add their `window` keydown listeners only while open, so they run after App's listener. `defaultPrevented` is still false when App sees the event, so App must check the modal flags itself.
- CodeMirror's search keymap (`Mod-f`) also matches Ctrl+Shift+F and opens the search panel, contrary to first assumption. `Editor` adds a highest-precedence `keydown` DOM handler that claims the combo so App's toggle is the only effect.
- The CodeMirror search panel closes on Escape through its keymap, so App checks for `.cm-panels` in the target rather than relying on ordering.

### Factory Tuning 3a (completed 2026-10-25)

Two problems held up job 006. Its gate was refused because `cargo check` in `checks.sh` regenerated the tracked files under `src-tauri/gen/schemas/`, so the worktree was dirty afterwards. Its merge then conflicted on `docs/SPEC.md`, because every job appends an entry at the same place. No app code changed.

**What changed and why:**
- **Generated schemas are untracked.** `src-tauri/gen/schemas/` is in `.gitignore` and was removed from the index with `git rm -r --cached`. Tauri's build script writes `acl-manifests.json`, `capabilities.json`, `desktop-schema.json` and `windows-schema.json` on every build or check. Deleting them and rerunning `cargo check` (after touching `build.rs`) rebuilt all four byte-identical. The `"$schema": "../gen/schemas/desktop-schema.json"` lines in `src-tauri/capabilities/*.json` are only editor hints and the build never reads them, so a fresh checkout without the files builds fine.
- **`docs/SPEC.md` merges with `merge=union`** (in `.gitattributes`). When two branches both add lines in the same place, Git keeps both sides' lines instead of reporting a conflict, so parallel job entries merge cleanly.

**Lessons learned:**
- Anything a check step regenerates must not be tracked, or the gate's clean-tree check fails depending on whether the build cache happened to be warm.
- A cached `cargo check` skips the build script, so to prove the schemas regenerate you have to force it to rerun (touch `build.rs`).
- Union merge doesn't understand structure. It only works because SPEC.md is append-only. Two branches editing the same existing line would both survive without a conflict marker, so SPEC.md still needs a quick read after a merge.

### Factory Tuning 3b (completed 2026-10-25)

Jobs 003–006 exposed two bugs in `factory/bin/job` and one reliability gap in the agents. After job 006 was reworked, its old `ESCALATE` `decision.md` was still there, so the approve step ("spawn the approver if `decision.md` doesn't exist") would have read the stale escalation instead of asking for a new decision. It had to be archived by hand. Separately, `job merge` removed the worktree inside the `merged` transition before saving, so a failed `git worktree remove` (on Windows, a process still holding a file in the worktree) raised, and a PR already merged on GitHub stayed in `merging`. Agents also sometimes finished with a good reply but no file, which stalled the job. No app code changed.

**What changed and why:**
- **`job rework` archives `decision.md` as `decision-<k>.md`** (the next unused `k`) in the `needs-human → build` transition, the same way `needs-info → intake` archives `intake.md`. Marked `local patch, not upstream`. The approver always writes a fresh decision, and earlier ones stay readable.
- **`job merge` can't be stuck by cleanup** (marked `local patch, not upstream`). The `merged` transition now saves `job.json` first, then calls `remove_worktree`, which never raises. That function closes the job's `agent-browser` sessions (`<job-id>-builder`, `-ux`, `-ui`; closing one that doesn't exist does nothing, and a missing CLI is skipped), then runs `git worktree remove --force`. If removal fails, the job is still `merged`. The function prints the leftover path, git's error and the fix (`git worktree remove --force "<path>"`, then `git worktree prune`) to stderr, and leaves the branch alone. The `needs-human → merged` path in `job queue` gets the same treatment.
- **Reviewers and the approver are told the file is the deliverable.** `reviewer-code`, `reviewer-security`, `reviewer-ux`, `reviewer-ui` and `approver` now say that writing their file is required, not an optional report, and that the job cannot proceed without it. A run without the file, or with a first line that isn't exactly the verdict, is a failed run. Frontmatter and reconstruction markers are unchanged.
- **The factory skill replaces an agent that doesn't deliver.** A new "When an agent doesn't deliver" section lists each agent's file and expected first line. On a missing or invalid file, the orchestrator spawns exactly one fresh replacement automatically (same prompt and model, plus a note that the previous run left no valid file). It stops for a human only if the replacement also fails. The review and approve steps point to it, replacing the old "stop and tell the user" rule. A new guardrail says the orchestrator never edits `job.json` directly: only `factory/bin/job` writes it.

**Verification:** a harness loaded `factory/bin/job` with GitHub calls stubbed and git and agent-browser running for real. (a) Reworking a throwaway job with an existing `decision.md` produced `decision-1.md` and moved it to build round 2. A second rework produced `decision-2.md` and kept `decision-1.md`. (b) A throwaway job in `merging`, with an open `<job-id>-ux` browser session and a worktree path that git refused to remove, ended in `merged`. The session was closed, and the leftover path, git's error and both commands were reported. A real removable worktree was also removed, along with its branch. All throwaway jobs, folders and branches were deleted afterwards.

**Lessons learned:**
- Record the outcome before the cleanup. Once the merge has happened, everything after it is best-effort, and failures should be reported, not raised.
- Don't capture the output of `agent-browser` calls that may start its daemon. The daemon inherits the pipes and `subprocess.run` never returns. `remove_worktree` sends its streams to `DEVNULL` with a timeout.
- A file left by an earlier pass through a stage gets read as this pass's result. Every stage file that can be rewritten in a later round needs archiving when the job loops back.

### Browser Test Harness (completed 2026-10-25)

**What was built:** `src/dev/tauriBrowserMocks.ts` fakes the Tauri backend so the Vite dev server renders and edits in a plain browser. It uses `mockWindows('main')` and `mockIPC(handleMockCommand, { shouldMockEvents: true })` from `@tauri-apps/api/mocks`. `src/main.tsx` now renders from an async `bootstrap()` that dynamically imports the harness inside `if (import.meta.env.DEV)`, in a `try/catch`. The harness is skipped when `window.__TAURI_INTERNALS__` exists, so `npm run tauri dev` is unaffected. Production exclusion is verified by `npm run build` followed by `grep -rl ghs-tauri-browser-harness dist/` and `grep -rl mockIPC dist/` printing nothing. Unit tests are in `src/dev/tauriBrowserMocks.test.ts`. One deviation: added `src/vite-env.d.ts` (`vite/client` types) because `import.meta.env` was untyped.

**Lessons learned:** `plugin:store|get` must return a `[value, exists]` tuple (`[null, false]`); a bare `null` throws in the plugin. `check_file_association` must return `true`, or the app takes the native `ask()` dialog path on every load because the mock store is empty. The marker string is a fixed literal because export names like `mockIPC` can be mangled by minification.

---

### Marker Contrast (completed 2026-10-25)

**What was built:** Job 009 (#21) raised the contrast of the dimmed Markdown markers (`tags.processingInstruction`) in `src/lib/editorThemes.ts`. GHS Dark went from `#6e7681` to `#7d8590` (about 5.07:1 on the background, 4.64:1 on the active line). GHS Ink went from `#8c959f` to `#656d76` (about 5.25:1 and 4.81:1). Both clear 4.5:1 on each and stay at least 1.5x lower in contrast than body text. The `.cm-trailingSpace` dots keep `#6e7681` (Dark) and `#8c959f` (Ink). New test: `src/lib/editorThemes.contrast.test.ts`, with its own contrast helpers because `editorThemes.test.ts` is protected.

**Lessons learned:** Measure against the active-line composite as well as the plain background, because it is the tighter bound.

---

### Export Pipeline Foundation (completed 2026-10-25)

**What was built:** Job 010 (#30) split export into pure builders and a thin save layer under `src/lib/export/`. `parse.ts` holds the shared `parseMarkdown` (unified + remark-parse + remark-gfm) and a pre-order `walk`. `html.ts` builds styled and clean HTML through `renderMarkdown`, so `rehype-sanitize` still runs and output is byte-identical to before. `plainText.ts` renders mdast to plain text: headings, inline formatting and code fences lose their markers; links become `text (url)` (just the URL when text equals it); images become `[image: alt]`; HTML tags are stripped; lists keep `- ` / `N. ` (from the list `start`) and `[x] ` / `[ ] ` task markers with nested lines indented two spaces; tables become tab-separated rows; blockquote lines (blank ones too) get a `> ` prefix; thematic breaks are `---`. Blocks are separated by one blank line and the file ends with a single `\n`. Plain Text export no longer saves the raw Markdown. `fileName.ts` derives the export base name from the first non-blank line (syntax stripped by parsing the line, forbidden characters and control characters removed, capped at 80 characters, trailing dots and spaces stripped), falling back to the file name and then `untitled` when the result is empty or a Windows reserved device name (`CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9`, `LPT1`-`LPT9`). HTML and TXT exports now default to this name; PDF and DOCX still use `exportTitleBase`. `basename` and `stripExt` moved to `src/lib/paths.ts`. `exporters.ts` composes build, name and `save` (injectable for tests), and `App.tsx` callbacks just call it and log `Export failed:`. `save.ts` is the only module that talks to Tauri. The new, still unused `write_file_bytes` command (`Vec<u8>`) and `saveBinaryExport` helper are groundwork for binary exports. No capabilities, `tauri.conf.json` or package files changed.

**Lessons learned:** A bare `Uint8Array` in an `invoke` args object does not serialize to a JSON array, so `saveBinaryExport` sends `Array.from(bytes)`. File-name derivation strips only recognised HTML element names, so prose like `<c>` keeps its text. New tests live in new files because the gate's `fnmatch` protects every existing `src/**/*.test.ts`.

---

### PDF Export via @react-pdf/renderer (completed 2026-10-25)

**What was built:** Job 011 (#27) replaced the WebView2 print path with `@react-pdf/renderer`. `src/lib/export/pdf.tsx` exports `buildPdfDocument(markdown, title, components)`, a pure function that walks the mdast from `parseMarkdown` into a `<Document>` with one LETTER `<Page>` (72pt padding, Helvetica 11pt), and `buildPdfBlob(markdown, title)`, which loads the library with `await import('@react-pdf/renderer')` and returns `pdf(doc).toBlob()`. The library is never imported statically, so it lands in its own chunk and stays out of the entry bundle. `exportToPdf` in `exporters.ts` derives the base name, builds the blob, converts it to a `Uint8Array` and hands it to `saveBinaryExport`. Inline formatting uses a `{ bold, italic, strike }` context: every run is one flat leaf `Text` whose font family (`Helvetica`, `-Bold`, `-Oblique`, `-BoldOblique`) and decoration come from that context, and `strong`, `emphasis` and `delete` add no wrapper `Text`. Links become a react-pdf `Link` only for `http:`, `https:` and `mailto:` URLs (case-insensitive); anything else renders as plain link text. Images are never fetched and render as `[image: alt]`. Raw HTML is shown with tags stripped. All sibling elements carry index-built keys.

**Deviations:** The PDF now renders before the save dialog opens, so a cancelled save still costs a render. The Rust `export_pdf_silent` command, the `export_pdf` menu item, `wrapAsPrintHtml` and the browser mock case are kept but unused (a later cleanup). PDF default names now come from `deriveExportBaseName` (first heading or line) instead of the file name. The Export Dialog PDF sublabel changed from `print dialog` to `.pdf`.

**Lessons learned:** The built-in PDF fonts use WinAnsi encoding, so the ballot box glyphs for task items (U+2610, U+2611) and other non-Latin characters probably do not render in the PDF; fixing that needs a registered font, which is a product decision. Passing the components into `buildPdfDocument` keeps the document tree testable without a static import of the library. `toBlob()` is the browser-safe output call; `toBuffer()` is for the node build.

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