/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

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

//! Loader for many runs under a directory.

<<<<<<< HEAD
use log::warn;
use std::collections::HashMap;
use std::io::{self, Read};
||||||| 3fcdea271
use log::{error, warn};
use std::collections::{HashMap, HashSet};
=======
use log::{error, warn};
use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use std::collections::{HashMap, HashSet};
>>>>>>> 30f6489794ebd15a00edd2e460ed082d7aa15162
use std::path::{Path, PathBuf};

use crate::commit::Commit;
use crate::run::RunLoader;
use crate::types::Run;

<<<<<<< HEAD
/// A TensorBoard log directory, with event files organized into runs.
pub trait Logdir {
    /// Type of output stream for reading event files under this log directory.
    type File: Read;
||||||| 3fcdea271
/// A loader for a log directory, connecting a filesystem to a [`Commit`] via [`RunLoader`]s.
pub struct LogdirLoader<'a> {
    commit: &'a Commit,
    logdir: PathBuf,
    runs: HashMap<Run, RunState>,
    checksum: bool,
}
=======
/// A loader for a log directory, connecting a filesystem to a [`Commit`] via [`RunLoader`]s.
pub struct LogdirLoader<'a> {
    thread_pool: rayon::ThreadPool,
    commit: &'a Commit,
    logdir: PathBuf,
    runs: HashMap<Run, RunState>,
    checksum: bool,
}
>>>>>>> 30f6489794ebd15a00edd2e460ed082d7aa15162

    /// Finds all event files under the log directory.
    ///
    /// Event files within each run should be emitted in chronological order. Canonically, a file
    /// is an event file if its basename contains [`EVENT_FILE_BASENAME_INFIX`] as a substring.
    fn discover(&self) -> io::Result<HashMap<Run, Vec<PathBuf>>>;

    /// Attempts to open an event file for reading.
    ///
    /// The `path` should be one of the values returned by a previous call to [`Self::discover`].
    fn open(&self, path: &Path) -> io::Result<Self::File>;
}

/// A file is treated as an event file if its basename contains this substring.
pub const EVENT_FILE_BASENAME_INFIX: &str = "tfevents";

/// A loader for a log directory, connecting a filesystem to a [`Commit`] via [`RunLoader`]s.
pub struct LogdirLoader<'a, L: Logdir> {
    commit: &'a Commit,
    logdir: L,
    runs: HashMap<Run, RunLoader<<L as Logdir>::File>>,
    checksum: bool,
}

type Discoveries = HashMap<Run, Vec<PathBuf>>;

