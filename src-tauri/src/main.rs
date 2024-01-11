// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod engine;
mod ipc;

use engine::TypstEngine;
use std::sync::Arc;
use tauri::Manager;

fn main() {
    // let engine = Arc::new(TypstEngine::new());
    let engine = Arc::new(TypstEngine::new());
    // initialize the custom invoke system as a HTTP server, allowing the given origins to access it.
    let http = tauri_invoke_http::Invoke::new(if cfg!(feature = "custom-protocol") {
        ["tauri://localhost"]
    } else {
        ["http://localhost:1420"]
    });
    tauri::Builder::default()
    .invoke_system(http.initialization_script(), http.responder())
        .setup(move |app| {
            http.start(app.handle());
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
                //   window.close_devtools();
            }
            Ok(())
        })
        .plugin(tauri_plugin_context_menu::init())
        .manage(engine)
        .invoke_handler(tauri::generate_handler![
            ipc::reset,
            ipc::compile,
            ipc::svg,
            ipc::render,
            ipc::autocomplete,
            ipc::export,
            ipc::delete,
            ipc::get_available_path,
            ipc::paste_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
