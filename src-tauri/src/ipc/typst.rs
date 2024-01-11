use crate::engine::{NoleWorld, TypstEngine};
use base64::{engine::general_purpose, Engine as _};
use chrono::{Datelike, Timelike};
use serde::Serialize;
use serde_repr::Serialize_repr;
use std::fs;
use std::ops::Range;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Runtime;
use typst::diag::{EcoString, Severity};
use typst::eval::Tracer;
use typst::foundations::Datetime;
use typst::World;
use typst::{diag::StrResult, visualize::Color};
use typst_ide::{Completion, CompletionKind};

#[derive(Serialize_repr, Debug)]
#[repr(u8)]
pub enum TypstCompletionKind {
    Syntax = 1,
    Function = 2,
    Parameter = 3,
    Constant = 4,
    Symbol = 5,
    Type = 6,
}

#[derive(Serialize, Debug)]
pub struct TypstCompletion {
    kind: TypstCompletionKind,
    label: String,
    apply: Option<String>,
    detail: Option<String>,
}

#[derive(Serialize, Debug)]
pub struct TypstCompleteResponse {
    offset: usize,
    completions: Vec<TypstCompletion>,
}

impl From<Completion> for TypstCompletion {
    fn from(value: Completion) -> Self {
        Self {
            kind: match value.kind {
                CompletionKind::Syntax => TypstCompletionKind::Syntax,
                CompletionKind::Func => TypstCompletionKind::Function,
                CompletionKind::Param => TypstCompletionKind::Parameter,
                CompletionKind::Constant => TypstCompletionKind::Constant,
                CompletionKind::Symbol(_) => TypstCompletionKind::Symbol,
                CompletionKind::Type => TypstCompletionKind::Type,
            },
            label: value.label.to_string(),
            apply: value.apply.map(|s| s.to_string()),
            detail: value.detail.map(|s| s.to_string()),
        }
    }
}

#[derive(Serialize, Debug)]
pub struct TypstCompileResponse {
    pub updated_idx: Vec<usize>,
    pub n_pages: usize,
    pub width: f64,
    pub height: f64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "snake_case")]
pub enum TypstDiagnosticSeverity {
    Error,
    Warning,
}

#[derive(Serialize, Clone, Debug)]
pub struct TypstDiagnostic {
    pub range: Range<usize>,
    pub severity: TypstDiagnosticSeverity,
    pub message: String,
    pub hints: Vec<String>,
}

#[derive(Serialize, Clone, Debug)]
pub struct TypstRenderResponse {
    pub frame: String,
    pub width: f64,
    pub height: f64,
}

#[tauri::command]
pub async fn autocomplete(
    engine: tauri::State<'_, Arc<TypstEngine>>,
    content: String,
    offset: usize,
    explicit: bool,
) -> StrResult<TypstCompleteResponse> {
    let world = engine.world_cache.lock().expect("get world lock failed!");
    let world = world.as_ref().ok_or("World not initialized!".to_string())?;
    world.virtual_source(world.main(), content.to_string())?;
    let source = world.source(world.main()).map_err(|err| err.to_string())?;

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
        completions: completions.into_iter().map(TypstCompletion::from).collect(),
    })
    // completions
}

