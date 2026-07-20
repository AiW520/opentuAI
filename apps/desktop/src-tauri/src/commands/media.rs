use crate::media_dirs;
use crate::path_grants::{canonical_existing_file, canonical_write_file};
use crate::AppState;
use base64::{engine::general_purpose, Engine as _};
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::{Manager, State};

#[tauri::command]
pub fn save_file(
    state: State<AppState>,
    file_name: String,
    buffer: Vec<u8>,
    file_type: Option<String>,
) -> Result<String, String> {
    let media_root = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.media_root.clone()
    };
    let media_dir = media_root.join(media_dirs::media_subdir(
        file_type.as_deref().unwrap_or("image"),
    ));
    fs::create_dir_all(&media_dir).map_err(|e| e.to_string())?;

    let file_path = canonical_write_file(&media_dir.join(sanitize_file_name(&file_name)?))?;
    fs::write(&file_path, &buffer).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_file_path(
    state: State<AppState>,
    file_name: String,
    file_type: Option<String>,
) -> Result<Option<String>, String> {
    let media_root = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.media_root.clone()
    };
    let file_path = resolve_media_file_path(&media_root, &file_name, file_type.as_deref())?;

    if file_path.exists() {
        Ok(Some(file_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn delete_file(
    state: State<AppState>,
    file_name: String,
    file_type: Option<String>,
) -> Result<(), String> {
    let media_root = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.media_root.clone()
    };
    let file_path = resolve_media_file_path(&media_root, &file_name, file_type.as_deref())?;

    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_media_dir(state: State<AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    Ok(db.media_root.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_media_root_path(state: State<AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    Ok(db.media_root.to_string_lossy().to_string())
}

#[tauri::command]
pub fn set_media_root_path(state: State<AppState>, path: String) -> Result<String, String> {
    let new_path = PathBuf::from(&path);
    {
        let mut grants = state.path_grants.lock().map_err(|e| e.to_string())?;
        if !grants.allows_directory(&new_path) {
            return Err("请先通过目录选择器选择媒体目录".to_string());
        }
    }
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_media_root(new_path).map_err(|e| e.to_string())?;
    Ok(db.media_root.to_string_lossy().to_string())
}

#[tauri::command]
pub fn reset_media_root_path(state: State<AppState>) -> Result<String, String> {
    let mut db = state.db.lock().map_err(|e| e.to_string())?;
    db.reset_media_root().map_err(|e| e.to_string())?;
    Ok(db.media_root.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn pick_media_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder_path = app.dialog().file().blocking_pick_folder();
    if let Some(path) = folder_path.as_ref() {
        let path = path
            .clone()
            .into_path()
            .map_err(|e| format!("无法解析授权目录: {}", e))?;
        let state = app.state::<AppState>();
        let mut grants = state.path_grants.lock().map_err(|e| e.to_string())?;
        grants.grant_directory(&path)?;
    }

    Ok(folder_path.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn pick_media_files(app: tauri::AppHandle) -> Result<Vec<PickedMediaFile>, String> {
    use tauri_plugin_dialog::DialogExt;

    let files = app
        .dialog()
        .file()
        .add_filter(
            "媒体素材",
            &[
                "png", "jpg", "jpeg", "gif", "webp", "svg", "mp4", "webm", "mov", "m4v", "ogg",
                "mp3", "wav", "m4a", "aac", "flac", "zip",
            ],
        )
        .blocking_pick_files();

    let Some(files) = files else {
        return Ok(Vec::new());
    };

    let mut result = Vec::new();
    for file_path in files {
        let path = file_path
            .into_path()
            .map_err(|e| format!("无法解析本地素材路径: {}", e))?;
        if !path.is_file() {
            continue;
        }
        {
            let state = app.state::<AppState>();
            let mut grants = state.path_grants.lock().map_err(|e| e.to_string())?;
            grants.grant_read_file(&path)?;
        }
        let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
        let file_name = path
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_else(|| "asset".to_string());
        let mime_type = detect_mime_type(&path);
        let file_type = infer_file_type(&mime_type, &path);
        result.push(PickedMediaFile {
            path: path.to_string_lossy().to_string(),
            name: file_name,
            mime_type,
            file_type,
            size: metadata.len(),
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn pick_save_location(
    app: tauri::AppHandle,
    default_name: String,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let file_path = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .blocking_save_file();
    if let Some(path) = file_path.as_ref() {
        let path = path
            .clone()
            .into_path()
            .map_err(|e| format!("无法解析授权保存路径: {}", e))?;
        let state = app.state::<AppState>();
        let mut grants = state.path_grants.lock().map_err(|e| e.to_string())?;
        grants.grant_write_file(&path)?;
    }

    Ok(file_path.map(|p| p.to_string()))
}

#[tauri::command]
pub fn write_file_to_path(
    state: State<'_, AppState>,
    save_path: String,
    buffer: Vec<u8>,
) -> Result<(), String> {
    let path = ensure_write_allowed(&state, Path::new(&save_path))?;
    validate_save_path(&path)?;
    fs::write(&path, buffer).map_err(|e| format!("无法写入文件: {}", e))
}

#[tauri::command]
pub fn write_file_chunk_to_path(
    state: State<'_, AppState>,
    save_path: String,
    buffer: Vec<u8>,
    append: bool,
) -> Result<(), String> {
    let path = ensure_write_allowed(&state, Path::new(&save_path))?;
    validate_save_path(&path)?;

    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .append(append)
        .truncate(!append)
        .open(&path)
        .map_err(|e| format!("failed to open file: {}", e))?;

    file.write_all(&buffer)
        .map_err(|e| format!("failed to write file: {}", e))?;
    file.flush()
        .map_err(|e| format!("failed to flush file: {}", e))
}

#[tauri::command]
pub async fn download_url_to_path(
    state: State<'_, AppState>,
    url: String,
    save_path: String,
) -> Result<(), String> {
    let path = ensure_write_allowed(&state, Path::new(&save_path))?;
    validate_save_path(&path)?;
    if path.exists() {
        return Err("下载目标文件已存在，请重新选择保存位置".to_string());
    }
    let parsed_url = parse_download_url(&url)?;
    let mut response = send_validated_download_request(parsed_url).await?;

    if !response.status().is_success() {
        return Err(format!("下载失败: HTTP {}", response.status()));
    }
    reject_oversized_content_length(&response)?;

    stream_response_to_file(&mut response, &path, None).await?;
    Ok(())
}

#[tauri::command]
pub async fn download_url_to_media_file(
    state: State<'_, AppState>,
    url: String,
    file_type: String,
    fallback_extension: Option<String>,
) -> Result<AssetImportResult, String> {
    let parsed_url = parse_download_url(&url)?;

    let normalized_file_type = normalize_media_type(&file_type);
    let media_root = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.media_root.clone()
    };
    let media_dir = media_root.join(media_dirs::media_subdir(&normalized_file_type));
    fs::create_dir_all(&media_dir).map_err(|e| format!("无法创建媒体目录: {}", e))?;

    let mut response = send_validated_download_request(parsed_url.clone()).await?;

    if !response.status().is_success() {
        return Err(format!("下载失败: HTTP {}", response.status()));
    }
    reject_oversized_content_length(&response)?;

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.split(';').next().unwrap_or(value).trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            fallback_extension
                .as_deref()
                .map(detect_mime_type_from_extension)
                .unwrap_or_else(|| "application/octet-stream".to_string())
        });
    let extension = resolve_download_extension(
        &parsed_url,
        &content_type,
        &normalized_file_type,
        fallback_extension.as_deref(),
    );

    let temp_name = format!(
        ".opentu-download-{}-{}.tmp",
        chrono::Utc::now()
            .timestamp_nanos_opt()
            .unwrap_or_else(|| chrono::Utc::now().timestamp_millis()),
        std::process::id()
    );
    let temp_path = media_dir.join(temp_name);
    let (size, content_hash) =
        stream_response_to_file(&mut response, &temp_path, Some(Sha256::new())).await?;

    if size == 0 {
        let _ = fs::remove_file(&temp_path);
        return Err("下载内容为空".to_string());
    }

    let file_name = format!("content-{}.{}", content_hash, extension);
    let final_path = media_dir.join(sanitize_file_name(&file_name)?);

    if final_path.exists() {
        let _ = fs::remove_file(&temp_path);
    } else if let Err(error) = fs::rename(&temp_path, &final_path) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("保存媒体文件失败: {}", error));
    }

    Ok(AssetImportResult {
        content_hash,
        file_name: file_name.clone(),
        original_name: file_name,
        local_path: final_path.to_string_lossy().to_string(),
        file_type: normalized_file_type,
        mime_type: content_type,
        size,
        created_at: chrono::Utc::now().timestamp_millis(),
    })
}

#[tauri::command]
pub fn copy_media_file_to_path(
    state: State<'_, AppState>,
    source: String,
    save_path: String,
) -> Result<(), String> {
    let target_path = ensure_write_allowed(&state, Path::new(&save_path))?;
    validate_save_path(&target_path)?;

    let media_root = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.media_root.clone()
    };
    let media_root = media_root
        .canonicalize()
        .map_err(|e| format!("媒体目录不可访问: {}", e))?;
    let source_path = resolve_media_source_path(&source, &media_root)?;

    copy_file_streaming(&source_path, &target_path).map_err(|e| format!("复制媒体文件失败: {}", e))
}

#[tauri::command]
pub fn get_default_save_path(
    state: State<AppState>,
    file_name: String,
    file_type: Option<String>,
) -> Result<String, String> {
    let media_root = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.media_root.clone()
    };
    let media_dir = media_root.join(media_dirs::media_subdir(
        file_type.as_deref().unwrap_or("image"),
    ));
    fs::create_dir_all(&media_dir).map_err(|e| e.to_string())?;

    Ok(media_dir
        .join(sanitize_file_name(&file_name)?)
        .to_string_lossy()
        .to_string())
}

#[tauri::command]
pub fn get_cached_media_file(
    state: State<AppState>,
    file_name: String,
    file_type: Option<String>,
) -> Result<String, String> {
    let media_root = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.media_root.clone()
    };
    let file_path = resolve_media_file_path(&media_root, &file_name, file_type.as_deref())?;

    if file_path.exists() {
        let size = fs::metadata(&file_path).map_err(|e| e.to_string())?.len();
        if size > MAX_FULL_RESPONSE_BYTES {
            return Err("媒体文件过大，不能通过 base64 缓存接口读取".to_string());
        }
        let data = fs::read(&file_path).map_err(|e| e.to_string())?;
        Ok(general_purpose::STANDARD.encode(&data))
    } else {
        Err(format!(
            "File does not exist: {}",
            file_path.to_string_lossy()
        ))
    }
}

#[tauri::command]
pub fn read_local_file(state: State<'_, AppState>, base64_path: String) -> Result<String, String> {
    let path = ensure_read_allowed(&state, Path::new(&base64_path))?;
    read_file_as_base64(&path, MAX_BASE64_READ_BYTES)
}

#[tauri::command]
pub fn import_local_asset(
    state: State<AppState>,
    source_path: String,
    file_type: Option<String>,
    original_name: Option<String>,
    mime_type: Option<String>,
) -> Result<AssetImportResult, String> {
    let source = validate_source_file(&source_path)?;
    let source = ensure_read_allowed(&state, source)?;
    let source = source.as_path();
    let metadata = fs::metadata(source).map_err(|e| format!("无法读取源文件: {}", e))?;
    let source_name = source
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .ok_or_else(|| "无法获取源文件名".to_string())?;
    let original_name = sanitize_file_name(original_name.as_deref().unwrap_or(&source_name))?;
    let detected_mime_type = mime_type.unwrap_or_else(|| detect_mime_type(source));
    let inferred_file_type = infer_file_type(&detected_mime_type, source);
    let normalized_file_type = normalize_media_type(
        file_type
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or(inferred_file_type.as_str()),
    );
    if !is_supported_import_media(&normalized_file_type, &detected_mime_type, source) {
        return Err("不支持的媒体文件类型".to_string());
    }

    let media_root = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.media_root.clone()
    };
    let media_dir = media_root.join(media_dirs::media_subdir(&normalized_file_type));
    fs::create_dir_all(&media_dir).map_err(|e| e.to_string())?;

    let extension = resolve_extension(
        source,
        &original_name,
        &detected_mime_type,
        &normalized_file_type,
    );
    let temp_name = format!(
        ".opentu-import-{}-{}.tmp",
        chrono::Utc::now()
            .timestamp_nanos_opt()
            .unwrap_or_else(|| chrono::Utc::now().timestamp_millis()),
        std::process::id()
    );
    let temp_path = media_dir.join(temp_name);
    let content_hash = match copy_and_hash(source, &temp_path) {
        Ok(hash) => hash,
        Err(error) => {
            let _ = fs::remove_file(&temp_path);
            return Err(error);
        }
    };
    let file_name = format!("content-{}.{}", content_hash, extension);
    let final_path = media_dir.join(sanitize_file_name(&file_name)?);

    if final_path.exists() {
        let _ = fs::remove_file(&temp_path);
    } else if let Err(error) = fs::rename(&temp_path, &final_path) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("保存素材文件失败: {}", error));
    }

    Ok(AssetImportResult {
        content_hash,
        file_name,
        original_name,
        local_path: final_path.to_string_lossy().to_string(),
        file_type: normalized_file_type,
        mime_type: detected_mime_type,
        size: metadata.len(),
        created_at: chrono::Utc::now().timestamp_millis(),
    })
}

pub fn handle_opentu_asset_protocol(
    app_handle: &tauri::AppHandle,
    request: tauri::http::Request<Vec<u8>>,
) -> tauri::http::Response<Cow<'static, [u8]>> {
    #[cfg(debug_assertions)]
    eprintln!("[opentu-asset] request: {}", request.uri());
    match serve_opentu_asset(app_handle, request) {
        Ok(response) => response,
        Err((status, message)) => {
            #[cfg(debug_assertions)]
            eprintln!("[opentu-asset] error {}: {}", status, message);
            text_response(status, &message)
        }
    }
}

