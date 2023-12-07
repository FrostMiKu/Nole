use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use std::ops::Deref;
use std::path::PathBuf;
use std::sync::Arc;
use typst::eval::Tracer;
use typst::World;
use typst::{diag::StrResult, visualize::Color};
use typst_ide::Completion;

use crate::engine::{NoleWorld, TypstEngine};

#[derive(Serialize, Debug)]
pub struct TypstCompleteResponse {
    offset: usize,
    completions: Vec<Completion>,
}

#[derive(Serialize, Debug)]
pub struct TypstCompileResponse {
    pub updated_idx: Vec<usize>,
    pub n_pages: usize,
    pub width: f64,
    pub height: f64,
}

#[derive(Serialize, Clone, Debug)]
pub struct TypstRenderResponse {
    pub frame: String,
    pub width: f64,
    pub height: f64,
}

#[tauri::command]
pub async fn autocomplete(
    // window: tauri::Window<R>,
    engine: tauri::State<'_, Arc<TypstEngine>>,
    path: PathBuf,
    content: String,
    offset: usize,
    explicit: bool,
) -> StrResult<TypstCompleteResponse> {
    let world = engine.world_cache.lock().expect("get world lock failed!");
    let world = world.as_ref().ok_or("World not initialized!".to_string())?;
    let source_id = world.file_id(&path)?;
    world.virtual_source(source_id, content.to_string())?;
    let source = world.source(source_id).map_err(|err| err.to_string())?;

    // recalc offest for chinese character
    let offset = content
        .char_indices()
        .nth(offset)
        .map(|a| a.0)
        .unwrap_or(content.len());

    let (completed_offset, completions) =
        typst_ide::autocomplete(world, None, &source, offset, explicit)
            .ok_or("Failed to perform autocomplete".to_string())?;
    // recalc offest for chinese character
    let completed_char_offset = content.clone()[..completed_offset].chars().count();

    Ok(TypstCompleteResponse {
        offset: completed_char_offset,
        completions: completions,
    })
    // completions
}

/// Compile a single time.
///
/// Returns whether it compiled without errors.
#[tauri::command]
pub async fn compile(
    engine: tauri::State<'_, Arc<TypstEngine>>,
    workspace: PathBuf,
    path: PathBuf,
    content: String,
) -> StrResult<TypstCompileResponse> {
    let start = std::time::Instant::now();
    let mut world = engine
        .world_cache
        .lock()
        .map_err(|_| "Get world lock failed!")?;
    if world.is_none() || world.as_ref().ok_or("Unknow world cache stat.")?.input() != &path {
        *world = Some(NoleWorld::new(workspace, path, engine.core.clone())?);
    }
    let world = world.as_mut().ok_or("World initialize failed")?;
    world.reset();
    world.virtual_source(world.main(), content)?;

    let mut tracer = Tracer::new();
    let result = typst::compile(world, &mut tracer);

    match result {
        // Export the SVG.
        Ok(document) => {
            let duration = start.elapsed();
            println!("Compile duration: {:?}", duration);
            let mut updated_idx: Vec<usize> = vec![];
            for (i, frame) in document.pages.iter().enumerate() {
                {
                    // If the frame is in the cache, skip it.
                    if world.export_cache().is_cached(i, frame) {
                        continue;
                    }
                }
                updated_idx.push(i);
            }
            let first_page = &document.pages[0];
            let width = first_page.width();
            let height = first_page.height();
            let n_pages = document.pages.len();
            engine
                .document_cache
                .write()
                .map_err(|_| "Write document failed!")?
                .replace(document);

            Ok(TypstCompileResponse {
                updated_idx,
                n_pages,
                width: width.to_pt(),
                height: height.to_pt(),
            })
        }

        // Print diagnostics.
        Err(errors) => {
            // let _ = window.emit("typst_compile", errors.deref()[0].message.as_str());
            return Err(errors.deref()[0].message.as_str().to_string().into());
        }
    }
}

/// Returns whether it render without errors.
#[tauri::command]
pub async fn render(
    engine: tauri::State<'_, Arc<TypstEngine>>,
    page: usize,
    scale: f32,
) -> Result<TypstRenderResponse, String> {
    let document = engine
        .document_cache
        .read()
        .map_err(|_| "Read document failed!")?;
    let now = std::time::Instant::now();
    let frame = document.as_ref().ok_or("Document not initialized!")?.pages[page].clone();
    let bmp = typst_render::render(&frame, scale, Color::WHITE);
    let elapsed = now.elapsed();
    println!("Render page {:?} duration: {:?}", page, elapsed);
    return bmp
        .encode_png()
        .map_err(|err| err.to_string())
        .map(|image| {
            let b64 = general_purpose::STANDARD.encode(image);
            TypstRenderResponse {
                frame: b64,
                width: frame.width().to_pt(),
                height: frame.height().to_pt(),
            }
        });
}

// Export into the target format.
// fn export(
//     world: &mut SystemWorld,
//     document: &Document,
//     command: &CompileCommand,
//     watching: bool,
// ) -> StrResult<()> {
//     match command.output_format()? {
//         OutputFormat::Png => {
//             export_image(world, document, command, watching, ImageExportFormat::Png)
//         }
//         OutputFormat::Svg => {
//             export_image(world, document, command, watching, ImageExportFormat::Svg)
//         }
//         OutputFormat::Pdf => export_pdf(document, command, world),
//     }
// }

// Export to a PDF.
// fn export_pdf(
//     document: &Document,
//     command: &CompileCommand,
//     world: &SystemWorld,
// ) -> StrResult<()> {
//     let ident = world.input().to_string_lossy();
//     let buffer = typst_pdf::pdf(document, Some(&ident), now());
//     let output = command.output();
//     fs::write(output, buffer)
//         .map_err(|err| eco_format!("failed to write PDF file ({err})"))?;
//     Ok(())
// }

// Get the current date and time in UTC.
// fn now() -> Option<Datetime> {
//     let now = chrono::Local::now().naive_utc();
//     Datetime::from_ymd_hms(
//         now.year(),
//         now.month().try_into().ok()?,
//         now.day().try_into().ok()?,
//         now.hour().try_into().ok()?,
//         now.minute().try_into().ok()?,
//         now.second().try_into().ok()?,
//     )
// }

// /// An image format to export in.
// enum ImageExportFormat {
//     Png,
//     Svg,
// }
