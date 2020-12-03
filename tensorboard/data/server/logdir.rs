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

use log::{error, warn};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::commit::Commit;
use crate::run::RunLoader;
use crate::types::Run;

/// A loader for a log directory, connecting a filesystem to a [`Commit`] via [`RunLoader`]s.
pub struct LogdirLoader<'a> {
    commit: &'a Commit,
    logdir: PathBuf,
    runs: HashMap<Run, RunState>,
}

struct RunState {
    /// Stateful loader for this run.
    loader: RunLoader,
    /// Path to this run's directory relative to the root logdir.
    relpath: PathBuf,
    /// Logdir-relative paths to other directories that normalize to the same name as this run
    /// after lossy Unicode conversion.
    ///
    /// Directories on the filesystem need not be valid Unicode. On Unix, for instance, they're
    /// arbitrary byte sequences without `\0` or `/`. But TensorBoard wants run names to be strings
    /// for human display. Thus, we apply [`OsStr::to_string_lossy`] to convert run directory paths
    /// to run names. As the name suggests, this is a lossy conversion: it replaces non-Unicode
    /// sequences with U+FFFD. This creates an edge case wherein two different directories may map
    /// to the same run name. In such a case, we merge the two directories into one run, and print
    /// a warning.
    ///
    /// This set tracks the directories other than `self.relpath` that comprise this run. It is
    /// non-empty only when we hit this edge case: i.e., when there are multiple filesystem paths
    /// that are invalid Unicode and collide. It's used for deduplicating warnings, so that we
    /// don't warn about the directory again on every load cycle.
    ///
    /// [`OsStr::to_string_lossy`]: std::ffi::OsStr::to_string_lossy
    collided_relpaths: HashSet<PathBuf>,
}

/// Record of an event file found under the log directory.
#[derive(Debug, PartialEq, Eq)]
struct EventFileDiscovery {
    run_relpath: PathBuf,
    event_file: PathBuf,
}
/// Record of all event files found under the log directory, grouped by run.
///
/// Each value in the map must be non-empty.
///
/// Not all `run_relpaths` within one `Vec<_>` value need be the same due to lossy paths. See the
/// `collided_relpaths` field of [`RunState`] for details.
struct Discoveries(HashMap<Run, Vec<EventFileDiscovery>>);

/// A file is treated as an event file if its basename contains this substring.
const EVENT_FILE_BASENAME_INFIX: &str = "tfevents";

impl<'a> LogdirLoader<'a> {
    /// Creates a new, empty logdir loader. Does not load any data.
    pub fn new(commit: &'a Commit, logdir: PathBuf) -> Self {
        LogdirLoader {
            commit,
            logdir,
            runs: HashMap::new(),
        }
    }

