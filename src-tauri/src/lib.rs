use std::fs;
use std::process::Command;
use std::sync::Mutex;
use serde::Deserialize;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

#[derive(Debug, Deserialize)]
pub struct DialogFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

struct LaunchArg(Mutex<Option<String>>);

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
async fn open_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .blocking_pick_file();
    Ok(file_path.map(|fp| fp.to_string()))
}

#[tauri::command]
async fn save_dialog(
    app: tauri::AppHandle,
    default_name: String,
    filters: Option<Vec<DialogFilter>>,
) -> Result<Option<String>, String> {
    let mut builder = app.dialog().file().set_file_name(&default_name);
    let resolved_filters = filters.unwrap_or_else(|| {
        vec![DialogFilter {
            name: "Markdown".to_string(),
            extensions: vec!["md".to_string(), "markdown".to_string()],
        }]
    });
    for f in &resolved_filters {
        let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
        builder = builder.add_filter(&f.name, &exts);
    }
    let file_path = builder.blocking_save_file();
    Ok(file_path.map(|fp| fp.to_string()))
}

#[tauri::command]
async fn confirm_discard(app: tauri::AppHandle) -> Result<bool, String> {
    let confirmed = app
        .dialog()
        .message("You have unsaved changes. Discard and continue?")
        .title("Unsaved Changes")
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::OkCancel)
        .blocking_show();
    Ok(confirmed)
}

#[tauri::command]
fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn take_launch_arg(state: tauri::State<LaunchArg>) -> Option<String> {
    state.0.lock().ok().and_then(|mut g| g.take())
}

fn snapshot_dir(app: &tauri::AppHandle, slug: &str) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("snapshots").join(slug))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_snapshots(app: tauri::AppHandle, slug: String) -> Result<Vec<String>, String> {
    let dir = snapshot_dir(&app, &slug)?;
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut entries: Vec<String> = std::fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            if name.ends_with(".md") {
                Some(name)
            } else {
                None
            }
        })
        .collect();
    entries.sort();
    Ok(entries)
}

#[tauri::command]
fn write_snapshot(
    app: tauri::AppHandle,
    slug: String,
    filename: String,
    content: String,
    max_keep: usize,
) -> Result<(), String> {
    let dir = snapshot_dir(&app, &slug)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(&filename);
    std::fs::write(&path, &content).map_err(|e| e.to_string())?;

    let mut entries: Vec<_> = std::fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_string_lossy().ends_with(".md"))
        .collect();
    entries.sort_by_key(|e| e.file_name());
    if entries.len() > max_keep {
        for old in &entries[..entries.len() - max_keep] {
            let _ = std::fs::remove_file(old.path());
        }
    }
    Ok(())
}

