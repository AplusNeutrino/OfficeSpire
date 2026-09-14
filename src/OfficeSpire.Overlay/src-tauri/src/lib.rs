mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            window::configure_window(&app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running OfficeSpire Overlay");
}