fn sanitize_file_name(file_name: &str) -> Result<String, String> {
    let normalized = file_name.replace('\\', "/");
    let raw_name = normalized
        .rsplit('/')
        .next()
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .ok_or_else(|| "Invalid file name".to_string())?;

    let sanitized: String = raw_name
        .chars()
        .map(|ch| {
            if ch.is_control() || matches!(ch, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')
            {
                '_'
            } else {
                ch
            }
        })
        .collect();
    let sanitized = sanitized.trim_matches([' ', '.']).to_string();
    if sanitized.is_empty() {
        return Err("Invalid file name".to_string());
    }

    let stem = Path::new(&sanitized)
        .file_stem()
        .map(|value| value.to_string_lossy().to_ascii_uppercase())
        .unwrap_or_else(|| sanitized.to_ascii_uppercase());
    if is_windows_reserved_file_stem(&stem) {
        return Ok(format!("_{}", sanitized));
    }

    Ok(sanitized)
}

fn is_windows_reserved_file_stem(stem: &str) -> bool {
    matches!(stem, "CON" | "PRN" | "AUX" | "NUL")
        || (stem.len() == 4
            && (stem.starts_with("COM") || stem.starts_with("LPT"))
            && stem.as_bytes()[3].is_ascii_digit()
            && stem.as_bytes()[3] != b'0')
}

fn validate_source_file(source_path: &str) -> Result<&Path, String> {
    let source_path = Path::new(source_path);
    if !source_path.exists() {
        return Err("源文件不存在".to_string());
    }
    if !source_path.is_file() {
        return Err("源路径不是文件".to_string());
    }
    Ok(source_path)
}

fn validate_save_path(path: &Path) -> Result<(), String> {
    if path.as_os_str().is_empty() {
        return Err("保存路径不能为空".to_string());
    }
    if path.exists() && path.is_dir() {
        return Err("保存路径不能是文件夹".to_string());
    }
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| format!("无法创建保存目录: {}", e))?;
        }
    }
    Ok(())
}

