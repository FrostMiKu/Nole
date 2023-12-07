use std::sync::{Mutex, Arc, RwLock};
use crate::engine::{FontSearcher, FontSlot};
use comemo::Prehashed;
use typst::Library;
use typst::text::FontBook;
use typst::model::Document;

use super::NoleWorld;

pub struct TypstEngine {
    /// Fonts and Typst's standard library.
    pub core: Arc<TypstCore>,
    /// Last compiled document.
    pub document_cache: RwLock<Option<Document>>,
    /// world of the typst.
    pub world_cache: Mutex<Option<NoleWorld>>,
}

impl TypstEngine {
    pub fn new() -> Self {
        Self { 
            core: Arc::new(TypstCore::new()), 
            document_cache: RwLock::new(None), 
            world_cache: Mutex::new(None) 
        }
    }
}


pub struct TypstCore {
    /// Typst's standard library.
    pub library: Prehashed<Library>,
    /// Metadata about discovered fonts.
    pub fontbook: Prehashed<FontBook>,
    /// Locations of and storage for lazily loaded fonts.
    pub fonts: Vec<FontSlot>,
}

impl TypstCore {
    pub fn new() -> Self {
        let mut searcher = FontSearcher::new();
        searcher.search(&[]);

        Self {
            library: Prehashed::new(Library::build()),
            fontbook: Prehashed::new(searcher.book),
            fonts: searcher.fonts,
        }
    }
}