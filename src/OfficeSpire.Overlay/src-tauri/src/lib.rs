use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Debug, Serialize, Deserialize)]
struct SessionDescriptor {
    protocol_version: u32,
    port: u16,
    token: String,
    process_id: u32,
    created_utc: String,
}

fn session_path() -> Result<PathBuf, String> {
    let app_data = std::env::var_os("APPDATA").ok_or_else(|| {
        "APPDATA is unavailable; OfficeSpire currently supports Windows desktop runtime."
            .to_string()
    })?;
    Ok(PathBuf::from(app_data)
        .join("SlayTheSpire2")
        .join("OfficeSpire")
        .join("session.json"))
}

#[tauri::command]
fn read_officespire_session() -> Result<SessionDescriptor, String> {
    let path = session_path()?;
    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("Unable to read {}: {error}", path.display()))?;
    let session: SessionDescriptor = serde_json::from_str(&contents)
        .map_err(|error| format!("Invalid OfficeSpire session descriptor: {error}"))?;
    if session.port == 0 || session.token.len() < 16 {
        return Err("OfficeSpire session descriptor failed validation.".into());
    }
    Ok(session)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_officespire_session])
        .run(tauri::generate_context!())
        .expect("error while running OfficeSpire Overlay")
}
