use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{Manager, State};

#[derive(Debug, Serialize, Deserialize)]
struct SessionDescriptor {
    protocol_version: u32,
    port: u16,
    token: String,
    process_id: u32,
    created_utc: String,
}

#[derive(Debug, Default)]
struct PrivacyInner {
    enabled: bool,
    hide_overlay: bool,
    hidden_process_id: Option<u32>,
    hidden_windows: Vec<isize>,
    registered: bool,
    error: Option<String>,
}

#[derive(Debug, Default)]
struct PrivacyState(Mutex<PrivacyInner>);

#[derive(Debug, Serialize)]
struct PrivacyStatus {
    enabled: bool,
    hide_overlay: bool,
    game_hidden: bool,
    shortcut: &'static str,
    registered: bool,
    error: Option<String>,
}

fn session_path() -> Result<PathBuf, String> {
    let app_data = std::env::var_os("APPDATA").ok_or_else(|| {
        "APPDATA is unavailable; OfficeSpire currently supports Windows desktop runtime.".to_string()
    })?;
    Ok(PathBuf::from(app_data).join("SlayTheSpire2").join("OfficeSpire").join("session.json"))
}

fn load_session() -> Result<SessionDescriptor, String> {
    let path = session_path()?;
    let contents = fs::read_to_string(&path).map_err(|error| format!("Unable to read {}: {error}", path.display()))?;
    let session: SessionDescriptor = serde_json::from_str(&contents).map_err(|error| format!("Invalid OfficeSpire session descriptor: {error}"))?;
    if session.port == 0 || session.token.len() < 16 || session.process_id == 0 {
        return Err("OfficeSpire session descriptor failed validation.".into());
    }
    Ok(session)
}

#[tauri::command]
fn read_officespire_session() -> Result<SessionDescriptor, String> { load_session() }

fn status(inner: &PrivacyInner) -> PrivacyStatus {
    PrivacyStatus {
        enabled: inner.enabled,
        hide_overlay: inner.hide_overlay,
        game_hidden: !inner.hidden_windows.is_empty(),
        shortcut: "Ctrl+Shift+F12",
        registered: inner.registered,
        error: inner.error.clone(),
    }
}

#[tauri::command]
fn configure_privacy_mode(enabled: bool, hide_overlay: bool, app: tauri::AppHandle, state: State<'_, PrivacyState>) -> Result<PrivacyStatus, String> {
    let mut inner = state.0.lock().map_err(|_| "Privacy state is unavailable.")?;
    #[cfg(windows)]
    if !enabled && !inner.hidden_windows.is_empty() { windows_privacy::restore(&app, &mut inner); }
    #[cfg(not(windows))]
    let _ = app;
    inner.enabled = enabled;
    inner.hide_overlay = hide_overlay;
    Ok(status(&inner))
}

#[tauri::command]
fn privacy_status(state: State<'_, PrivacyState>) -> Result<PrivacyStatus, String> {
    let inner = state.0.lock().map_err(|_| "Privacy state is unavailable.")?;
    Ok(status(&inner))
}

