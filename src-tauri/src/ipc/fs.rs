use std::path::PathBuf;
use trash;

/// Returns whether it without errors.
#[tauri::command]
pub async fn delete(
    path: PathBuf
) -> Result<(), String> {
    trash::delete(path).map_err(|err| err.to_string())
}