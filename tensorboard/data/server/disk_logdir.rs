/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

//! Log directories on local disk.

use log::{error, info, warn};
use std::collections::HashMap;
use std::fs::File;
use std::io::{self, BufReader};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::logdir::{EventFileBuf, Logdir, EVENT_FILE_BASENAME_INFIX};
use crate::types::Run;

/// A log directory on local disk.
pub struct DiskLogdir {
    root: PathBuf,
}

impl DiskLogdir {
    /// Creates a `DiskLogdir` with the given root directory.
    pub fn new(root: PathBuf) -> Self {
        DiskLogdir { root }
    }
}

impl Logdir for DiskLogdir {
    type File = BufReader<File>;

    fn discover(&self) -> io::Result<HashMap<Run, Vec<EventFileBuf>>> {
        let mut run_map: HashMap<Run, Vec<EventFileBuf>> = HashMap::new();
        let walker = WalkDir::new(&self.root)
            .sort_by(|a, b| a.file_name().cmp(b.file_name()))
            .follow_links(true);
        for walkdir_item in walker {
            let dirent = match walkdir_item {
                Ok(dirent) => dirent,
                Err(e) => {
                    // TensorBoard traditionally doesn't complain loudly about non-existent
                    // directories, since the logdir may be created after TensorBoard starts.
                    if e.io_error()
                        .map_or(false, |e| e.kind() == io::ErrorKind::NotFound)
                    {
                        info!("While walking log directory: {}", e);
                    } else {
                        warn!("While walking log directory: {}", e);
                    }
                    continue;
                }
            };
            if !dirent.file_type().is_file() {
                continue;
            }
            let filename = dirent.file_name().to_string_lossy();
            if !filename.contains(EVENT_FILE_BASENAME_INFIX) {
                continue;
            }
            let run_dir = match dirent.path().parent() {
                Some(parent) => parent,
                None => {
                    // I don't know of any circumstance where this can happen, but I would believe
                    // that some weird filesystem can hit it, so just proceed.
                    warn!(
                        "Path {} is a file but has no parent",
                        dirent.path().display()
                    );
                    continue;
                }
            };
            let mut run_relpath = match run_dir.strip_prefix(&self.root) {
                Ok(rp) => rp.to_path_buf(),
                Err(_) => {
                    error!(
                        "Log directory {} is not a prefix of run directory {}",
                        &self.root.display(),
                        &run_dir.display(),
                    );
                    continue;
                }
            };
            // Render the root run as ".", not "".
            if run_relpath == Path::new("") {
                run_relpath.push(".");
            }
            let run = Run(run_relpath.display().to_string());
            run_map
                .entry(run)
                .or_default()
                .push(EventFileBuf(dirent.into_path()));
        }
        Ok(run_map)
    }

    fn open(&self, path: &EventFileBuf) -> io::Result<Self::File> {
        File::open(&path.0).map(BufReader::new)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};

    fn test_in_logdir(logdir: &Path) -> std::io::Result<()> {
        let run_dir = logdir.join("train");
        std::fs::create_dir(&run_dir)?;
        {
            let mut f = File::create(run_dir.join("foo.tfevents.123"))?;
            f.write_all(b"hello")?;
            f.flush()?;
        }

        let disk_logdir = DiskLogdir::new(logdir.to_path_buf());
        let discoveries = disk_logdir.discover()?;
        assert_eq!(discoveries.len(), 1, "{:?}", discoveries);
        let train_event_files = &discoveries[&Run("train".to_string())];
        assert_eq!(train_event_files.len(), 1, "{:?}", train_event_files);

        let mut event_file = disk_logdir.open(&train_event_files[0])?;
        let mut contents = String::new();
        event_file.read_to_string(&mut contents)?;
        assert_eq!(contents, "hello");

        Ok(())
    }

    #[test]
    fn test_absolute() -> std::io::Result<()> {
        let tmpdir = tempfile::tempdir_in(".")?;
        let logdir = tmpdir.path();
        assert!(logdir.is_absolute(), "expected absolute: {:?}", logdir);
        test_in_logdir(logdir)
    }

    #[test]
    fn test_relative() -> std::io::Result<()> {
        let tmpdir = tempfile::tempdir_in(".")?;
        let logdir = tmpdir
            .path()
            .strip_prefix(std::env::current_dir()?)
            .expect("tmpdir not under $PWD");
        assert!(logdir.is_relative(), "expected relative: {:?}", logdir);
        test_in_logdir(logdir)
    }
}