#[cfg(windows)]
mod windows_privacy {
    use super::*;
    use std::{path::Path, ptr};
    use tauri::AppHandle;
    use windows_sys::Win32::{
        Foundation::{CloseHandle, BOOL, HWND, LPARAM},
        System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION},
        UI::{
            Input::KeyboardAndMouse::{
                RegisterHotKey, UnregisterHotKey, MOD_CONTROL, MOD_NOREPEAT, MOD_SHIFT, VK_F12,
            },
            WindowsAndMessaging::{
                EnumWindows, GetMessageW, GetWindowThreadProcessId, IsWindow, IsWindowVisible,
                ShowWindow, MSG, SW_HIDE, SW_RESTORE, WM_HOTKEY,
            },
        },
    };

    const HOTKEY_ID: i32 = 0x4f53;

    unsafe extern "system" fn collect_window(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let data = &mut *(lparam as *mut (u32, Vec<HWND>));
        let mut owner_pid = 0;
        GetWindowThreadProcessId(hwnd, &mut owner_pid);
        if owner_pid == data.0 && IsWindowVisible(hwnd) != 0 { data.1.push(hwnd); }
        1
    }

    fn validate_game_process(process_id: u32) -> Result<(), String> {
        unsafe {
            let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id);
            if process.is_null() { return Err("The authenticated STS2 process is no longer running.".into()); }
            let mut buffer = vec![0u16; 32768];
            let mut length = buffer.len() as u32;
            let ok = QueryFullProcessImageNameW(process, 0, buffer.as_mut_ptr(), &mut length);
            CloseHandle(process);
            if ok == 0 { return Err("Unable to verify the authenticated STS2 executable.".into()); }
            let executable = String::from_utf16_lossy(&buffer[..length as usize]);
            let stem = Path::new(&executable).file_stem().and_then(|value| value.to_str()).unwrap_or_default();
            if !stem.eq_ignore_ascii_case("SlayTheSpire2") {
                return Err("The session PID no longer belongs to SlayTheSpire2.exe.".into());
            }
        }
        Ok(())
    }

    pub fn restore(app: &AppHandle, inner: &mut PrivacyInner) {
        let process_is_still_game = inner.hidden_process_id
            .map(|process_id| validate_game_process(process_id).is_ok())
            .unwrap_or(false);
        for hwnd in inner.hidden_windows.drain(..) {
            unsafe {
                if process_is_still_game && IsWindow(hwnd as HWND) != 0 {
                    let mut pid = 0;
                    GetWindowThreadProcessId(hwnd as HWND, &mut pid);
                    if Some(pid) == inner.hidden_process_id { ShowWindow(hwnd as HWND, SW_RESTORE); }
                }
            }
        }
        inner.hidden_process_id = None;
        if inner.hide_overlay {
            if let Some(window) = app.get_webview_window("main") { let _ = window.show(); let _ = window.set_focus(); }
        }
    }

    fn toggle(app: &AppHandle) {
        let state = app.state::<PrivacyState>();
        let mut inner = match state.0.lock() { Ok(value) => value, Err(_) => return };
        if !inner.enabled { return; }
        if !inner.hidden_windows.is_empty() { restore(app, &mut inner); inner.error = None; return; }
        let session = match load_session().and_then(|session| { validate_game_process(session.process_id)?; Ok(session) }) {
            Ok(value) => value,
            Err(error) => { inner.error = Some(error); return; }
        };
        let mut found = (session.process_id, Vec::<HWND>::new());
        unsafe { EnumWindows(Some(collect_window), &mut found as *mut _ as LPARAM) };
        if found.1.is_empty() { inner.error = Some("No visible top-level STS2 window was found.".into()); return; }
        for hwnd in &found.1 { unsafe { ShowWindow(*hwnd, SW_HIDE) }; }
        inner.hidden_process_id = Some(session.process_id);
        inner.hidden_windows = found.1.into_iter().map(|hwnd| hwnd as isize).collect();
        inner.error = None;
        if inner.hide_overlay { if let Some(window) = app.get_webview_window("main") { let _ = window.hide(); } }
    }

    pub fn start(app: AppHandle) {
        std::thread::spawn(move || unsafe {
            let registered = RegisterHotKey(ptr::null_mut(), HOTKEY_ID, MOD_CONTROL | MOD_SHIFT | MOD_NOREPEAT, VK_F12 as u32) != 0;
            if let Ok(mut inner) = app.state::<PrivacyState>().0.lock() {
                inner.registered = registered;
                if !registered { inner.error = Some("Ctrl+Shift+F12 is already registered by another application.".into()); }
            }
            if !registered { return; }
            let mut message: MSG = std::mem::zeroed();
            while GetMessageW(&mut message, ptr::null_mut(), 0, 0) > 0 {
                if message.message == WM_HOTKEY && message.wParam == HOTKEY_ID as usize { toggle(&app); }
            }
            UnregisterHotKey(ptr::null_mut(), HOTKEY_ID);
        });
    }

    pub fn restore_on_exit(app: &AppHandle) {
        if let Ok(mut inner) = app.state::<PrivacyState>().0.lock() { restore(app, &mut inner); }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(PrivacyState::default())
        .invoke_handler(tauri::generate_handler![read_officespire_session, configure_privacy_mode, privacy_status])
        .setup(|app| {
            #[cfg(windows)]
            windows_privacy::start(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building OfficeSpire Overlay");
    app.run(|handle, event| {
        #[cfg(windows)]
        if matches!(event, tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }) { windows_privacy::restore_on_exit(handle); }
    });
}
