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
