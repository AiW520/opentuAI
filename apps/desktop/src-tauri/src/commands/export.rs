use crate::{media_dirs, AppState};
use std::path::{Path, PathBuf};
use tauri::State;
use tauri_plugin_fs::FsExt;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn show_save_dialog(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    default_name: Option<String>,
) -> Result<Option<String>, String> {
    let default_name = sanitize_file_name(default_name.as_deref().unwrap_or("export"))?;
    let media_root = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.media_root.clone()
    };
    let default_dir = media_root.join(get_export_subdir(&default_name));
    std::fs::create_dir_all(&default_dir).map_err(|e| e.to_string())?;
    let default_path = default_dir.join(default_name);

    let file_path = app
        .dialog()
        .file()
        .add_filter("ZIP", &["zip"])
        .add_filter("JSON", &["json"])
        .add_filter("PNG", &["png"])
        .add_filter("All", &["*"])
        .set_file_name(default_path.to_string_lossy().to_string())
        .blocking_save_file();
    if let Some(path) = file_path.as_ref() {
        let path = path
            .clone()
            .into_path()
            .map_err(|e| format!("无法解析授权保存路径: {}", e))?;
        let mut grants = state.path_grants.lock().map_err(|e| e.to_string())?;
        grants.grant_write_file(&path)?;
        app.fs_scope()
            .allow_file(&path)
            .map_err(|e| format!("无法授权二进制写入路径: {}", e))?;
    }

    Ok(file_path.map(|p| p.to_string()))
}

fn sanitize_file_name(file_name: &str) -> Result<String, String> {
    Path::new(file_name)
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .filter(|name| !name.trim().is_empty())
        .ok_or_else(|| "Invalid file name".to_string())
}

fn get_export_subdir(file_name: &str) -> PathBuf {
    match Path::new(file_name)
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .as_deref()
    {
        Some("png" | "jpg" | "jpeg" | "webp" | "gif" | "svg") => {
            PathBuf::from(media_dirs::media_subdir("image"))
        }
        Some("mp4" | "webm" | "mov" | "m4v") => PathBuf::from(media_dirs::media_subdir("video")),
        Some("mp3" | "wav" | "ogg" | "m4a" | "aac" | "flac") => {
            PathBuf::from(media_dirs::media_subdir("audio"))
        }
        Some("ppt" | "pptx") => PathBuf::from(media_dirs::media_subdir("ppt")),
        Some("txt" | "md" | "json") => PathBuf::from(media_dirs::media_subdir("text")),
        Some("zip") => PathBuf::from(media_dirs::media_subdir("archive")),
        _ => PathBuf::from(media_dirs::media_subdir("text")),
    }
}