#[tauri::command]
fn read_snapshot(
    app: tauri::AppHandle,
    slug: String,
    filename: String,
) -> Result<String, String> {
    let path = snapshot_dir(&app, &slug)?.join(&filename);
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

// ----- File association (Windows, per-user / HKCU) -----
//
// Writes HKCU\Software\Classes keys so double-clicking a `.md` file in
// Explorer opens this app. HKCU does not require admin elevation, which lets
// the portable .exe register itself on first run. The four keys mirror the
// classic Windows file-association layout:
//   .md          -> ProgID "GHSMarkdownEditor"
//   GHSMarkdownEditor          (default value: friendly type name)
//   GHSMarkdownEditor\DefaultIcon  -> "<exe>,0"
//   GHSMarkdownEditor\shell\open\command  -> "\"<exe>\" \"%1\""
//
// `reg.exe` lives in System32 which is always on PATH on Windows; we use it
// rather than pulling in the `winreg` crate to keep the dep graph tight.

fn run_reg_add(args: &[&str], context: &str) -> Result<(), String> {
    let output = Command::new("reg")
        .args(["add"])
        .args(args)
        .args(["/f"])
        .output()
        .map_err(|e| format!("{}: failed to spawn reg.exe: {}", context, e))?;
    if !output.status.success() {
        return Err(format!(
            "{}: reg add failed: {}",
            context,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(())
}

#[tauri::command]
fn register_file_association() -> Result<bool, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("current_exe failed: {}", e))?
        .to_string_lossy()
        .to_string();

    run_reg_add(
        &[r"HKCU\Software\Classes\.md", "/ve", "/d", "GHSMarkdownEditor"],
        "associate .md",
    )?;
    run_reg_add(
        &[
            r"HKCU\Software\Classes\GHSMarkdownEditor",
            "/ve",
            "/d",
            "GHS Markdown Editor Document",
        ],
        "set ProgID display name",
    )?;
    let icon_value = format!("{},0", exe_path);
    run_reg_add(
        &[
            r"HKCU\Software\Classes\GHSMarkdownEditor\DefaultIcon",
            "/ve",
            "/d",
            &icon_value,
        ],
        "set default icon",
    )?;
    let open_cmd = format!("\"{}\" \"%1\"", exe_path);
    run_reg_add(
        &[
            r"HKCU\Software\Classes\GHSMarkdownEditor\shell\open\command",
            "/ve",
            "/d",
            &open_cmd,
        ],
        "set open command",
    )?;

    // Best-effort shell refresh. `assoc` for HKCU may emit a warning but the
    // registry write above is what actually takes effect; some shell surfaces
    // refresh on the next user logon regardless.
    let _ = Command::new("cmd")
        .args(["/c", "assoc", ".md=GHSMarkdownEditor"])
        .output();

    Ok(true)
}

#[tauri::command]
fn check_file_association() -> bool {
    let output = Command::new("reg")
        .args(["query", r"HKCU\Software\Classes\.md", "/ve"])
        .output();
    match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout).contains("GHSMarkdownEditor"),
        Err(_) => false,
    }
}

