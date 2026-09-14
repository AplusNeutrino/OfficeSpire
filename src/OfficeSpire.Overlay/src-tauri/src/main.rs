#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn overlay_ready() -> bool {
    true
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![overlay_ready])
        .run(tauri::generate_context!())
        .expect("error while running OfficeSpire overlay");
}
