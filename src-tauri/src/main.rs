// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod engine;
mod ipc;

use engine::TypstEngine;
use tauri::Manager;
use std::sync::Arc;

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
            ipc::reset,
            ipc::compile,
            ipc::render,
            ipc::autocomplete,
            ipc::export,
            ipc::delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