fn canonical_media_root(state: &State<'_, AppState>) -> Result<PathBuf, String> {
    let media_root = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.media_root.clone()
    };
    media_root
        .canonicalize()
        .map_err(|e| format!("媒体目录不可访问: {}", e))
}

fn ensure_write_allowed(state: &State<'_, AppState>, path: &Path) -> Result<PathBuf, String> {
    let media_root = canonical_media_root(state)?;
    let canonical_path = canonical_write_file(path)?;
    let mut grants = state.path_grants.lock().map_err(|e| e.to_string())?;
    if grants.allows_write_file(&canonical_path, &media_root) {
        return Ok(canonical_path);
    }
    Err("保存路径未经过用户授权".to_string())
}

fn ensure_read_allowed(state: &State<'_, AppState>, path: &Path) -> Result<PathBuf, String> {
    let media_root = canonical_media_root(state)?;
    let canonical_path = canonical_existing_file(path)?;
    let mut grants = state.path_grants.lock().map_err(|e| e.to_string())?;
    if grants.allows_read_file(&canonical_path, &media_root) {
        return Ok(canonical_path);
    }
    Err("源文件未经过用户授权".to_string())
}

fn copy_file_streaming(source: &Path, target: &Path) -> Result<(), String> {
    let canonical_source = source
        .canonicalize()
        .map_err(|e| format!("源媒体文件不可访问: {}", e))?;
    if let Ok(canonical_target) = target.canonicalize() {
        if canonical_source == canonical_target {
            return Ok(());
        }
    }

    let mut source_file =
        File::open(&canonical_source).map_err(|e| format!("无法打开源文件: {}", e))?;
    let mut target_file = File::create(target).map_err(|e| format!("无法创建目标文件: {}", e))?;
    let mut buffer = vec![0_u8; COPY_BUFFER_BYTES];

    loop {
        let bytes_read = source_file
            .read(&mut buffer)
            .map_err(|e| format!("读取源文件失败: {}", e))?;
        if bytes_read == 0 {
            break;
        }
        target_file
            .write_all(&buffer[..bytes_read])
            .map_err(|e| format!("写入目标文件失败: {}", e))?;
    }

    target_file
        .flush()
        .map_err(|e| format!("刷新目标文件失败: {}", e))
}

fn resolve_media_source_path(source: &str, media_root: &Path) -> Result<PathBuf, String> {
    if source.trim().is_empty() {
        return Err("源媒体路径不能为空".to_string());
    }

    if source.starts_with("http://opentu-asset.localhost")
        || source.starts_with("https://opentu-asset.localhost")
        || source.starts_with("opentu-asset://")
    {
        let uri = source
            .parse::<tauri::http::Uri>()
            .map_err(|e| format!("源媒体 URL 无效: {}", e))?;
        return resolve_asset_request_path(&uri, media_root).map_err(|(_, message)| message);
    }

    if let Some(virtual_path) = virtual_media_path_from_source(source) {
        let file_name = file_name_from_media_url(&virtual_path)?;
        let file_type = infer_file_type_from_media_url(&virtual_path);
        let path = resolve_media_file_path(media_root, &file_name, Some(&file_type))?;
        return ensure_media_source_allowed(path, media_root);
    }

    ensure_media_source_allowed(PathBuf::from(source), media_root)
}

fn virtual_media_path_from_source(source: &str) -> Option<String> {
    let source = source.trim();
    if is_virtual_media_path(source) {
        return Some(source.to_string());
    }

    let parsed = reqwest::Url::parse(source).ok()?;
    let path = parsed.path();
    if is_virtual_media_path(path) {
        return Some(path.to_string());
    }

    None
}

fn is_virtual_media_path(path: &str) -> bool {
    path.starts_with("/__aitu_cache__/")
        || path.starts_with("/__aitu_generated__/")
        || path.starts_with("/asset-library/")
}

fn ensure_media_source_allowed(path: PathBuf, media_root: &Path) -> Result<PathBuf, String> {
    let path = path
        .canonicalize()
        .map_err(|e| format!("源媒体文件不可访问: {}", e))?;

    if !path.starts_with(media_root) || !path.is_file() {
        return Err("不允许访问该媒体文件".to_string());
    }

    Ok(path)
}

fn file_name_from_media_url(url: &str) -> Result<String, String> {
    let clean = url
        .split('?')
        .next()
        .unwrap_or(url)
        .split('#')
        .next()
        .unwrap_or(url);
    clean
        .rsplit('/')
        .next()
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.to_string())
        .ok_or_else(|| "无法识别媒体文件名".to_string())
}

fn infer_file_type_from_media_url(url: &str) -> String {
    let normalized = url.to_ascii_lowercase();
    if normalized.contains("/video/") {
        return "video".to_string();
    }
    if normalized.contains("/audio/") || normalized.starts_with("/__aitu_generated__/audio/") {
        return "audio".to_string();
    }
    if normalized.ends_with(".zip") {
        return "archive".to_string();
    }
    "image".to_string()
}

fn copy_and_hash(source: &Path, target: &Path) -> Result<String, String> {
    let mut source_file = File::open(source).map_err(|e| format!("无法打开源文件: {}", e))?;
    let mut target_file = File::create(target).map_err(|e| format!("无法创建目标文件: {}", e))?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0_u8; COPY_BUFFER_BYTES];

    loop {
        let bytes_read = source_file
            .read(&mut buffer)
            .map_err(|e| format!("读取源文件失败: {}", e))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
        target_file
            .write_all(&buffer[..bytes_read])
            .map_err(|e| format!("写入目标文件失败: {}", e))?;
    }

    target_file
        .flush()
        .map_err(|e| format!("刷新目标文件失败: {}", e))?;
    Ok(bytes_to_hex(&hasher.finalize()))
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push_str(&format!("{:02x}", byte));
    }
    output
}

fn parse_download_url(value: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(value).map_err(|e| format!("无效下载地址: {}", e))?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err("仅支持下载 HTTP/HTTPS 资源".to_string());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("下载地址不能包含用户名或密码".to_string());
    }
    if url.host_str().is_none() {
        return Err("下载地址缺少主机名".to_string());
    }
    Ok(url)
}

async fn resolve_public_download_addrs(url: &reqwest::Url) -> Result<Vec<SocketAddr>, String> {
    let host = url
        .host_str()
        .ok_or_else(|| "下载地址缺少主机名".to_string())?
        .to_string();
    if matches!(
        host.trim_end_matches('.').to_ascii_lowercase().as_str(),
        "localhost" | "localhost.localdomain"
    ) {
        return Err("禁止访问本机下载目标".to_string());
    }
    let port = url
        .port_or_known_default()
        .ok_or_else(|| "下载地址端口无效".to_string())?;
    let lookup_host = host.clone();
    let addrs = tauri::async_runtime::spawn_blocking(move || {
        (lookup_host.as_str(), port)
            .to_socket_addrs()
            .map(|values| values.collect::<Vec<_>>())
    })
    .await
    .map_err(|e| format!("解析下载地址失败: {}", e))?
    .map_err(|e| format!("解析下载地址失败: {}", e))?;

    if addrs.is_empty() {
        return Err("下载地址没有可用的网络目标".to_string());
    }
    if let Some(denied) = addrs.iter().find(|addr| !is_public_download_ip(addr.ip())) {
        return Err(format!("禁止访问非公网下载目标: {}", denied.ip()));
    }
    Ok(addrs)
}

