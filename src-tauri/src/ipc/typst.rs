use serde::Serialize;
use std::ops::Deref;
use std::path::PathBuf;
use std::sync::Arc;
use typst::diag::StrResult;
use typst::eval::Tracer;
use typst::World;
use typst_ide::Completion;

use crate::engine::{NoleWorld, TypstEngine};

#[derive(Serialize, Debug)]
pub struct TypstCompleteResponse {
    offset: usize,
    completions: Vec<Completion>,
}

#[derive(Serialize, Clone, Debug)]
pub struct TypstDocument {
    pub n_pages: usize,
    pub frames: Vec<(usize, String)>,
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
    // recalc offest for chinese character
    let offset = content
        .char_indices()
        .nth(offset)
        .map(|a| a.0)
        .unwrap_or(content.len());
    let world = world.as_ref().ok_or("World not initialized!".to_string())?;
    let source_id = world.file_id(&path)?;
    world.virtual_source(source_id, content.to_string())?;
    let source = world.source(source_id).map_err(|err| err.to_string())?;

    let (completed_offset, completions) =
        typst_ide::autocomplete(world, &[], &source, offset, explicit)
            .ok_or("Failed to perform autocomplete".to_string())?;
    // recalc offest for chinese character
    let completed_char_offset = content.clone()[..completed_offset].chars().count();

    Ok(TypstCompleteResponse {
        offset: completed_char_offset,
        completions: completions,
    })
    // completions
}

#[tauri::command]
pub async fn clear_cache(engine: tauri::State<'_, Arc<TypstEngine>>) -> StrResult<()> {
    engine.reset_document_cache()
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
) -> StrResult<TypstDocument> {
    let start = std::time::Instant::now();
    let mut world = engine
        .world_cache
        .lock()
        .map_err(|_| "Get world lock failed!")?;
    if world.is_none() || world.as_ref().ok_or("Unknow world cache stat.")?.path() != &path {
        *world = Some(NoleWorld::new(workspace, path, engine.core.clone())?);
    }
    let world = world.as_mut().ok_or("World initialize failed")?;
    world.reset();
    world.virtual_source(world.main(), content)?;
    // Ensure that the main file is present. 23/11/25 update: virtual_source will need not to do this
    // world.source(world.main()).map_err(|err| err.to_string())?;

    let mut tracer = Tracer::new();
    let result = typst::compile(world, &mut tracer);
    // let warnings = tracer.warnings();

    match result {
        // Export the PDF / PNG / SVG.
        Ok(document) => {
            let duration = start.elapsed();
            println!("Compile duration: {:?}", duration);
            let mut outputs: Vec<(usize, String)> = vec![];
            for (i, frame) in document.pages.iter().enumerate() {
                {
                    // If the frame is in the cache, skip it.
                    if engine
                        .document_cache
                        .lock()
                        .expect("Can not lock cache!")
                        .is_cached(i, frame)
                    {
                        continue;
                    }
                }
                outputs.push((i, typst::export::svg(frame)));
            }

            // Assume all pages have the same size
            // TODO: Improve this?
            let first_page = &document.pages[0];
            let width = first_page.width();
            let height = first_page.height();

            // let _ = window.emit(
            //     "typst_compile",
            //     TypstDocument {
            //         width: width.to_pt(),
            //         height: height.to_pt(),
            //         frames: outputs,
            //         n_pages: document.pages.len(),
            //     },
            // );
            return Ok(TypstDocument {
                width: width.to_pt(),
                height: height.to_pt(),
                frames: outputs,
                n_pages: document.pages.len(),
            });
        }

        // Print diagnostics.
        Err(errors) => {
            // let _ = window.emit("typst_compile", errors.deref()[0].message.as_str());
            return Err(errors.deref()[0].message.as_str().to_string().into());
        }
    }
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
