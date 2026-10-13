use crate::{media_dirs, AppState};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};
use tauri::{Manager, State};
use tauri_plugin_opener::OpenerExt;

const MAX_FILES: usize = 20_000;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaEntry {
    pub path: String,
    pub name: String,
    pub kind: String,
    pub size: u64,
    pub modified: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Inventory {
    root: String,
    files: Vec<MediaEntry>,
    errors: Vec<String>,
    native_references: Vec<String>,
}

fn root(state: &State<'_, AppState>) -> Result<PathBuf, String> {
    state
        .db
        .lock()
        .map_err(|e| e.to_string())?
        .media_root
        .canonicalize()
        .map_err(|e| e.to_string())
}

fn entry(path: &Path, kind: &str) -> Result<MediaEntry, String> {
    let meta = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if !meta.is_file() || meta.file_type().is_symlink() {
        return Err("非普通文件或符号链接".into());
    }
    let modified = meta
        .modified()
        .map_err(|e| e.to_string())?
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos()
        .to_string();
    Ok(MediaEntry {
        path: path.to_string_lossy().into(),
        name: path
            .file_name()
            .ok_or("无效文件名")?
            .to_string_lossy()
            .into(),
        kind: kind.into(),
        size: meta.len(),
        modified,
    })
}

fn scan(root: &Path) -> (Vec<MediaEntry>, Vec<String>) {
    let mut files = Vec::new();
    let mut errors = Vec::new();
    for dir in media_dirs::all_media_subdirs() {
        let path = root.join(dir);
        let meta = match fs::symlink_metadata(&path) {
            Ok(meta) => meta,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
            Err(e) => {
                errors.push(format!("{}: {}", dir, e));
                continue;
            }
        };
        if meta.file_type().is_symlink() || !meta.is_dir() {
            errors.push(format!("{}: 非普通目录，已跳过", dir));
            continue;
        }
        let kind = match dir {
            "images" | "图片" => "image",
            "videos" | "视频" => "video",
            "audio" | "音频" => "audio",
            _ => "other",
        };
        match fs::read_dir(&path) {
            Ok(entries) => {
                for item in entries {
                    if files.len() >= MAX_FILES {
                        errors.push("文件数超过扫描上限，请先在目录中分批整理".into());
                        return (files, errors);
                    }
                    match item {
                        Ok(item) => match entry(&item.path(), kind) {
                            Ok(file) => files.push(file),
                            Err(e) => errors.push(format!("{}: {}", item.path().display(), e)),
                        },
                        Err(e) => errors.push(e.to_string()),
                    }
                }
            }
            Err(e) => errors.push(format!("{}: {}", dir, e)),
        }
    }
    files.sort_by(|a, b| a.path.cmp(&b.path));
    (files, errors)
}

fn native_references(db: &crate::database::Database) -> Result<Vec<String>, String> {
    let mut values = Vec::new();
    for sql in [
        "SELECT data FROM workspaces",
        "SELECT local_path FROM assets",
        "SELECT COALESCE(params, '') || COALESCE(result, '') FROM tasks",
        "SELECT content FROM knowledge_notes",
        "SELECT content FROM chat_history",
        "SELECT value FROM settings WHERE key != 'media_root_path'",
    ] {
        let mut stmt = db.conn.prepare(sql).map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        for row in rows {
            values.push(row.map_err(|e| e.to_string())?);
        }
    }
    Ok(values)
}

#[tauri::command]
pub async fn inspect_media_storage(app: tauri::AppHandle) -> Result<Inventory, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let root = root(&state)?;
        let refs = {
            let db = state.db.lock().map_err(|e| e.to_string())?;
            native_references(&db)?
        };
        let (files, errors) = scan(&root);
        Ok(Inventory {
            root: root.to_string_lossy().into(),
            files,
            errors,
            native_references: refs,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

fn checked_path(root: &Path, path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(path);
    let relative = path
        .strip_prefix(root)
        .map_err(|_| "文件不在当前媒体目录")?;
    let parts: Vec<_> = relative.components().collect();
    if parts.len() != 2 || !media_dirs::all_media_subdirs().any(|dir| parts[0].as_os_str() == dir) {
        return Err("只能操作媒体分类目录中的文件".into());
    }
    if parts
        .iter()
        .any(|part| !matches!(part, std::path::Component::Normal(_)))
    {
        return Err("无效文件路径".into());
    }
    let parent = path.parent().ok_or("无效文件路径")?;
    if fs::symlink_metadata(parent)
        .map_err(|e| e.to_string())?
        .file_type()
        .is_symlink()
    {
        return Err("不能操作符号链接目录".into());
    }
    entry(&path, "")?;
    if path.canonicalize().map_err(|e| e.to_string())? != path {
        return Err("文件路径发生变化".into());
    }
    Ok(path)
}

#[tauri::command]
pub async fn open_media_location(
    app: tauri::AppHandle,
    path: Option<String>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let current = root(&app.state::<AppState>())?;
        if let Some(path) = path {
            app.opener()
                .reveal_item_in_dir(checked_path(&current, &path)?)
                .map_err(|e| e.to_string())
        } else {
            app.opener()
                .open_path(current.to_string_lossy(), None::<&str>)
                .map_err(|e| e.to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResult {
    pub path: String,
    pub deleted_bytes: u64,
    pub error: Option<String>,
}

fn delete_one(root: &Path, expected: &MediaEntry, refs: &[String]) -> Result<u64, String> {
    let path = checked_path(root, &expected.path)?;
    let now = entry(&path, &expected.kind)?;
    if now.size != expected.size || now.modified != expected.modified || now.name != expected.name {
        return Err("文件已变化，请重新扫描".into());
    }
    if refs.iter().any(|value| value.contains(&expected.name)) {
        return Err("本地数据库仍引用此文件".into());
    }
    fs::remove_file(&path).map_err(|e| e.to_string())?;
    Ok(now.size)
}

#[tauri::command]
pub async fn delete_inspected_media(
    app: tauri::AppHandle,
    expected_root: String,
    files: Vec<MediaEntry>,
) -> Result<Vec<DeleteResult>, String> {
    if files.is_empty() || files.len() > 500 {
        return Err("每次请选择 1 至 500 个文件".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        // Serialize root changes and native database writes with exact-file deletion.
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let current = db.media_root.canonicalize().map_err(|e| e.to_string())?;
        if current.to_string_lossy() != expected_root {
            return Err("媒体目录已变化，请重新扫描".into());
        }
        let refs = native_references(&db)?;
        Ok(files
            .iter()
            .map(|file| match delete_one(&current, file, &refs) {
                Ok(bytes) => DeleteResult {
                    path: file.path.clone(),
                    deleted_bytes: bytes,
                    error: None,
                },
                Err(error) => DeleteResult {
                    path: file.path.clone(),
                    deleted_bytes: 0,
                    error: Some(error),
                },
            })
            .collect())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_FIXTURE: AtomicU64 = AtomicU64::new(0);

    fn fixture() -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "opentu-cleanup-{}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            NEXT_FIXTURE.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(root.join("images")).unwrap();
        fs::create_dir_all(root.join("图片")).unwrap();
        root.canonicalize().unwrap()
    }
    #[test]
    fn cleanup_handles_legacy_stale_referenced_and_external_files() {
        let root = fixture();
        let path = root.join("图片/a.png");
        fs::write(&path, b"abc").unwrap();
        let file = entry(&path, "image").unwrap();
        assert_eq!(scan(&root).0.len(), 1);
        assert!(delete_one(&root, &file, &["a.png".into()]).is_err());
        fs::write(&path, b"changed").unwrap();
        assert!(delete_one(&root, &file, &[]).is_err());
        let file = entry(&path, "image").unwrap();
        // Joining onto Windows verbatim paths normalizes `..` before validation.
        let sep = std::path::MAIN_SEPARATOR;
        let traversal = format!("{}{sep}images{sep}..{sep}图片{sep}a.png", root.display());
        assert!(checked_path(&root, &traversal).is_err());
        assert!(checked_path(&root, "/tmp/outside.png").is_err());
        assert_eq!(delete_one(&root, &file, &[]).unwrap(), 7);
        assert!(delete_one(&root, &file, &[]).is_err());
        fs::remove_dir_all(root).unwrap();
    }
    #[cfg(unix)]
    #[test]
    fn rejects_symlink_files_and_directories() {
        let root = fixture();
        let outside = root.join("source.png");
        fs::write(&outside, b"keep").unwrap();
        std::os::unix::fs::symlink(&outside, root.join("images/link.png")).unwrap();
        assert!(checked_path(&root, root.join("images/link.png").to_str().unwrap()).is_err());
        assert!(!scan(&root).1.is_empty());
        fs::remove_dir(root.join("图片")).unwrap();
        std::os::unix::fs::symlink(root.join("images"), root.join("图片")).unwrap();
        assert!(checked_path(&root, root.join("图片/link.png").to_str().unwrap()).is_err());
        assert!(outside.exists());
        fs::remove_dir_all(root).unwrap();
    }
}