fn is_public_download_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => is_public_ipv4(ip),
        IpAddr::V6(ip) => is_public_ipv6(ip),
    }
}

fn is_public_ipv4(ip: Ipv4Addr) -> bool {
    let [a, b, c, _] = ip.octets();
    !(a == 0
        || a == 10
        || a == 127
        || (a == 100 && (64..=127).contains(&b))
        || (a == 169 && b == 254)
        || (a == 172 && (16..=31).contains(&b))
        || (a == 192 && b == 0 && c == 0)
        || (a == 192 && b == 0 && c == 2)
        || (a == 192 && b == 88 && c == 99)
        || (a == 192 && b == 168)
        || (a == 198 && (b == 18 || b == 19))
        || (a == 198 && b == 51 && c == 100)
        || (a == 203 && b == 0 && c == 113)
        || a >= 224)
}

fn is_public_ipv6(ip: Ipv6Addr) -> bool {
    if let Some(ipv4) = ip.to_ipv4() {
        return is_public_ipv4(ipv4);
    }
    let segments = ip.segments();
    !(ip.is_unspecified()
        || ip.is_loopback()
        || ip.is_multicast()
        || (segments[0] & 0xfe00) == 0xfc00
        || (segments[0] & 0xffc0) == 0xfe80
        || (segments[0] & 0xffc0) == 0xfec0
        || (segments[0] == 0x0064 && segments[1] == 0xff9b)
        || (segments[0] == 0x2001 && segments[1] <= 0x01ff)
        || (segments[0] == 0x2001 && segments[1] == 0x0db8)
        || segments[0] == 0x2002
        || (segments[0] == 0x0100 && segments[1..].iter().all(|value| *value == 0))
        || (segments[0] & 0xfffe) == 0x3ffe)
}

fn build_download_client(host: &str, addrs: &[SocketAddr]) -> Result<reqwest::Client, String> {
    build_download_client_with_timeouts(
        host,
        addrs,
        DOWNLOAD_CONNECT_TIMEOUT,
        DOWNLOAD_REQUEST_TIMEOUT,
    )
}

fn build_download_client_with_timeouts(
    host: &str,
    addrs: &[SocketAddr],
    connect_timeout: Duration,
    request_timeout: Duration,
) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .no_proxy()
        .connect_timeout(connect_timeout)
        .timeout(request_timeout)
        .resolve_to_addrs(host, addrs)
        .build()
        .map_err(|e| format!("无法初始化下载器: {}", e))
}

async fn send_validated_download_request(
    mut url: reqwest::Url,
) -> Result<reqwest::Response, String> {
    for redirect_count in 0..=MAX_DOWNLOAD_REDIRECTS {
        let addrs = resolve_public_download_addrs(&url).await?;
        let host = url
            .host_str()
            .ok_or_else(|| "下载地址缺少主机名".to_string())?;
        let response = build_download_client(host, &addrs)?
            .get(url.clone())
            .header(reqwest::header::USER_AGENT, DOWNLOAD_USER_AGENT)
            .send()
            .await
            .map_err(|e| format!("下载失败: {}", e))?;

        if !response.status().is_redirection() {
            return Ok(response);
        }
        if redirect_count == MAX_DOWNLOAD_REDIRECTS {
            return Err(format!("下载重定向超过 {} 次", MAX_DOWNLOAD_REDIRECTS));
        }
        url = redirect_download_url(&response)?;
    }
    Err("下载重定向处理失败".to_string())
}

fn redirect_download_url(response: &reqwest::Response) -> Result<reqwest::Url, String> {
    let location = response
        .headers()
        .get(reqwest::header::LOCATION)
        .ok_or_else(|| "下载重定向缺少 Location".to_string())?
        .to_str()
        .map_err(|_| "下载重定向 Location 无效".to_string())?;
    resolve_redirect_url(response.url(), location)
}

fn resolve_redirect_url(base: &reqwest::Url, location: &str) -> Result<reqwest::Url, String> {
    let url = base
        .join(location)
        .map_err(|e| format!("下载重定向地址无效: {}", e))?;
    parse_download_url(url.as_str())
}

fn reject_oversized_content_length(response: &reqwest::Response) -> Result<(), String> {
    if response
        .content_length()
        .is_some_and(|length| length > MAX_DOWNLOAD_BYTES)
    {
        return Err(format!(
            "下载内容超过 {} MB 限制",
            MAX_DOWNLOAD_BYTES / 1024 / 1024
        ));
    }
    Ok(())
}

async fn stream_response_to_file(
    response: &mut reqwest::Response,
    path: &Path,
    mut hasher: Option<Sha256>,
) -> Result<(u64, String), String> {
    let mut file = File::create(path).map_err(|e| format!("无法创建下载文件: {}", e))?;
    let mut cleanup = PartialFileGuard::new(path.to_path_buf());
    let mut size = 0_u64;

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|e| format!("读取下载内容失败: {}", e))?
    {
        size = checked_download_size(size, chunk.len())?;
        if let Some(hasher) = hasher.as_mut() {
            hasher.update(&chunk);
        }
        file.write_all(&chunk)
            .map_err(|e| format!("写入下载内容失败: {}", e))?;
    }
    file.flush()
        .map_err(|e| format!("保存下载文件失败: {}", e))?;
    cleanup.keep();

    let content_hash = hasher
        .map(|hasher| bytes_to_hex(&hasher.finalize()))
        .unwrap_or_default();
    Ok((size, content_hash))
}

fn checked_download_size(current: u64, chunk_bytes: usize) -> Result<u64, String> {
    let next = current
        .checked_add(chunk_bytes as u64)
        .ok_or_else(|| "下载内容大小溢出".to_string())?;
    if next > MAX_DOWNLOAD_BYTES {
        return Err(format!(
            "下载内容超过 {} MB 限制",
            MAX_DOWNLOAD_BYTES / 1024 / 1024
        ));
    }
    Ok(next)
}

fn read_file_as_base64(path: &Path, max_bytes: u64) -> Result<String, String> {
    let metadata = fs::metadata(path).map_err(|e| format!("读取文件信息失败: {}", e))?;
    if metadata.len() > max_bytes {
        return Err(format!("文件超过 {} MB 读取限制", max_bytes / 1024 / 1024));
    }

    let file = File::open(path).map_err(|e| format!("读取文件失败: {}", e))?;
    let mut reader = file.take(max_bytes);
    let mut data = Vec::with_capacity(metadata.len() as usize);
    reader
        .read_to_end(&mut data)
        .map_err(|e| format!("读取文件失败: {}", e))?;
    if data.len() as u64 != metadata.len() {
        return Err("读取文件时大小发生变化，请重试".to_string());
    }
    Ok(general_purpose::STANDARD.encode(data))
}

struct PartialFileGuard {
    path: PathBuf,
    keep: bool,
}

impl PartialFileGuard {
    fn new(path: PathBuf) -> Self {
        Self { path, keep: false }
    }

    fn keep(&mut self) {
        self.keep = true;
    }
}

impl Drop for PartialFileGuard {
    fn drop(&mut self) {
        if !self.keep {
            let _ = fs::remove_file(&self.path);
        }
    }
}

fn resolve_extension(
    source: &Path,
    original_name: &str,
    mime_type: &str,
    file_type: &str,
) -> String {
    Path::new(original_name)
        .extension()
        .or_else(|| source.extension())
        .map(|value| {
            value
                .to_string_lossy()
                .trim_start_matches('.')
                .to_ascii_lowercase()
        })
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| extension_from_mime(mime_type, file_type).to_string())
}

