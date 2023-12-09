use std::path::PathBuf;
use trash;

/// Returns whether it without errors.
#[tauri::command]
pub async fn delete(path: PathBuf) -> Result<(), String> {
    trash::delete(path).map_err(|err| err.to_string())
}

/// Return a path that does not exist. If the path exists, the path will be appended with a number.
#[tauri::command]
pub async fn get_available_path(path: PathBuf) -> Result<PathBuf, String> {
    let mut i = 0;
    let name = path.clone();
    let mut path = path;

    // let mut trypath = name;
    while path.exists() {
        i += 1;
        path = path.with_file_name(format!(
            "{}-{}{}",
            name.file_stem()
            .ok_or("Path cannot endwith separator.")?
            .to_string_lossy(),
            i,
            path.extension()
                .map(|ext| format!(".{}", ext.to_string_lossy()))
                .unwrap_or_else(|| "".to_string())
        ));
    }
    Ok(path)
}
