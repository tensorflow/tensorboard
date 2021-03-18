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

//! Log directory as specified by user arguments.

use log::{error, warn};
use std::collections::HashMap;
use std::io::{self, Read};
use std::path::PathBuf;

use crate::disk_logdir::DiskLogdir;
use crate::gcs;
use crate::logdir::{EventFileBuf, Logdir};
use crate::types::Run;

/// A logdir dynamically dispatched over supported implementations.
pub enum DynLogdir {
    Disk(DiskLogdir),
    Gcs(gcs::Logdir),
}

/// A file from any one of [`DynLogdir`]'s underlying implementations.
pub enum DynFile {
    Disk(<DiskLogdir as Logdir>::File),
    Gcs(<gcs::Logdir as Logdir>::File),
}

impl DynLogdir {
    /// Parses a `DynLogdir` from a user-supplied path.
    ///
    /// This succeeds unless the path represents a GCS logdir and no HTTP client can be opened. In
    /// case of failure, errors will be logged to the active logger.
    ///
    /// This constructor is heavyweight; it may construct an HTTP client and read a GCS credentials
    /// file from disk.
    ///
    /// # Panics
    ///
    /// May panic in debug mode if called from a thread with an active Tokio runtime; see
    /// [seanmonstar/reqwest#1017].
    ///
    /// [seanmonstar/reqwest#1017]: https://github.com/seanmonstar/reqwest/issues/1017
    pub fn new(path: PathBuf) -> Option<Self> {
        let path_str = path.to_string_lossy();
        let gcs_path = match path_str.strip_prefix("gs://") {
            // Assume that anything not starting with `gs://` is a path on disk.
            None => return Some(DynLogdir::Disk(DiskLogdir::new(path))),
            Some(p) => p,
        };
        let mut parts = gcs_path.splitn(2, '/');
        let bucket = parts.next().unwrap().to_string(); // splitn always yields at least one element
        let prefix = parts.next().unwrap_or("").to_string();
        let creds = gcs::Credentials::from_disk().unwrap_or_else(|e| {
            warn!("Using anonymous GCS credentials: {}", e);
            Default::default()
        });
        let client = match gcs::Client::new(creds) {
            Err(e) => {
                error!("Could not open GCS connection: {}", e);
                return None;
            }
            Ok(c) => c,
        };
        Some(DynLogdir::Gcs(gcs::Logdir::new(client, bucket, prefix)))
    }
}

impl crate::logdir::Logdir for DynLogdir {
    type File = DynFile;

    fn discover(&self) -> io::Result<HashMap<Run, Vec<EventFileBuf>>> {
        match self {
            Self::Disk(x) => x.discover(),
            Self::Gcs(x) => x.discover(),
        }
    }

    fn open(&self, path: &EventFileBuf) -> io::Result<Self::File> {
        match self {
            Self::Disk(x) => x.open(path).map(DynFile::Disk),
            Self::Gcs(x) => x.open(path).map(DynFile::Gcs),
        }
    }
}

impl Read for DynFile {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        match self {
            Self::Disk(x) => x.read(buf),
            Self::Gcs(x) => x.read(buf),
        }
    }
}