fn extension_from_mime(mime_type: &str, file_type: &str) -> &'static str {
    match mime_type.to_ascii_lowercase().as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "image/svg+xml" => "svg",
        "video/mp4" => "mp4",
        "video/webm" => "webm",
        "video/quicktime" => "mov",
        "video/x-m4v" => "m4v",
        "audio/mpeg" => "mp3",
        "audio/wav" => "wav",
        "audio/ogg" => "ogg",
        "audio/mp4" => "m4a",
        "audio/aac" => "aac",
        "audio/flac" => "flac",
        "application/zip" => "zip",
        _ if file_type == "video" => "mp4",
        _ if file_type == "audio" => "mp3",
        _ => "png",
    }
}

fn resolve_download_extension(
    url: &reqwest::Url,
    mime_type: &str,
    file_type: &str,
    fallback_extension: Option<&str>,
) -> String {
    extension_from_url_path(url.path())
        .or_else(|| fallback_extension.and_then(sanitize_extension))
        .unwrap_or_else(|| extension_from_mime(mime_type, file_type).to_string())
}

fn extension_from_url_path(path: &str) -> Option<String> {
    Path::new(path)
        .extension()
        .and_then(|value| sanitize_extension(&value.to_string_lossy()))
}

fn sanitize_extension(extension: &str) -> Option<String> {
    let extension = extension
        .trim()
        .trim_start_matches('.')
        .to_ascii_lowercase();
    if extension.is_empty()
        || extension.len() > 12
        || !extension.bytes().all(|byte| byte.is_ascii_alphanumeric())
    {
        return None;
    }
    Some(extension)
}

fn detect_mime_type_from_extension(extension: &str) -> String {
    let extension = sanitize_extension(extension).unwrap_or_default();
    match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "mov" => "video/quicktime",
        "m4v" => "video/x-m4v",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        "m4a" => "audio/mp4",
        "aac" => "audio/aac",
        "flac" => "audio/flac",
        "zip" => "application/zip",
        _ => "application/octet-stream",
    }
    .to_string()
}

fn detect_mime_type(path: &Path) -> String {
    let extension = path
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();

    match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "mov" => "video/quicktime",
        "m4v" => "video/x-m4v",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        "m4a" => "audio/mp4",
        "aac" => "audio/aac",
        "flac" => "audio/flac",
        "zip" => "application/zip",
        _ => "application/octet-stream",
    }
    .to_string()
}

fn infer_file_type(mime_type: &str, path: &Path) -> String {
    if mime_type.starts_with("video/") {
        return "video".to_string();
    }
    if mime_type.starts_with("audio/") {
        return "audio".to_string();
    }
    if mime_type == "application/zip" {
        return "archive".to_string();
    }

    let extension = path
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    if matches!(extension.as_str(), "mp4" | "webm" | "mov" | "m4v") {
        return "video".to_string();
    }
    if matches!(
        extension.as_str(),
        "mp3" | "wav" | "ogg" | "m4a" | "aac" | "flac"
    ) {
        return "audio".to_string();
    }
    "image".to_string()
}

fn is_supported_import_media(file_type: &str, mime_type: &str, path: &Path) -> bool {
    let extension = path
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    match file_type {
        "image" => {
            mime_type.starts_with("image/")
                && matches!(
                    extension.as_str(),
                    "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg"
                )
        }
        "video" => {
            mime_type.starts_with("video/")
                && matches!(extension.as_str(), "mp4" | "webm" | "mov" | "m4v")
        }
        "audio" => {
            mime_type.starts_with("audio/")
                && matches!(
                    extension.as_str(),
                    "mp3" | "wav" | "ogg" | "m4a" | "aac" | "flac"
                )
        }
        "archive" => mime_type == "application/zip" && extension == "zip",
        _ => false,
    }
}

fn normalize_media_type(file_type: &str) -> String {
    match file_type.to_ascii_lowercase().as_str() {
        "video" => "video",
        "audio" => "audio",
        "ppt" | "presentation" => "ppt",
        "text" | "markdown" | "json" => "text",
        "archive" | "zip" => "archive",
        _ => "image",
    }
    .to_string()
}

fn resolve_media_file_path(
    media_root: &Path,
    file_name: &str,
    file_type: Option<&str>,
) -> Result<PathBuf, String> {
    let safe_file_name = sanitize_file_name(file_name)?;
    Ok(media_dirs::resolve_media_file_path(
        media_root,
        &safe_file_name,
        file_type,
    ))
}

fn serve_opentu_asset(
    app_handle: &tauri::AppHandle,
    request: tauri::http::Request<Vec<u8>>,
) -> Result<tauri::http::Response<Cow<'static, [u8]>>, (tauri::http::StatusCode, String)> {
    if request.method() == tauri::http::Method::OPTIONS {
        return asset_response_builder()
            .status(tauri::http::StatusCode::NO_CONTENT)
            .body(Vec::new().into())
            .map_err(|e| {
                (
                    tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
                    e.to_string(),
                )
            });
    }

    if request.method() != tauri::http::Method::GET && request.method() != tauri::http::Method::HEAD
    {
        return Err((
            tauri::http::StatusCode::METHOD_NOT_ALLOWED,
            "Unsupported asset request method".to_string(),
        ));
    }

    let media_root = {
        let state = app_handle.state::<AppState>();
        let db = state.db.lock().map_err(|e| {
            (
                tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
                e.to_string(),
            )
        })?;
        db.media_root.clone()
    };
    serve_opentu_asset_from_root(&media_root, request)
}

fn serve_opentu_asset_from_root(
    media_root: &Path,
    request: tauri::http::Request<Vec<u8>>,
) -> Result<tauri::http::Response<Cow<'static, [u8]>>, (tauri::http::StatusCode, String)> {
    let media_root = media_root.canonicalize().map_err(|e| {
        (
            tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("媒体目录不可访问: {}", e),
        )
    })?;
    let requested_path = resolve_asset_request_path(request.uri(), &media_root)?;

    let mut file = File::open(&requested_path).map_err(|e| {
        (
            tauri::http::StatusCode::NOT_FOUND,
            format!("素材文件不可读取: {}", e),
        )
    })?;
    let file_size = file
        .metadata()
        .map_err(|e| {
            (
                tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
                e.to_string(),
            )
        })?
        .len();
    let mime_type = detect_mime_type(&requested_path);

    if request.method() == tauri::http::Method::HEAD {
        return asset_response_builder()
            .status(tauri::http::StatusCode::OK)
            .header(tauri::http::header::CONTENT_TYPE, mime_type)
            .header(tauri::http::header::ACCEPT_RANGES, "bytes")
            .header(tauri::http::header::CONTENT_LENGTH, file_size.to_string())
            .body(Vec::new().into())
            .map_err(|e| {
                (
                    tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
                    e.to_string(),
                )
            });
    }

    if let Some(range_header) = request
        .headers()
        .get(tauri::http::header::RANGE)
        .and_then(|value| value.to_str().ok())
    {
        let (start, end) = parse_single_range(range_header, file_size)?;
        let len = end - start + 1;
        let mut buffer = vec![0_u8; len as usize];
        file.seek(SeekFrom::Start(start)).map_err(|e| {
            (
                tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
                e.to_string(),
            )
        })?;
        file.read_exact(&mut buffer).map_err(|e| {
            (
                tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
                e.to_string(),
            )
        })?;

        return asset_response_builder()
            .status(tauri::http::StatusCode::PARTIAL_CONTENT)
            .header(tauri::http::header::CONTENT_TYPE, mime_type)
            .header(tauri::http::header::ACCEPT_RANGES, "bytes")
            .header(
                tauri::http::header::CONTENT_RANGE,
                format!("bytes {}-{}/{}", start, end, file_size),
            )
            .header(tauri::http::header::CONTENT_LENGTH, len.to_string())
            .body(buffer.into())
            .map_err(|e| {
                (
                    tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
                    e.to_string(),
                )
            });
    }

    if file_size > MAX_FULL_RESPONSE_BYTES {
        return Err((
            tauri::http::StatusCode::PAYLOAD_TOO_LARGE,
            "素材文件过大，请使用范围请求读取".to_string(),
        ));
    }

    let mut buffer = Vec::with_capacity(file_size as usize);
    file.read_to_end(&mut buffer).map_err(|e| {
        (
            tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
            e.to_string(),
        )
    })?;

    asset_response_builder()
        .status(tauri::http::StatusCode::OK)
        .header(tauri::http::header::CONTENT_TYPE, mime_type)
        .header(tauri::http::header::ACCEPT_RANGES, "bytes")
        .header(tauri::http::header::CONTENT_LENGTH, file_size.to_string())
        .body(buffer.into())
        .map_err(|e| {
            (
                tauri::http::StatusCode::INTERNAL_SERVER_ERROR,
                e.to_string(),
            )
        })
}