// ----- Editor right-click context menu -----
//
// Built per-popup so the Word Wrap / Show Line Numbers checkmarks reflect the
// current frontend state at the moment of the right-click. Item clicks fire
// through the existing app.on_menu_event handler, which emits the "menu-event"
// payload to the frontend — the same pipe used by the top-level menu bar. The
// frontend distinguishes context-menu events by their `ctx_*` ID prefix.
//
// Predefined cut/copy/paste/select-all are routed by the WebView itself, do
// not fire through on_menu_event, and are intentionally label-overridden via
// `with_text` so they read in plain English even on non-English Windows
// builds.
#[tauri::command]
async fn show_editor_context_menu(
    app: tauri::AppHandle,
    word_wrap: bool,
    show_line_numbers: bool,
) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let bold = MenuItem::with_id(&app, "ctx_bold", "Bold", true, Some("Ctrl+B"))
        .map_err(|e| e.to_string())?;
    let italic = MenuItem::with_id(&app, "ctx_italic", "Italic", true, Some("Ctrl+I"))
        .map_err(|e| e.to_string())?;
    let strike = MenuItem::with_id(&app, "ctx_strike", "Strikethrough", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let inline_code =
        MenuItem::with_id(&app, "ctx_inline_code", "Inline Code", true, None::<&str>)
            .map_err(|e| e.to_string())?;
    let code_block =
        MenuItem::with_id(&app, "ctx_code_block", "Code Block...", true, None::<&str>)
            .map_err(|e| e.to_string())?;

    let h1 = MenuItem::with_id(&app, "ctx_h1", "H1", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let h2 = MenuItem::with_id(&app, "ctx_h2", "H2", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let h3 = MenuItem::with_id(&app, "ctx_h3", "H3", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let h4 = MenuItem::with_id(&app, "ctx_h4", "H4", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let h5 = MenuItem::with_id(&app, "ctx_h5", "H5", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let h6 = MenuItem::with_id(&app, "ctx_h6", "H6", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let heading_sub =
        Submenu::with_items(&app, "Heading", true, &[&h1, &h2, &h3, &h4, &h5, &h6])
            .map_err(|e| e.to_string())?;

    let link = MenuItem::with_id(&app, "ctx_link", "Link", true, Some("Ctrl+K"))
        .map_err(|e| e.to_string())?;
    let image = MenuItem::with_id(&app, "ctx_image", "Image", true, None::<&str>)
        .map_err(|e| e.to_string())?;

    let sep1 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;

    let word_wrap_item = CheckMenuItem::with_id(
        &app,
        "ctx_word_wrap",
        "Word Wrap",
        true,
        word_wrap,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let line_numbers_item = CheckMenuItem::with_id(
        &app,
        "ctx_line_numbers",
        "Show Line Numbers",
        true,
        show_line_numbers,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;

    let sep2 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;

    let cut = PredefinedMenuItem::cut(&app, Some("Cut")).map_err(|e| e.to_string())?;
    let copy = PredefinedMenuItem::copy(&app, Some("Copy")).map_err(|e| e.to_string())?;
    let paste = PredefinedMenuItem::paste(&app, Some("Paste")).map_err(|e| e.to_string())?;
    let select_all =
        PredefinedMenuItem::select_all(&app, Some("Select All")).map_err(|e| e.to_string())?;

    let sep3 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;

    let save = MenuItem::with_id(&app, "ctx_save", "Save", true, Some("Ctrl+S"))
        .map_err(|e| e.to_string())?;
    let save_as = MenuItem::with_id(&app, "ctx_save_as", "Save As...", true, Some("Ctrl+Shift+S"))
        .map_err(|e| e.to_string())?;

    let menu = Menu::with_items(
        &app,
        &[
            &bold,
            &italic,
            &strike,
            &inline_code,
            &code_block,
            &heading_sub,
            &link,
            &image,
            &sep1,
            &word_wrap_item,
            &line_numbers_item,
            &sep2,
            &cut,
            &copy,
            &paste,
            &select_all,
            &sep3,
            &save,
            &save_as,
        ],
    )
    .map_err(|e| e.to_string())?;

    window
        .popup_menu(&menu)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ----- Silent PDF export (Fix-Y) -----
//
// Renders print-styled HTML to a PDF on disk with no print dialog. The flow:
//   1. Frontend hands us the already-rendered print HTML and a target path.
//   2. We spin up a hidden, off-screen WebviewWindow on about:blank.
//   3. with_webview() hands the closure the live WebView2 controller on the
//      UI thread. Neither tauri 2.11 nor wry 0.55 wrap print-to-pdf, so we
//      reach ICoreWebView2_7::PrintToPdf through the raw COM bindings.
//   4. We register a NavigationCompleted handler, then NavigateToString() the
//      HTML. When that navigation finishes we call PrintToPdf; its completion
//      handler reports success/failure back over an mpsc channel.
//   5. The async command blocks (on a worker thread) until the channel fires
//      or a timeout elapses, then destroys the hidden window.
//
// WebView2 COM objects are thread-affine to the UI thread that created them;
// with_webview's closure and both event/completion handlers all run there, so
// the unsafe COM calls are sound. We only ever wait from a separate worker
// thread (spawn_blocking), never from the UI thread, so no deadlock.

#[cfg(windows)]
fn print_to_pdf_via_webview(
    platform: tauri::webview::PlatformWebview,
    html: String,
    output_path: String,
    tx: std::sync::mpsc::Sender<Result<(), String>>,
) {
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2Environment6, ICoreWebView2_2, ICoreWebView2_7,
    };
    use webview2_com::{NavigationCompletedEventHandler, PrintToPdfCompletedHandler};
    use windows::core::{Interface, HSTRING, PCWSTR};

    // A4 paper, in inches (WebView2 print-settings units). Margins are owned
    // here rather than via CSS @page so they're deterministic — print-settings
    // margins are the paper margins Chromium always honors, whereas CSS @page
    // margin handling varies. The print HTML therefore uses @page margin: 0.
    const A4_WIDTH_IN: f64 = 8.27;
    const A4_HEIGHT_IN: f64 = 11.69;
    const MARGIN_V_IN: f64 = 0.787; // ~20mm top/bottom
    const MARGIN_H_IN: f64 = 0.709; // ~18mm left/right

    let controller = platform.controller();
    let core = match unsafe { controller.CoreWebView2() } {
        Ok(c) => c,
        Err(e) => {
            let _ = tx.send(Err(format!("CoreWebView2() failed: {e}")));
            return;
        }
    };
    // ICoreWebView2_7 ships with WebView2 Runtime 88+ (mid-2021); PrintToPdf
    // lives on this revision. A failed cast means an ancient runtime.
    let webview7: ICoreWebView2_7 = match core.cast() {
        Ok(w) => w,
        Err(e) => {
            let _ = tx.send(Err(format!(
                "ICoreWebView2_7 unavailable (WebView2 runtime too old for PrintToPdf): {e}"
            )));
            return;
        }
    };

    // Build print settings: A4, our margins, and ShouldPrintBackgrounds(true)
    // so the code-block / table / blockquote background shading actually
    // renders (it defaults to off). Settings come from the environment, which
    // we reach via the _2 revision. If any of this fails we fall back to None
    // (default Letter, no backgrounds) rather than aborting the export.
    let print_settings = (|| {
        let env = unsafe { core.cast::<ICoreWebView2_2>().ok()?.Environment().ok()? };
        let s = unsafe { env.cast::<ICoreWebView2Environment6>().ok()?.CreatePrintSettings().ok()? };
        unsafe {
            s.SetPageWidth(A4_WIDTH_IN).ok()?;
            s.SetPageHeight(A4_HEIGHT_IN).ok()?;
            s.SetMarginTop(MARGIN_V_IN).ok()?;
            s.SetMarginBottom(MARGIN_V_IN).ok()?;
            s.SetMarginLeft(MARGIN_H_IN).ok()?;
            s.SetMarginRight(MARGIN_H_IN).ok()?;
            s.SetShouldPrintBackgrounds(true).ok()?;
        }
        Some(s)
    })();

    // HSTRING owns the wide buffers PCWSTR points into; both must outlive the
    // (synchronous) PrintToPdf call, so they live inside the nav closure.
    let output_hstring = HSTRING::from(output_path);
    let tx_nav = tx.clone();
    // We register the handler *before* NavigateToString, so the first
    // completion we see is our own navigation. The guard defends against any
    // stray re-fire so we never print twice.
    let printed = std::cell::Cell::new(false);

    let nav_handler = NavigationCompletedEventHandler::create(Box::new(move |_wv, _args| {
        if printed.get() {
            return Ok(());
        }
        printed.set(true);

        let tx_done = tx_nav.clone();
        let pdf_handler = PrintToPdfCompletedHandler::create(Box::new(move |result, success| {
            let outcome = match result {
                Ok(()) if success => Ok(()),
                Ok(()) => Err("PrintToPdf reported failure (success=false)".to_string()),
                Err(e) => Err(format!("PrintToPdf error: {e}")),
            };
            let _ = tx_done.send(outcome);
            Ok(())
        }));

        if let Err(e) = unsafe {
            webview7.PrintToPdf(
                PCWSTR(output_hstring.as_ptr()),
                print_settings.as_ref(),
                &pdf_handler,
            )
        } {
            let _ = tx_nav.send(Err(format!("PrintToPdf invocation failed: {e}")));
        }
        Ok(())
    }));

    let mut token: i64 = 0;
    if let Err(e) = unsafe { core.add_NavigationCompleted(&nav_handler, &mut token) } {
        let _ = tx.send(Err(format!("add_NavigationCompleted failed: {e}")));
        return;
    }

    let html_hstring = HSTRING::from(html);
    if let Err(e) = unsafe { core.NavigateToString(&html_hstring) } {
        let _ = tx.send(Err(format!("NavigateToString failed: {e}")));
    }
}

#[cfg(windows)]
#[tauri::command]
async fn export_pdf_silent(
    app: tauri::AppHandle,
    html: String,
    output_path: String,
) -> Result<(), String> {
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    let label = format!(
        "pdf-export-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );

    // Hidden, off-screen window sized to US Letter at 96 DPI so layout/page
    // breaks match the PDF page box. @page CSS in the print HTML still governs
    // the final paper size and margins.
    let window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App("about:blank".into()))
        .visible(false)
        .title("PDF Export")
        .inner_size(816.0, 1056.0)
        .build()
        .map_err(|e| format!("Failed to create PDF window: {e}"))?;

    let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();

    if let Err(e) = window.with_webview(move |platform| {
        print_to_pdf_via_webview(platform, html, output_path, tx);
    }) {
        let _ = window.destroy();
        return Err(format!("with_webview failed: {e}"));
    }

    // Wait off the UI thread for the COM completion handler to report. 30s is
    // generous headroom over the sub-second render+print a typical document
    // takes; it only trips if the runtime is missing or the webview wedges.
    let result = tauri::async_runtime::spawn_blocking(move || {
        rx.recv_timeout(std::time::Duration::from_secs(30))
            .unwrap_or_else(|_| Err("PDF export timed out after 30s".to_string()))
    })
    .await
    .map_err(|e| format!("Export task join error: {e}"))?;

    let _ = window.destroy();
    result
}

// Non-Windows fallback so the command stays registered and the project still
// compiles off-Windows. WebView2 (and thus silent PrintToPdf) is Windows-only.
#[cfg(not(windows))]
#[tauri::command]
async fn export_pdf_silent(
    _app: tauri::AppHandle,
    _html: String,
    _output_path: String,
) -> Result<(), String> {
    Err("Silent PDF export is only supported on Windows (WebView2).".to_string())
}

// ----- Word (.docx) export (Fix-Z) -----
//
// Walks the markdown AST via pulldown-cmark and emits a real OOXML .docx via
// docx-rs. Inline state (bold/italic/strike/code) is tracked as a stack of
// flags; text runs accumulate into `current_runs` and flush into a styled
// Paragraph at each block boundary. We lean on the built-in Word styles
// (Heading1..6, Normal, ListParagraph, IntenseQuote) so the document inherits
// the user's template fonts/colours rather than hard-coding them.
#[tauri::command]
fn export_docx(path: String, content: String) -> Result<(), String> {
    use docx_rs::*;
    use pulldown_cmark::{Event, HeadingLevel, Options, Parser, Tag, TagEnd};

    let mut docx = Docx::new();

    let options = Options::all();
    let parser = Parser::new_ext(&content, options);

    let mut current_runs: Vec<Run> = Vec::new();
    let mut is_bold = false;
    let mut is_italic = false;
    let mut is_strikethrough = false;
    let mut current_heading_level: Option<u8> = None;
    let mut in_code_block = false;
    let mut code_block_text = String::new();
    let mut list_depth: usize = 0;
    let mut is_ordered = false;
    let mut list_item_number = 1u32;
    let mut in_blockquote = false;

    for event in parser {
        match event {
            Event::Start(Tag::Heading { level, .. }) => {
                current_heading_level = Some(match level {
                    HeadingLevel::H1 => 1,
                    HeadingLevel::H2 => 2,
                    HeadingLevel::H3 => 3,
                    HeadingLevel::H4 => 4,
                    HeadingLevel::H5 => 5,
                    HeadingLevel::H6 => 6,
                });
                current_runs.clear();
            }
            Event::End(TagEnd::Heading(_)) => {
                let level = current_heading_level.take().unwrap_or(1);
                let style = match level {
                    1 => "Heading1",
                    2 => "Heading2",
                    3 => "Heading3",
                    4 => "Heading4",
                    5 => "Heading5",
                    _ => "Heading6",
                };
                let mut para = Paragraph::new().style(style);
                for run in current_runs.drain(..) {
                    para = para.add_run(run);
                }
                docx = docx.add_paragraph(para);
            }

            Event::Start(Tag::Paragraph) => {
                current_runs.clear();
            }
            Event::End(TagEnd::Paragraph) => {
                let style = if in_blockquote { "IntenseQuote" } else { "Normal" };
                let mut para = Paragraph::new().style(style);
                if in_blockquote {
                    para = para.indent(Some(720), None, None, None);
                }
                for run in current_runs.drain(..) {
                    para = para.add_run(run);
                }
                docx = docx.add_paragraph(para);
            }

            Event::Start(Tag::Strong) => is_bold = true,
            Event::End(TagEnd::Strong) => is_bold = false,
            Event::Start(Tag::Emphasis) => is_italic = true,
            Event::End(TagEnd::Emphasis) => is_italic = false,
            Event::Start(Tag::Strikethrough) => is_strikethrough = true,
            Event::End(TagEnd::Strikethrough) => is_strikethrough = false,

            Event::Code(text) => {
                let run = Run::new()
                    .add_text(text.as_ref())
                    .fonts(RunFonts::new().ascii("Consolas"))
                    .size(18); // 9pt in half-points
                current_runs.push(run);
            }

            Event::Start(Tag::CodeBlock(_)) => {
                in_code_block = true;
                code_block_text.clear();
            }
            Event::End(TagEnd::CodeBlock) => {
                in_code_block = false;
                for line in code_block_text.lines() {
                    let run = Run::new()
                        .add_text(line)
                        .fonts(RunFonts::new().ascii("Consolas"))
                        .size(18);
                    let para = Paragraph::new()
                        .style("Normal")
                        .indent(Some(720), None, None, None)
                        .add_run(run);
                    docx = docx.add_paragraph(para);
                }
                code_block_text.clear();
            }

            Event::Start(Tag::BlockQuote(_)) => {
                in_blockquote = true;
            }
            Event::End(TagEnd::BlockQuote(_)) => {
                in_blockquote = false;
            }

            Event::Start(Tag::List(order)) => {
                list_depth += 1;
                is_ordered = order.is_some();
                list_item_number = order.unwrap_or(1) as u32;
            }
            Event::End(TagEnd::List(_)) => {
                if list_depth > 0 {
                    list_depth -= 1;
                }
            }
            Event::Start(Tag::Item) => {
                current_runs.clear();
            }
            Event::End(TagEnd::Item) => {
                let indent = (list_depth as i32) * 360;
                let mut para = Paragraph::new()
                    .style("ListParagraph")
                    .indent(Some(indent), None, None, None);

                if is_ordered {
                    let num_run = Run::new().add_text(format!("{}. ", list_item_number));
                    para = para.add_run(num_run);
                    list_item_number += 1;
                } else {
                    let bullet_run = Run::new().add_text("• ");
                    para = para.add_run(bullet_run);
                }

                for run in current_runs.drain(..) {
                    para = para.add_run(run);
                }
                docx = docx.add_paragraph(para);
            }

            Event::Text(text) => {
                if in_code_block {
                    code_block_text.push_str(&text);
                } else {
                    let mut run = Run::new().add_text(text.as_ref());
                    if is_bold {
                        run = run.bold();
                    }
                    if is_italic {
                        run = run.italic();
                    }
                    if is_strikethrough {
                        run = run.strike();
                    }
                    current_runs.push(run);
                }
            }

            Event::SoftBreak | Event::HardBreak => {
                if !in_code_block {
                    let run = Run::new().add_break(BreakType::TextWrapping);
                    current_runs.push(run);
                }
            }

            Event::Rule => {
                // Horizontal rule — emit an empty paragraph as a visual gap.
                let para = Paragraph::new().style("Normal");
                docx = docx.add_paragraph(para);
            }

            // Images, raw HTML, footnotes, task-list markers: skipped for now.
            _ => {}
        }
    }

    let output_path = std::path::Path::new(&path);
    let file = std::fs::File::create(output_path)
        .map_err(|e| format!("Failed to create file: {e}"))?;
    docx.build()
        .pack(file)
        .map_err(|e| format!("Failed to write DOCX: {e}"))?;

    Ok(())
}

fn build_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let file_menu = Submenu::with_items(
        app,
        "&File",
        true,
        &[
            &MenuItem::with_id(app, "new", "New", true, Some("CmdOrCtrl+N"))?,
            &MenuItem::with_id(app, "open", "Open...", true, Some("CmdOrCtrl+O"))?,
            &MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?,
            &MenuItem::with_id(app, "save_as", "Save As...", true, Some("CmdOrCtrl+Shift+S"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "&Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        "&View",
        true,
        &[
            &MenuItem::with_id(app, "view_write", "Write", true, None::<&str>)?,
            &MenuItem::with_id(app, "view_split", "Split", true, None::<&str>)?,
            &MenuItem::with_id(app, "view_preview", "Preview", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "toggle_sidebar", "Toggle Sidebar", true, None::<&str>)?,
        ],
    )?;

    let export_menu = Submenu::with_items(
        app,
        "E&xport",
        true,
        &[
            &MenuItem::with_id(app, "export_dialog", "Export…", true, Some("CmdOrCtrl+Shift+E"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "export_html_styled", "HTML (Styled)", true, None::<&str>)?,
            &MenuItem::with_id(app, "export_html_clean", "HTML (Clean)", true, None::<&str>)?,
            &MenuItem::with_id(app, "export_docx", "Word Document (.docx)", true, None::<&str>)?,
            &MenuItem::with_id(app, "export_word_html", "Word HTML (.doc)", true, None::<&str>)?,
            &MenuItem::with_id(app, "export_text", "Plain Text", true, None::<&str>)?,
            &MenuItem::with_id(app, "export_pdf", "PDF (Print to PDF)...", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "export_copy_md", "Copy Markdown", true, None::<&str>)?,
        ],
    )?;

    let help_menu = Submenu::with_items(
        app,
        "&Help",
        true,
        &[
            &MenuItem::with_id(app, "show_help", "Help & Keyboard Shortcuts", true, Some("F1"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "show_about", "About GHS Markdown Editor", true, None::<&str>)?,
        ],
    )?;

    Menu::with_items(
        app,
        &[&file_menu, &edit_menu, &view_menu, &export_menu, &help_menu],
    )
}

// Pull a `.md` / `.markdown` path out of an argv slice, stripping any
// surrounding double quotes that Windows file association sometimes
// leaves on the arg. Used both at cold-launch (env::args) and when a
// second instance hands its argv off to the running one.
fn extract_markdown_path(args: &[String]) -> Option<String> {
    args.iter().skip(1).find_map(|a| {
        let clean = a.trim_matches('"');
        let lower = clean.to_lowercase();
        if (lower.ends_with(".md") || lower.ends_with(".markdown"))
            && std::path::Path::new(clean).exists()
        {
            Some(clean.to_string())
        } else {
            None
        }
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = std::env::args().collect();
    let initial_arg = extract_markdown_path(&args);

    tauri::Builder::default()
        // Single-instance must be the first plugin so a second launch is
        // intercepted before any window/state init in the new process.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(path) = extract_markdown_path(&args) {
                let _ = app.emit("open-file-from-arg", path);
            }
            if let Some(window) = app.get_webview_window("main") {
                // Restore the window from the minimized/hidden state Windows
                // file association may leave it in, *then* focus.
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(LaunchArg(Mutex::new(initial_arg)))
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            path_exists,
            open_dialog,
            save_dialog,
            confirm_discard,
            get_app_data_dir,
            take_launch_arg,
            list_snapshots,
            write_snapshot,
            read_snapshot,
            register_file_association,
            check_file_association,
            show_editor_context_menu,
            export_pdf_silent,
            export_docx,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let menu = build_menu(&handle)?;
            // Attach the menu only to the main window. Using app.set_menu
            // would make every later WebviewWindow (e.g. the detached
            // preview window from Fix-J) inherit the menu bar, which is
            // visually wrong for a content-only secondary window.
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.set_menu(menu)?;
            }

            app.on_menu_event(move |app_handle, event| {
                let _ = app_handle.emit("menu-event", event.id().as_ref().to_string());
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
