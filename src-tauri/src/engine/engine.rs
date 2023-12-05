use std::sync::{Mutex, Arc};

use crate::engine::{FontSearcher, FontSlot};
use comemo::Prehashed;
use typst::diag::StrResult;
use typst::doc::Frame;
use typst::{eval::Library, util::hash128};
use typst::font::FontBook;

use super::NoleWorld;

pub struct TypstEngine {
    /// Fonts and Typst's standard library.
    pub core: Arc<TypstCore>,
    /// The export cache, used for caching output files in `typst watch`
    /// sessions.
    pub document_cache: Mutex<ExportCache>,
    /// world of the typst.
    pub world_cache: Arc<Mutex<Option<NoleWorld>>>,
}

impl TypstEngine {
    pub fn new() -> Self {
        Self { 
            core: Arc::new(TypstCore::new()), 
            document_cache: Mutex::new(ExportCache::new()), 
            world_cache: Arc::new(Mutex::new(None)) 
        }
    }
    pub fn reset_document_cache(&self) -> StrResult<()> {
        let mut cache = self.document_cache.lock().expect("Get document_cache lock failed!");
        cache.cache.clear();
        Ok(())
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
            library: Prehashed::new(typst_library::build()),
            fontbook: Prehashed::new(searcher.book),
            fonts: searcher.fonts,
        }
    }
}

/// Caches exported files so that we can avoid re-exporting them if they haven't
/// changed.
///
/// This is done by having a list of size `files.len()` that contains the hashes
/// of the last rendered frame in each file. If a new frame is inserted, this
/// will invalidate the rest of the cache, this is deliberate as to decrease the
/// complexity and memory usage of such a cache.
pub struct ExportCache {
    /// The hashes of last compilation's frames.
    pub cache: Vec<u128>,
}

impl ExportCache {
    /// Creates a new export cache.
    pub fn new() -> Self {
        Self { cache: Vec::with_capacity(32) }
    }

    /// Returns true if the entry is cached and appends the new hash to the
    /// cache (for the next compilation).
    pub fn is_cached(&mut self, i: usize, frame: &Frame) -> bool {
        let hash = hash128(frame);

        if i >= self.cache.len() {
            self.cache.push(hash);
            return false;
        }

        std::mem::replace(&mut self.cache[i], hash) == hash
    }
}