/// Compile a single time.
///
/// Returns whether it compiled without errors.
#[tauri::command]
pub async fn compile<R: Runtime>(
    window: tauri::Window<R>,
    engine: tauri::State<'_, Arc<TypstEngine>>,
    workspace: PathBuf,
    path: PathBuf,
    content: String,
    init: bool,
) -> StrResult<TypstCompileResponse> {
    let start = std::time::Instant::now();
    if init {
        engine.reset().map_err(|err| err.to_string())?;
    }
    let mut world = engine
        .world_cache
        .lock()
        .map_err(|_| "Get world lock failed!")?;
    if world.is_none() || world.as_ref().ok_or("Unknow world cache stat.")?.input() != &path {
        *world = Some(NoleWorld::new(workspace, path, engine.core.clone())?);
    }
    let world = world.as_mut().ok_or("World initialize failed")?;
    // world.reset(); todo: currently, nole only support single file opened, so we don't need to reset the world
    world.virtual_source(world.main(), content.clone())?;

    let mut tracer = Tracer::new();
    let result = typst::compile(world, &mut tracer);
    comemo::evict(1);

    match result {
        // Export the SVG.
        Ok(document) => {
            let duration = start.elapsed();
            println!("Compile duration: {:?}", duration);
            let mut updated_idx: Vec<usize> = vec![];
            for (i, frame) in document.pages.iter().enumerate() {
                // If the frame is in the cache, skip it.
                if world.export_cache().is_cached(i, frame) {
                    continue;
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
        Err(diagnostics) => {
            println!(
                "compilation failed with {:?} diagnostics",
                diagnostics.len()
            );

            let source = world.source(world.main());
            let diagnostics: Vec<TypstDiagnostic> = match source {
                Ok(source) => diagnostics
                    .iter()
                    .filter(|d| d.span.id() == Some(world.main()))
                    .filter_map(|d| {
                        let span = source.find(d.span)?;
                        let range = span.range();
                        let start = content[..range.start].chars().count();
                        let size = content[range.start..range.end].chars().count();

                        let message = d.message.to_string();
                        Some(TypstDiagnostic {
                            range: start..start + size,
                            severity: match d.severity {
                                Severity::Error => TypstDiagnosticSeverity::Error,
                                Severity::Warning => TypstDiagnosticSeverity::Warning,
                            },
                            message,
                            hints: d.hints.iter().map(|hint| hint.to_string()).collect(),
                        })
                    })
                    .collect(),
                Err(_) => vec![],
            };
            let _ = window.emit("typst::compile", diagnostics);
            Err(EcoString::from("Compile failed!"))
        }
    }
    // todo!()
}

/// reset the world and document at editor mount.
#[tauri::command]
pub async fn reset(engine: tauri::State<'_, Arc<TypstEngine>>) -> Result<(), String> {
    engine.reset().map_err(|err| err.to_string())
}

/// render the svg of the page.
#[tauri::command]
pub async fn svg(engine: tauri::State<'_, Arc<TypstEngine>>, page: usize) -> Result<String, String> {
    let document = engine
        .document_cache
        .read()
        .map_err(|_| "Read document failed!")?;
    let now = std::time::Instant::now();
    let frame = document.as_ref().ok_or("Document not initialized!")?.pages[page].clone();
    let svg = typst_svg::svg(&frame);
    let elapsed = now.elapsed();
    println!("Render page {:?} duration: {:?}", page, elapsed);
    Ok(svg)
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

/// Returns whether it without errors.
#[tauri::command]
pub async fn export(
    engine: tauri::State<'_, Arc<TypstEngine>>,
    id: String,
    path: PathBuf,
) -> Result<(), String> {
    let document = engine
        .document_cache
        .read()
        .map_err(|_| "Read document failed!")?;
    let timer = std::time::Instant::now();

    let pdf = typst_pdf::pdf(
        document.as_ref().ok_or("can not get ducument.")?,
        Some(&id),
        now(),
    );
    let elapsed = timer.elapsed();
    println!("Export pdf duration: {:?}", elapsed);
    fs::write(path, pdf)
        .map_err(|err| err.to_string())
        .map(|_| ())
}

/// Get the current date and time in UTC.
fn now() -> Option<Datetime> {
    let now = chrono::Local::now().naive_utc();
    Datetime::from_ymd_hms(
        now.year(),
        now.month().try_into().ok()?,
        now.day().try_into().ok()?,
        now.hour().try_into().ok()?,
        now.minute().try_into().ok()?,
        now.second().try_into().ok()?,
    )
}