impl<'a, L: Logdir> LogdirLoader<'a, L> {
    /// Creates a new, empty logdir loader. Does not load any data.
<<<<<<< HEAD
    pub fn new(commit: &'a Commit, logdir: L) -> Self {
||||||| 3fcdea271
    pub fn new(commit: &'a Commit, logdir: PathBuf) -> Self {
=======
    ///
    /// This constructor is heavyweight: it builds a new thread-pool. The thread pool will be
    /// reused for all calls to [`Self::reload`]. If `reload_threads` is `0`, the number of threads
    /// will be determined automatically, per [`rayon`] semantics.
    ///
    /// # Panics
    ///
    /// If [`rayon::ThreadPoolBuilder::build`] returns an error; should only happen if there is a
    /// failure to create threads at the OS level.
    pub fn new(commit: &'a Commit, logdir: PathBuf, reload_threads: usize) -> Self {
        let thread_pool = rayon::ThreadPoolBuilder::new()
            .num_threads(reload_threads)
            .thread_name(|i| format!("Reloader-{:03}", i))
            .build()
            .expect("failed to construct Rayon thread pool");
>>>>>>> 30f6489794ebd15a00edd2e460ed082d7aa15162
        LogdirLoader {
            thread_pool,
            commit,
            logdir,
            runs: HashMap::new(),
            checksum: true,
        }
    }

    /// Sets whether to compute checksums for records before parsing them as protos.
    pub fn checksum(&mut self, yes: bool) {
        self.checksum = yes;
    }

    /// Performs a complete load cycle: finds all event files and reads data from all runs,
    /// updating the shared commit.
    ///
    /// If any of the commit locks is poisoned, or if a run is removed from the commit by another
    /// client while this reload is in progress (should not happen if the commit is only being
    /// updated by a single `LogdirLoader`).
    pub fn reload(&mut self) {
        let discoveries = self.discover();
        self.synchronize_runs(&discoveries);
        self.load_runs(discoveries);
    }

    /// Finds all event files under the log directory and groups them by run.
    fn discover(&self) -> Discoveries {
        self.logdir.discover().unwrap_or_else(|e| {
            warn!("While loading log directory: {}", e);
            Default::default()
        })
    }

    /// Updates `self.runs` by adding new runs and removing runs all of whose event files have been
    /// deleted, and updates `commit.runs` to have the same keyset as `self.runs`.
    ///
    /// # Panics
    ///
    /// Panics if the `commit.runs` lock is poisoned.
    fn synchronize_runs(&mut self, discoveries: &Discoveries) {
        // Remove runs with no event files. (This could be cleaner and more efficient with
        // `HashMap::drain_filter`, but that's not yet stabilized.)
        let mut removed: Vec<Run> = Vec::new();
        self.runs.retain(|run, _| {
            if discoveries.get(run).map_or(false, |fs| !fs.is_empty()) {
                true
            } else {
                removed.push(run.clone());
                false
            }
        });
        // Determine which runs need to be added (we'll add them later).
        let added: Vec<&Run> = discoveries
            .keys()
            .filter(|k| !self.runs.contains_key(*k))
            .collect();

        // Synchronize to the commit.
        if !removed.is_empty() || !added.is_empty() {
            let mut runs_store = self
                .commit
                .runs
                .write()
                .expect("failed to write-lock runs map");
            for run in &removed {
                runs_store.remove(run);
            }
            for run in added {
                runs_store.insert(run.clone(), Default::default());
            }
        }

        // Add new runs.
        for run_name in discoveries.keys() {
            let checksum = self.checksum;
            self.runs.entry(run_name.clone()).or_insert_with(|| {
                let mut loader = RunLoader::new(run_name.clone());
                loader.checksum(checksum);
                loader
            });
        }
    }

    /// Tells all run loaders to reload data with the given filenames, and blocks until completion.
    ///
    /// # Panics
    ///
    /// Panics if a run in `self.runs` has no entry in `discoveries`, which should only happen if
    /// `synchronize_runs(&discoveries)` was not called. Panics if any run loader panics.
    fn load_runs(&mut self, mut discoveries: Discoveries) {
        let commit_runs = self
            .commit
            .runs
            .read()
            .expect("could not acquire runs.data");
<<<<<<< HEAD
        for (run, loader) in self.runs.iter_mut() {
            let filenames = discoveries
||||||| 3fcdea271
        for (run, run_state) in self.runs.iter_mut() {
            let event_files = discoveries
=======

        let mut work_items = Vec::new();
        for (run, run_state) in self.runs.iter_mut() {
            let event_files = discoveries
>>>>>>> 30f6489794ebd15a00edd2e460ed082d7aa15162
                .remove(run)
                .unwrap_or_else(|| panic!("run in self.runs but not discovered: {:?}", run));
<<<<<<< HEAD
            loader.reload(
                &self.logdir,
                filenames,
                commit_runs.get(run).unwrap_or_else(|| {
                    panic!(
                        "run in self.runs but not in commit.runs \
||||||| 3fcdea271
            let filenames: Vec<PathBuf> = event_files.into_iter().map(|d| d.event_file).collect();
            run_state.loader.reload(
                filenames,
                commit_runs.get(run).unwrap_or_else(|| {
                    panic!(
                        "run in self.runs but not in commit.runs \
=======
            let filenames: Vec<PathBuf> = event_files.into_iter().map(|d| d.event_file).collect();
            let run_data = commit_runs.get(run).unwrap_or_else(|| {
                panic!(
                    "run in self.runs but not in commit.runs \
>>>>>>> 30f6489794ebd15a00edd2e460ed082d7aa15162
                        (is another client mutating this commit?): {:?}",
                    run
                )
            });
            work_items.push((&mut run_state.loader, filenames, run_data));
        }
        self.thread_pool.install(|| {
            work_items
                .into_par_iter()
                .for_each(|(loader, filenames, run_data)| loader.reload(filenames, run_data));
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;
    use std::fs::{self, File};

    use crate::disk_logdir::DiskLogdir;
    use crate::types::{Step, Tag, WallTime};
    use crate::writer::SummaryWriteExt;

    #[test]
    fn test_basic() -> Result<(), Box<dyn std::error::Error>> {
        let logdir = tempfile::tempdir()?;
        let train_dir = logdir.path().join("mnist").join("train");
        let test_dir = logdir.path().join("mnist").join("test");
        fs::create_dir_all(&train_dir)?;
        fs::create_dir_all(&test_dir)?;
        fs::create_dir_all(logdir.path().join("non_run"))?;

        let tag = Tag("accuracy".to_string());

        let mut root_file = File::create(logdir.path().join("tfevents.123"))?;
        root_file.write_scalar(&tag, Step(0), WallTime::new(1234.0).unwrap(), 0.75)?;
        root_file.write_scalar(&tag, Step(1), WallTime::new(1235.0).unwrap(), 0.875)?;
        root_file.sync_all()?;
        drop(root_file);

        let mut train_file1 = File::create(train_dir.join("tfevents.234"))?;
        train_file1.write_scalar(&tag, Step(4), WallTime::new(2234.0).unwrap(), 0.125)?;
        train_file1.write_scalar(&tag, Step(5), WallTime::new(2235.0).unwrap(), 0.25)?;
        train_file1.sync_all()?;
        drop(train_file1);

        let mut train_file2 = File::create(train_dir.join("tfevents.345"))?;
        train_file2.write_scalar(&tag, Step(6), WallTime::new(2236.0).unwrap(), 0.375)?;
        train_file2.sync_all()?;
        drop(train_file2);

        let mut test_file = File::create(test_dir.join("tfevents.456"))?;
        test_file.write_scalar(&tag, Step(8), WallTime::new(3456.0).unwrap(), 0.5)?;
        test_file.sync_all()?;
        drop(test_file);

        // decoy file
        File::create(logdir.path().join("non_run").join("non_event_file"))?;

        // expected run names
        let root_run = Run(".".to_string());
        let train_run = Run(format!("mnist{}train", std::path::MAIN_SEPARATOR));
        let test_run = Run(format!("mnist{}test", std::path::MAIN_SEPARATOR));

        let commit = Commit::new();
<<<<<<< HEAD
        let logdir = DiskLogdir::new(logdir.path().to_path_buf());
        let mut loader = LogdirLoader::new(&commit, logdir);
||||||| 3fcdea271
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf());
=======
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf(), 1);
>>>>>>> 30f6489794ebd15a00edd2e460ed082d7aa15162

        // Check that we persist the right run states in the loader.
        loader.reload();
        let expected_runs = vec![&root_run, &train_run, &test_run]
            .into_iter()
            .collect::<HashSet<_>>();
        assert_eq!(loader.runs.keys().collect::<HashSet<_>>(), expected_runs);

        // Check that we persist the right run states in the commit.
        let mut expected_data = HashMap::new();
        expected_data.insert(&root_run, vec![0.75, 0.875]);
        expected_data.insert(&train_run, vec![0.125, 0.25, 0.375]);
        expected_data.insert(&test_run, vec![0.5]);
        assert_eq!(
            commit
                .runs
                .read()
                .unwrap()
                .iter()
                .map(|(run, data)| {
                    let values = data.read().unwrap().scalars[&tag]
                        .valid_values()
                        .map(|(_step, _wall_time, value)| value.0)
                        .collect();
                    (run, values)
                })
                .collect::<HashMap<&Run, Vec<f32>>>(),
            expected_data
        );

        Ok(())
    }

    #[test]
    fn test_add_remove() -> Result<(), Box<dyn std::error::Error>> {
        let logdir = tempfile::tempdir()?;
        let train_dir = logdir.path().join("train");
        let test_dir = logdir.path().join("test");
        let val_dir = logdir.path().join("val");

        // Start with just train and test.
        fs::create_dir(&train_dir)?;
        fs::create_dir(&test_dir)?;
        File::create(train_dir.join(EVENT_FILE_BASENAME_INFIX))?;
        // Write an event to "test" to make sure that it doesn't get dropped across loads.
        File::create(test_dir.join(EVENT_FILE_BASENAME_INFIX))?.write_scalar(
            &Tag("accuracy".to_string()),
            Step(7),
            WallTime::new(1234.5).unwrap(),
            0.75,
        )?;

        let commit = Commit::new();
<<<<<<< HEAD
        let logdir = DiskLogdir::new(logdir.path().to_path_buf());
        let mut loader = LogdirLoader::new(&commit, logdir);
||||||| 3fcdea271
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf());
=======
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf(), 1);
>>>>>>> 30f6489794ebd15a00edd2e460ed082d7aa15162

        let get_run_names = || {
            let runs_store = commit.runs.read().unwrap();
            let mut result = runs_store
                .keys()
                .map(|Run(name)| name.clone())
                .collect::<Vec<String>>();
            result.sort();
            result
        };
        let get_test_scalar = || {
            let runs_store = commit.runs.read().unwrap();
            let run_data = runs_store.get(&Run("test".to_string()))?.read().unwrap();
            let first_point = run_data.scalars[&Tag("accuracy".to_string())]
                .valid_values()
                .map(|(_step, _wall_time, &value)| value.0)
                .next();
            first_point
        };

        assert_eq!(get_test_scalar(), None);
        loader.reload();
        assert_eq!(get_run_names(), vec!["test", "train"]);
        assert_eq!(get_test_scalar(), Some(0.75));

        // Add val, remove train.
        fs::create_dir(&val_dir)?;
        File::create(val_dir.join(EVENT_FILE_BASENAME_INFIX))?;
        fs::remove_file(train_dir.join(EVENT_FILE_BASENAME_INFIX))?;
        fs::remove_dir(&train_dir)?;

        loader.reload();
        assert_eq!(get_run_names(), vec!["test", "val"]);
        assert_eq!(get_test_scalar(), Some(0.75));

        Ok(())
    }

<<<<<<< HEAD
||||||| 3fcdea271
    #[cfg(target_os = "linux")] // macOS seems to sometimes give EILSEQ on non-UTF-8 filenames
    #[test]
    fn test_bad_unicode_collision() -> Result<(), Box<dyn std::error::Error>> {
        use std::ffi::OsStr;
        use std::os::unix::ffi::OsStrExt;

        // Generate a bad-Unicode collision.
        let bad1 = Path::new(OsStr::from_bytes(&b"test\x99.run"[..]));
        let bad2 = Path::new(OsStr::from_bytes(&b"test\xee.run"[..]));
        let run1 = Run(bad1.to_string_lossy().into_owned());
        let run2 = Run(bad2.to_string_lossy().into_owned());
        assert_ne!(bad1, bad2);
        assert_eq!(run1, run2);
        let run = run1;
        drop(run2);

        let logdir = tempfile::tempdir()?;
        for &dir_basename in &[bad1, bad2] {
            let dir = logdir.path().join(dir_basename);
            fs::create_dir(&dir)?;
            File::create(dir.join(EVENT_FILE_BASENAME_INFIX))?;
        }

        let commit = Commit::new();
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf());
        loader.reload();

        assert_eq!(loader.runs.keys().collect::<Vec<_>>(), vec![&run]);
        let run_state = &loader.runs[&run];
        assert!(bad1 < bad2);
        assert_eq!(run_state.relpath, bad1);
        let mut expected_relpaths = HashSet::new();
        expected_relpaths.insert(bad2.to_path_buf());
        assert_eq!(run_state.collided_relpaths, expected_relpaths);

        Ok(())
    }

=======
    #[cfg(target_os = "linux")] // macOS seems to sometimes give EILSEQ on non-UTF-8 filenames
    #[test]
    fn test_bad_unicode_collision() -> Result<(), Box<dyn std::error::Error>> {
        use std::ffi::OsStr;
        use std::os::unix::ffi::OsStrExt;

        // Generate a bad-Unicode collision.
        let bad1 = Path::new(OsStr::from_bytes(&b"test\x99.run"[..]));
        let bad2 = Path::new(OsStr::from_bytes(&b"test\xee.run"[..]));
        let run1 = Run(bad1.to_string_lossy().into_owned());
        let run2 = Run(bad2.to_string_lossy().into_owned());
        assert_ne!(bad1, bad2);
        assert_eq!(run1, run2);
        let run = run1;
        drop(run2);

        let logdir = tempfile::tempdir()?;
        for &dir_basename in &[bad1, bad2] {
            let dir = logdir.path().join(dir_basename);
            fs::create_dir(&dir)?;
            File::create(dir.join(EVENT_FILE_BASENAME_INFIX))?;
        }

        let commit = Commit::new();
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf(), 1);
        loader.reload();

        assert_eq!(loader.runs.keys().collect::<Vec<_>>(), vec![&run]);
        let run_state = &loader.runs[&run];
        assert!(bad1 < bad2);
        assert_eq!(run_state.relpath, bad1);
        let mut expected_relpaths = HashSet::new();
        expected_relpaths.insert(bad2.to_path_buf());
        assert_eq!(run_state.collided_relpaths, expected_relpaths);

        Ok(())
    }

>>>>>>> 30f6489794ebd15a00edd2e460ed082d7aa15162
    #[cfg(unix)]
    #[test]
    fn test_symlink() -> Result<(), Box<dyn std::error::Error>> {
        let logdir = tempfile::tempdir()?;
        let train_dir = logdir.path().join("train");
        let test_dir = logdir.path().join("test");
        fs::create_dir(&train_dir)?;
        std::os::unix::fs::symlink(&train_dir, &test_dir)?;
        File::create(train_dir.join(EVENT_FILE_BASENAME_INFIX))?;

        let commit = Commit::new();
<<<<<<< HEAD
        let logdir = DiskLogdir::new(logdir.path().to_path_buf());
        let mut loader = LogdirLoader::new(&commit, logdir);
||||||| 3fcdea271
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf());
=======
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf(), 1);
>>>>>>> 30f6489794ebd15a00edd2e460ed082d7aa15162
        loader.reload();

        assert_eq!(
            loader.runs.keys().collect::<HashSet<_>>(),
            vec![&Run("test".to_string()), &Run("train".to_string())]
                .into_iter()
                .collect::<HashSet<_>>(),
        );
        Ok(())
    }

    #[cfg(unix)]
    #[test]
    fn test_symlink_loop() -> Result<(), Box<dyn std::error::Error>> {
        let logdir = tempfile::tempdir()?;
        let dir1 = logdir.path().join("dir1");
        let dir2 = logdir.path().join("dir2");
        std::os::unix::fs::symlink(&dir1, &dir2)?;
        std::os::unix::fs::symlink(&dir2, &dir1)?;

        let commit = Commit::new();
<<<<<<< HEAD
        let logdir = DiskLogdir::new(logdir.path().to_path_buf());
        let mut loader = LogdirLoader::new(&commit, logdir);
||||||| 3fcdea271
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf());
=======
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf(), 1);
>>>>>>> 30f6489794ebd15a00edd2e460ed082d7aa15162
        loader.reload(); // should not hang
        Ok(())
    }
}
