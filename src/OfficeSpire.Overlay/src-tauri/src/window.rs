use tauri::{AppHandle, Manager};

pub fn configure_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_focus();
    }
}