    /// Performs a complete load cycle: finds all event files and reads data from all runs,
    /// updating the shared commit.
    ///
    /// # Panics
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
        let mut run_map: HashMap<Run, Vec<EventFileDiscovery>> = HashMap::new();
        let walker = WalkDir::new(&self.logdir)
            .sort_by(|a, b| a.file_name().cmp(b.file_name()))
            .follow_links(true);
        for walkdir_item in walker {
            let dirent = match walkdir_item {
                Ok(dirent) => dirent,
                Err(e) => {
                    error!("While walking log directory: {}", e);
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
            let mut run_relpath = match run_dir.strip_prefix(&self.logdir) {
                Ok(rp) => rp.to_path_buf(),
                Err(_) => {
                    error!(
                        "Log directory {} is not a prefix of run directory {}",
                        &self.logdir.display(),
                        &run_dir.display(),
                    );
                    continue;
                }
            };
            // Render the root run as ".", not "".
            if run_relpath == Path::new("") {
                run_relpath.push(".");
            }
            let run_name = run_relpath.display().to_string();
            let discovery = EventFileDiscovery {
                run_relpath,
                event_file: dirent.into_path(),
            };
            run_map.entry(Run(run_name)).or_default().push(discovery);
        }
        Discoveries(run_map)
    }

    /// Updates `self.runs` by adding new runs and removing runs all of whose event files have been
    /// deleted, and updates `commit.runs` to have the same keyset as `self.runs`.
    ///
    /// # Panics
    ///
    /// Panics if the `commit.runs` lock is poisoned.
    fn synchronize_runs(&mut self, discoveries: &Discoveries) {
        let discoveries = &discoveries.0;

        // Remove runs with no event files. (This could be cleaner and more efficient with
        // `HashMap::drain_filter`, but that's not yet stabilized.)
        let mut removed: Vec<Run> = Vec::new();
        self.runs.retain(|run, _| {
            if discoveries.contains_key(run) {
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

        // Add new runs, and warn on any path collisions for existing runs.
        for (run_name, event_files) in discoveries {
            let run = self
                .runs
                .entry(run_name.clone())
                .or_insert_with(|| RunState {
                    // Values of `discoveries` are non-empty by construction, so it's safe to take the
                    // first relpath.
                    relpath: event_files[0].run_relpath.clone(),
                    loader: RunLoader::new(),
                    collided_relpaths: HashSet::new(),
                });
            for ef in event_files {
                if ef.run_relpath != run.relpath && !run.collided_relpaths.contains(&ef.run_relpath)
                {
                    warn!(
                        "Merging directories {:?} and {:?}, which both normalize to run {:?}",
                        run.relpath, ef.run_relpath, run_name.0
                    );
                    run.collided_relpaths.insert(ef.run_relpath.clone()); // don't warn again
                }
            }
        }
    }

    /// Tells all run loaders to reload data with the given filenames, and blocks until completion.
    ///
    /// # Panics
    ///
    /// Panics if a run in `self.runs` has no entry in `discoveries`, which should only happen if
    /// `synchronize_runs(&discoveries)` was not called. Panics if any run loader panics.
    fn load_runs(&mut self, discoveries: Discoveries) {
        let mut discoveries = discoveries.0;
        let commit_runs = self
            .commit
            .runs
            .read()
            .expect("could not acquire runs.data");
        for (run, run_state) in self.runs.iter_mut() {
            let event_files = discoveries
                .remove(run)
                .unwrap_or_else(|| panic!("run in self.runs but not discovered: {:?}", run));
            let filenames: Vec<PathBuf> = event_files.into_iter().map(|d| d.event_file).collect();
            run_state.loader.reload(
                filenames,
                commit_runs.get(run).unwrap_or_else(|| {
                    panic!(
                        "run in self.runs but not in commit.runs \
                        (is another client mutating this commit?): {:?}",
                        run
                    )
                }),
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::OsStr;
    use std::fs::{self, File};

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
        // expected logdir-relative paths
        let root_relpath: PathBuf = ["."].iter().collect();
        let train_relpath: PathBuf = ["mnist", "train"].iter().collect();
        let test_relpath: PathBuf = ["mnist", "test"].iter().collect();

        let commit = Commit::new();
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf());

        // Check that we persist the right run states in the loader.
        loader.reload();
        let expected_runs = vec![&root_run, &train_run, &test_run]
            .into_iter()
            .collect::<HashSet<_>>();
        assert_eq!(loader.runs.keys().collect::<HashSet<_>>(), expected_runs);
        assert_eq!(&loader.runs[&root_run].relpath, &root_relpath);
        assert_eq!(&loader.runs[&train_run].relpath, &train_relpath);
        assert_eq!(&loader.runs[&test_run].relpath, &test_relpath);
        for run_state in loader.runs.values() {
            assert!(run_state.collided_relpaths.is_empty()); // no bad Unicode
        }

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
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf());

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
                .nth(0);
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

    #[cfg(unix)]
    #[test]
    fn test_bad_unicode_collision() -> Result<(), Box<dyn std::error::Error>> {
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
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf());
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
        let mut loader = LogdirLoader::new(&commit, logdir.path().to_path_buf());
        loader.reload(); // should not hang
        Ok(())
    }
}
