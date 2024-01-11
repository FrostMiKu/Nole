use std::{path::PathBuf, fs, io::BufWriter};
use chrono::Local;
use arboard::Clipboard;

#[tauri::command]
pub async fn paste_image(path: PathBuf) -> Result<PathBuf, String> {
    let now = Local::now();
    let now_format = now.format("%Y-%m-%d %H:%M:%S.png");
    fs::create_dir_all(&path).map_err(|err| err.to_string())?;
    let path = path.join(now_format.to_string());
    let mut clipboard = Clipboard::new().map_err(|err| err.to_string())?;
    let image = clipboard.get_image().map_err(|err| err.to_string())?;
    let file = fs::File::create(&path).map_err(|err| err.to_string())?;
    let ref mut w = BufWriter::new(file);
    let mut encoder = png::Encoder::new(w, image.width as u32, image.height as u32);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    let mut writer = encoder.write_header().map_err(|err| err.to_string())?;
    writer
        .write_image_data(&*image.bytes).map_err(|err| err.to_string())?;
    Ok(path)
}