fn resolve_asset_request_path(
    uri: &tauri::http::Uri,
    media_root: &Path,
) -> Result<PathBuf, (tauri::http::StatusCode, String)> {
    let candidates = decode_asset_request_path_candidates(uri)?;
    let mut not_found_message = "素材文件不存在".to_string();
    let mut saw_forbidden_path = false;

    for candidate in candidates {
        let requested_path = PathBuf::from(candidate);
        let requested_path = match requested_path.canonicalize() {
            Ok(path) => path,
            Err(error) => {
                not_found_message = format!("素材文件不存在: {}", error);
                continue;
            }
        };

        if !requested_path.starts_with(media_root) || !requested_path.is_file() {
            saw_forbidden_path = true;
            continue;
        }

        return Ok(requested_path);
    }

    if saw_forbidden_path {
        return Err((
            tauri::http::StatusCode::FORBIDDEN,
            "不允许访问该素材路径".to_string(),
        ));
    }

    Err((tauri::http::StatusCode::NOT_FOUND, not_found_message))
}

fn decode_asset_request_path_candidates(
    uri: &tauri::http::Uri,
) -> Result<Vec<String>, (tauri::http::StatusCode, String)> {
    let path = uri.path();
    let encoded_path = path.trim_start_matches('/');
    if encoded_path.is_empty() {
        return Err((
            tauri::http::StatusCode::BAD_REQUEST,
            "素材路径为空".to_string(),
        ));
    }

    let mut encoded_candidates = vec![encoded_path.to_string()];
    if let Some((first_segment, rest)) = encoded_path.split_once('/') {
        if is_asset_protocol_host(first_segment) && !rest.is_empty() {
            encoded_candidates.push(rest.to_string());
        }
    }

    if let Some(authority) = uri.authority() {
        let authority = authority.as_str();
        if !is_asset_protocol_host(authority) && !authority.is_empty() {
            encoded_candidates.push(format!("{authority}{path}"));
        }
    }

    let mut decoded_candidates = Vec::new();
    for encoded_candidate in encoded_candidates {
        let decoded = percent_decode(&encoded_candidate).map_err(|e| {
            (
                tauri::http::StatusCode::BAD_REQUEST,
                format!("素材路径无效: {}", e),
            )
        })?;
        let decoded = normalize_decoded_asset_path(decoded);
        if !decoded.is_empty() && !decoded_candidates.iter().any(|item| item == &decoded) {
            decoded_candidates.push(decoded);
        }
    }

    Ok(decoded_candidates)
}

fn is_asset_protocol_host(value: &str) -> bool {
    let host = value
        .rsplit('@')
        .next()
        .unwrap_or(value)
        .split(':')
        .next()
        .unwrap_or(value)
        .to_ascii_lowercase();

    matches!(host.as_str(), "localhost" | "opentu-asset.localhost")
}

fn normalize_decoded_asset_path(value: String) -> String {
    let bytes = value.as_bytes();
    if bytes.len() >= 3
        && matches!(bytes[0], b'/' | b'\\')
        && bytes[1].is_ascii_alphabetic()
        && bytes[2] == b':'
    {
        value[1..].to_string()
    } else {
        value
    }
}

fn percent_decode(value: &str) -> Result<String, String> {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            if index + 2 >= bytes.len() {
                return Err("不完整的百分号编码".to_string());
            }
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3])
                .map_err(|_| "百分号编码不是 UTF-8".to_string())?;
            let byte =
                u8::from_str_radix(hex, 16).map_err(|_| "百分号编码不是十六进制".to_string())?;
            decoded.push(byte);
            index += 3;
        } else {
            decoded.push(bytes[index]);
            index += 1;
        }
    }

    String::from_utf8(decoded).map_err(|_| "路径不是有效 UTF-8".to_string())
}

fn parse_single_range(
    range_header: &str,
    file_size: u64,
) -> Result<(u64, u64), (tauri::http::StatusCode, String)> {
    if file_size == 0 {
        return Err((
            tauri::http::StatusCode::RANGE_NOT_SATISFIABLE,
            "空文件不支持范围读取".to_string(),
        ));
    }
    let range = range_header.strip_prefix("bytes=").ok_or_else(|| {
        (
            tauri::http::StatusCode::RANGE_NOT_SATISFIABLE,
            "Range 头无效".to_string(),
        )
    })?;
    let (start_text, end_text) = range.split_once('-').ok_or_else(|| {
        (
            tauri::http::StatusCode::RANGE_NOT_SATISFIABLE,
            "Range 头无效".to_string(),
        )
    })?;

    let (start, mut end) = if start_text.is_empty() {
        let suffix = end_text.parse::<u64>().map_err(|_| {
            (
                tauri::http::StatusCode::RANGE_NOT_SATISFIABLE,
                "Range 后缀无效".to_string(),
            )
        })?;
        let suffix = suffix.min(file_size);
        (file_size - suffix, file_size - 1)
    } else {
        let start = start_text.parse::<u64>().map_err(|_| {
            (
                tauri::http::StatusCode::RANGE_NOT_SATISFIABLE,
                "Range 起点无效".to_string(),
            )
        })?;
        let end = if end_text.is_empty() {
            start.saturating_add(MAX_RANGE_BYTES - 1).min(file_size - 1)
        } else {
            end_text.parse::<u64>().map_err(|_| {
                (
                    tauri::http::StatusCode::RANGE_NOT_SATISFIABLE,
                    "Range 终点无效".to_string(),
                )
            })?
        };
        (start, end)
    };

    if start >= file_size {
        return Err((
            tauri::http::StatusCode::RANGE_NOT_SATISFIABLE,
            "Range 超出文件大小".to_string(),
        ));
    }
    end = end.min(file_size - 1);
    end = end.min(start.saturating_add(MAX_RANGE_BYTES - 1));
    if end < start {
        return Err((
            tauri::http::StatusCode::RANGE_NOT_SATISFIABLE,
            "Range 区间无效".to_string(),
        ));
    }

    Ok((start, end))
}

fn text_response(
    status: tauri::http::StatusCode,
    message: &str,
) -> tauri::http::Response<Cow<'static, [u8]>> {
    asset_response_builder()
        .status(status)
        .header(
            tauri::http::header::CONTENT_TYPE,
            "text/plain; charset=utf-8",
        )
        .body(message.as_bytes().to_vec().into())
        .unwrap_or_else(|_| tauri::http::Response::new(Vec::new().into()))
}

fn asset_response_builder() -> tauri::http::response::Builder {
    tauri::http::Response::builder()
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        .header("Access-Control-Allow-Headers", "Range, Content-Type")
        .header(
            "Access-Control-Expose-Headers",
            "Content-Length, Content-Range, Accept-Ranges",
        )
        .header("Cache-Control", "no-store")
}

#[allow(dead_code)]
fn get_media_subdir(file_type: &str) -> &str {
    media_dirs::media_subdir(file_type)
}

