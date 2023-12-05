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

    tauri::Builder::default()
        .setup(|app| {
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
            ipc::compile,
            ipc::autocomplete,
            ipc::clear_cache,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