const COPY_BUFFER_BYTES: usize = 128 * 1024;
const MAX_BASE64_READ_BYTES: u64 = 32 * 1024 * 1024;
const MAX_DOWNLOAD_BYTES: u64 = 512 * 1024 * 1024;
const MAX_DOWNLOAD_REDIRECTS: usize = 10;
const DOWNLOAD_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const DOWNLOAD_REQUEST_TIMEOUT: Duration = Duration::from_secs(5 * 60);
const DOWNLOAD_USER_AGENT: &str = concat!("Opentu Desktop/", env!("CARGO_PKG_VERSION"));
const MAX_RANGE_BYTES: u64 = 1024 * 1024;
const MAX_FULL_RESPONSE_BYTES: u64 = 32 * 1024 * 1024;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedMediaFile {
    pub path: String,
    pub name: String,
    pub mime_type: String,
    pub file_type: String,
    pub size: u64,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetImportResult {
    pub content_hash: String,
    pub file_name: String,
    pub original_name: String,
    pub local_path: String,
    pub file_type: String,
    pub mime_type: String,
    pub size: u64,
    pub created_at: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_relative_virtual_media_path() {
        assert_eq!(
            virtual_media_path_from_source("/__aitu_cache__/image/content-demo.png"),
            Some("/__aitu_cache__/image/content-demo.png".to_string())
        );
    }

    #[test]
    fn extracts_virtual_media_path_from_absolute_url() {
        assert_eq!(
            virtual_media_path_from_source(
                "http://localhost:7200/__aitu_cache__/image/content-demo.png?thumbnail=1"
            ),
            Some("/__aitu_cache__/image/content-demo.png".to_string())
        );
    }

    #[test]
    fn copy_file_streaming_keeps_same_file_unchanged() {
        let path = std::env::temp_dir().join(format!(
            "opentu-copy-same-{}-{}.txt",
            std::process::id(),
            chrono::Utc::now()
                .timestamp_nanos_opt()
                .unwrap_or_else(|| chrono::Utc::now().timestamp_millis())
        ));

        std::fs::write(&path, b"unchanged").unwrap();
        copy_file_streaming(&path, &path).unwrap();
        let content = std::fs::read(&path).unwrap();
        let _ = std::fs::remove_file(&path);

        assert_eq!(content, b"unchanged");
    }

    #[test]
    fn sanitize_file_name_removes_path_segments_and_invalid_chars() {
        assert_eq!(
            sanitize_file_name("../bad:name?.png").unwrap(),
            "bad_name_.png"
        );
        assert_eq!(
            sanitize_file_name(r"C:\media\demo.png").unwrap(),
            "demo.png"
        );
    }

    #[test]
    fn sanitize_file_name_prefixes_windows_reserved_names() {
        assert_eq!(sanitize_file_name("CON").unwrap(), "_CON");
        assert_eq!(sanitize_file_name("aux.txt").unwrap(), "_aux.txt");
        assert_eq!(sanitize_file_name("LPT1.png").unwrap(), "_LPT1.png");
    }

    #[test]
    fn download_url_accepts_only_http_without_credentials() {
        assert!(parse_download_url("https://example.com/file.png").is_ok());
        assert!(parse_download_url("file:///etc/passwd").is_err());
        assert!(parse_download_url("https://user:secret@example.com/file.png").is_err());
    }

    #[test]
    fn localhost_download_target_is_rejected_before_dns_lookup() {
        let url = reqwest::Url::parse("http://localhost/file.png").unwrap();
        let error =
            tauri::async_runtime::block_on(resolve_public_download_addrs(&url)).unwrap_err();
        assert!(error.contains("本机"));
    }

    #[test]
    fn private_and_special_network_addresses_are_denied() {
        for ip in [
            "127.0.0.1",
            "10.0.0.1",
            "100.64.0.1",
            "169.254.169.254",
            "172.16.0.1",
            "192.168.1.1",
            "224.0.0.1",
            "::1",
            "fe80::1",
            "fc00::1",
            "ff02::1",
            "::ffff:127.0.0.1",
            "2001:db8::1",
        ] {
            assert!(!is_public_download_ip(ip.parse().unwrap()), "{ip}");
        }
        assert!(is_public_download_ip("8.8.8.8".parse().unwrap()));
        assert!(is_public_download_ip(
            "2606:4700:4700::1111".parse().unwrap()
        ));
    }

    #[test]
    fn redirect_target_is_reparsed_and_private_target_can_be_rejected() {
        let base = reqwest::Url::parse("https://example.com/file").unwrap();
        let url = resolve_redirect_url(&base, "http://127.0.0.1/admin").unwrap();
        assert_eq!(url.as_str(), "http://127.0.0.1/admin");
        let ip: IpAddr = url.host_str().unwrap().parse().unwrap();
        assert!(!is_public_download_ip(ip));
    }

    #[test]
    fn streamed_download_size_limit_is_enforced() {
        assert_eq!(
            checked_download_size(MAX_DOWNLOAD_BYTES - 1, 1).unwrap(),
            MAX_DOWNLOAD_BYTES
        );
        assert!(checked_download_size(MAX_DOWNLOAD_BYTES, 1).is_err());
    }

    #[test]
    fn failed_download_guard_removes_partial_file() {
        let root = temp_media_root("partial-download-cleanup");
        let path = root.join("partial.tmp");
        {
            std::fs::write(&path, b"partial").unwrap();
            let _guard = PartialFileGuard::new(path.clone());
        }
        assert!(!path.exists());
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn bounded_base64_read_rejects_oversized_file() {
        let root = temp_media_root("bounded-base64-read");
        let path = root.join("large.bin");
        let file = std::fs::File::create(&path).unwrap();
        file.set_len(9).unwrap();
        assert!(read_file_as_base64(&path, 8).is_err());
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn download_request_timeout_is_enforced() {
        use std::io::{Read as _, Write as _};
        use std::net::TcpListener;

        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        let server = std::thread::spawn(move || {
            if let Ok((mut stream, _)) = listener.accept() {
                let _ = stream.set_read_timeout(Some(Duration::from_secs(1)));
                let mut request = [0_u8; 1024];
                let _ = stream.read(&mut request);
                std::thread::sleep(Duration::from_millis(200));
                let _ = stream.write_all(
                    b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok",
                );
            }
        });

        tauri::async_runtime::block_on(async {
            let client = build_download_client_with_timeouts(
                "example.test",
                &[addr],
                Duration::from_secs(1),
                Duration::from_millis(40),
            )
            .unwrap();
            let error = client
                .get(format!("http://example.test:{}/", addr.port()))
                .send()
                .await
                .unwrap_err();
            assert!(error.is_timeout());
        });

        server.join().unwrap();
    }

    #[test]
    fn media_subdirs_use_ascii_primary_names() {
        assert_eq!(get_media_subdir("image"), "images");
        assert_eq!(get_media_subdir("video"), "videos");
        assert_eq!(get_media_subdir("audio"), "audio");
        assert_eq!(get_media_subdir("ppt"), "ppt");
        assert_eq!(get_media_subdir("presentation"), "ppt");
        assert_eq!(get_media_subdir("text"), "text");
        assert_eq!(get_media_subdir("markdown"), "text");
        assert_eq!(get_media_subdir("archive"), "archives");
        assert_eq!(get_media_subdir("zip"), "archives");
    }

    #[test]
    fn resolve_media_file_path_reads_ascii_before_legacy_for_typed_files() {
        let root = temp_media_root("resolve-ascii-first");
        let ascii_dir = root.join("images");
        let legacy_dir = root.join("图片");
        std::fs::create_dir_all(&ascii_dir).unwrap();
        std::fs::create_dir_all(&legacy_dir).unwrap();
        std::fs::write(ascii_dir.join("demo.png"), b"ascii").unwrap();
        std::fs::write(legacy_dir.join("demo.png"), b"legacy").unwrap();

        let path = resolve_media_file_path(&root, "demo.png", Some("image")).unwrap();

        assert_eq!(path, ascii_dir.join("demo.png"));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn resolve_media_file_path_reads_legacy_localized_files() {
        let root = temp_media_root("resolve-legacy");
        let legacy_dir = root.join("图片");
        std::fs::create_dir_all(&legacy_dir).unwrap();
        std::fs::write(legacy_dir.join("demo.png"), b"legacy").unwrap();

        let path = resolve_media_file_path(&root, "demo.png", Some("image")).unwrap();

        assert_eq!(path, legacy_dir.join("demo.png"));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn resolve_media_file_path_does_not_cross_type_before_typed_legacy() {
        let root = temp_media_root("resolve-typed-legacy");
        let image_dir = root.join("images");
        let legacy_video_dir = root.join("视频");
        std::fs::create_dir_all(&image_dir).unwrap();
        std::fs::create_dir_all(&legacy_video_dir).unwrap();
        std::fs::write(image_dir.join("clip.mp4"), b"wrong-type").unwrap();
        std::fs::write(legacy_video_dir.join("clip.mp4"), b"video").unwrap();

        let path = resolve_media_file_path(&root, "clip.mp4", Some("video")).unwrap();

        assert_eq!(path, legacy_video_dir.join("clip.mp4"));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn decodes_tauri_windows_http_asset_url() {
        let uri = "http://opentu-asset.localhost/D%3A%5COpenTu%5C%E5%9B%BE%E7%89%87%5Cdemo.png"
            .parse::<tauri::http::Uri>()
            .unwrap();

        let candidates = decode_asset_request_path_candidates(&uri).unwrap();

        assert!(candidates.contains(&"D:\\OpenTu\\图片\\demo.png".to_string()));
    }

    #[test]
    fn decodes_custom_protocol_localhost_url() {
        let uri = "opentu-asset://localhost/D%3A%5COpenTu%5C%E5%9B%BE%E7%89%87%5Cdemo.png"
            .parse::<tauri::http::Uri>()
            .unwrap();

        let candidates = decode_asset_request_path_candidates(&uri).unwrap();

        assert!(candidates.contains(&"D:\\OpenTu\\图片\\demo.png".to_string()));
    }

    #[test]
    fn normalizes_leading_slash_before_windows_drive() {
        assert_eq!(
            normalize_decoded_asset_path("/D:\\OpenTu\\图片\\demo.png".to_string()),
            "D:\\OpenTu\\图片\\demo.png"
        );
    }

    #[test]
    fn parses_byte_range_request() {
        assert_eq!(parse_single_range("bytes=10-19", 100).unwrap(), (10, 19));
    }

    #[test]
    fn parses_suffix_byte_range_request() {
        assert_eq!(parse_single_range("bytes=-10", 100).unwrap(), (90, 99));
    }

    #[test]
    fn clamps_open_ended_range_to_memory_limit() {
        assert_eq!(
            parse_single_range("bytes=5-", MAX_RANGE_BYTES * 2).unwrap(),
            (5, 5 + MAX_RANGE_BYTES - 1)
        );
    }

    #[test]
    fn rejects_unsatisfiable_range_request() {
        let error = parse_single_range("bytes=100-120", 100).unwrap_err();
        assert_eq!(error.0, tauri::http::StatusCode::RANGE_NOT_SATISFIABLE);
    }

    fn temp_media_root(name: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "opentu-asset-test-{}-{}-{}",
            name,
            std::process::id(),
            chrono::Utc::now()
                .timestamp_nanos_opt()
                .unwrap_or_else(|| chrono::Utc::now().timestamp_millis())
        ));
        std::fs::create_dir_all(&root).unwrap();
        root
    }

    fn percent_encode_path(path: &Path) -> String {
        path.to_string_lossy()
            .bytes()
            .map(|byte| match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    (byte as char).to_string()
                }
                _ => format!("%{byte:02X}"),
            })
            .collect()
    }

    fn asset_request(
        method: tauri::http::Method,
        path: &Path,
        range: Option<&str>,
    ) -> tauri::http::Request<Vec<u8>> {
        let uri = format!("opentu-asset://localhost/{}", percent_encode_path(path));
        let mut builder = tauri::http::Request::builder().method(method).uri(uri);
        if let Some(range) = range {
            builder = builder.header(tauri::http::header::RANGE, range);
        }
        builder.body(Vec::new()).unwrap()
    }

    #[test]
    fn asset_full_response_returns_small_file() {
        let root = temp_media_root("full");
        let file_path = root.join("small.png");
        std::fs::write(&file_path, b"small-body").unwrap();

        let response = serve_opentu_asset_from_root(
            &root,
            asset_request(tauri::http::Method::GET, &file_path, None),
        )
        .unwrap();

        assert_eq!(response.status(), tauri::http::StatusCode::OK);
        assert_eq!(response.body().as_ref(), b"small-body");
        assert_eq!(
            response.headers().get(tauri::http::header::ACCEPT_RANGES),
            Some(&tauri::http::HeaderValue::from_static("bytes"))
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn asset_head_response_advertises_range_support() {
        let root = temp_media_root("head");
        let file_path = root.join("head.png");
        std::fs::write(&file_path, b"head-body").unwrap();

        let response = serve_opentu_asset_from_root(
            &root,
            asset_request(tauri::http::Method::HEAD, &file_path, None),
        )
        .unwrap();

        assert_eq!(response.status(), tauri::http::StatusCode::OK);
        assert!(response.body().is_empty());
        assert_eq!(
            response.headers().get(tauri::http::header::CONTENT_LENGTH),
            Some(&tauri::http::HeaderValue::from_static("9"))
        );
        assert_eq!(
            response.headers().get(tauri::http::header::ACCEPT_RANGES),
            Some(&tauri::http::HeaderValue::from_static("bytes"))
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn asset_range_response_returns_partial_content() {
        let root = temp_media_root("range");
        let file_path = root.join("range.png");
        std::fs::write(&file_path, b"0123456789abcdef").unwrap();

        let response = serve_opentu_asset_from_root(
            &root,
            asset_request(tauri::http::Method::GET, &file_path, Some("bytes=4-7")),
        )
        .unwrap();

        assert_eq!(response.status(), tauri::http::StatusCode::PARTIAL_CONTENT);
        assert_eq!(response.body().as_ref(), b"4567");
        assert_eq!(
            response.headers().get(tauri::http::header::CONTENT_RANGE),
            Some(&tauri::http::HeaderValue::from_static("bytes 4-7/16"))
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn asset_invalid_range_returns_416() {
        let root = temp_media_root("invalid-range");
        let file_path = root.join("range.png");
        std::fs::write(&file_path, b"0123456789abcdef").unwrap();

        let error = serve_opentu_asset_from_root(
            &root,
            asset_request(tauri::http::Method::GET, &file_path, Some("bytes=100-120")),
        )
        .unwrap_err();

        assert_eq!(error.0, tauri::http::StatusCode::RANGE_NOT_SATISFIABLE);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn asset_large_non_range_response_is_rejected() {
        let root = temp_media_root("large");
        let file_path = root.join("large.png");
        let file = std::fs::OpenOptions::new()
            .create(true)
            .write(true)
            .open(&file_path)
            .unwrap();
        file.set_len(MAX_FULL_RESPONSE_BYTES + 1).unwrap();

        let error = serve_opentu_asset_from_root(
            &root,
            asset_request(tauri::http::Method::GET, &file_path, None),
        )
        .unwrap_err();

        assert_eq!(error.0, tauri::http::StatusCode::PAYLOAD_TOO_LARGE);

        let _ = std::fs::remove_dir_all(&root);
    }
}
