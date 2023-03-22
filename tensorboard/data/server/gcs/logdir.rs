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

//! Adapter from GCS to TensorBoard logdirs.

use log::warn;
use reqwest::StatusCode;
use std::collections::HashMap;
use std::env;
use std::io::{self, BufReader, Read};
use std::path::{Path, PathBuf};

use super::Client;
use crate::logdir::{EventFileBuf, EVENT_FILE_BASENAME_INFIX};
use crate::types::Run;

/// A reference to a GCS object with a read offset.
pub struct File {
    gcs: Client,
    bucket: String,
    object: String,
    pos: u64,
}

impl File {
    fn new(gcs: Client, bucket: String, object: String) -> Self {
        Self {
            gcs,
            bucket,
            object,
            pos: 0,
        }
    }
}

fn reqwest_to_io_error(e: reqwest::Error) -> io::Error {
    let kind = match e.status() {
        Some(StatusCode::NOT_FOUND) => io::ErrorKind::NotFound,
        Some(StatusCode::FORBIDDEN) => io::ErrorKind::PermissionDenied,
        Some(StatusCode::UNAUTHORIZED) => io::ErrorKind::PermissionDenied,
        Some(StatusCode::REQUEST_TIMEOUT) => io::ErrorKind::TimedOut,
        _ if e.is_timeout() => io::ErrorKind::TimedOut,
        _ if e.is_decode() => io::ErrorKind::InvalidData,
        _ => io::ErrorKind::Other,
    };
    io::Error::new(kind, e)
}

impl Read for File {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        if buf.is_empty() {
            return Ok(0);
        }
        let range = self.pos..=self.pos + (buf.len() as u64 - 1);
        let result = self
            .gcs
            .read(&self.bucket, &self.object, range)
            .map_err(reqwest_to_io_error)?;
        buf[0..result.len()].copy_from_slice(&result);
        self.pos += result.len() as u64;
        Ok(result.len())
    }
}

pub struct Logdir {
    gcs: Client,
    bucket: String,
    /// Invariant: `prefix` either is empty or ends with `/`, and thus an event file name should be
    /// joined onto `prefix` to form its full object name.
    prefix: String,
    /// Size of the opened file read buffer (in Kb) when reading from GCS.
    /// The `gcs::Logdir::new` will attempt to fetch the `TB_GCS_BUFFER_SIZE_KB` environment
    /// variable that represent the read buffer size (in Kb) for each TF events file.
    /// Note: if reading a large number of TF events files, set an appropriate value for
    /// `buffer_capacity` to prevent running out of memory. This determines the total size of the
    /// allocated memory.
    /// The default value is defined by the `DEFAULT_BUFFER_CAPACITY_KB` constant.
    buffer_capacity: usize,
}

/// Default size of the GCS file read buffer (in Kb).
/// Read large chunks from GCS to reduce network roundtrips.
const DEFAULT_BUFFER_CAPACITY_KB: usize = 1024 * 16;

impl Logdir {
    pub fn new(gcs: Client, bucket: String, mut prefix: String) -> Self {
        if !prefix.is_empty() && !prefix.ends_with('/') {
            prefix.push('/');
        }
        // convert the Kb buffer size to bytes
        let buffer_capacity = match env::var("TB_GCS_BUFFER_SIZE_KB") {
            Ok(val) => {
                val.parse::<usize>()
                    .ok()
                    .unwrap_or(DEFAULT_BUFFER_CAPACITY_KB)
                    * 1024
            }
            Err(_) => DEFAULT_BUFFER_CAPACITY_KB * 1024,
        };

        Self {
            gcs,
            bucket,
            prefix,
            buffer_capacity,
        }
    }
}

impl crate::logdir::Logdir for Logdir {
    type File = BufReader<File>;

    fn discover(&self) -> io::Result<HashMap<Run, Vec<EventFileBuf>>> {
        let res = self.gcs.list(&self.bucket, &self.prefix);
        let objects = res.map_err(reqwest_to_io_error)?;
        let mut run_map: HashMap<Run, Vec<EventFileBuf>> = HashMap::new();
        for name in objects {
            let name = match name.strip_prefix(&self.prefix) {
                Some(x) => x,
                None => {
                    warn!(
                        "Unexpected object name {:?} with putative prefix {:?}",
                        &name, &self.prefix
                    );
                    continue;
                }
            };
            let path = PathBuf::from(name);
            let is_event_file = path.file_name().map_or(false, |n| {
                n.to_string_lossy().contains(EVENT_FILE_BASENAME_INFIX)
            });
            if !is_event_file {
                continue;
            }
            let mut run_relpath = path
                .parent()
                .map(Path::to_path_buf)
                .unwrap_or_else(PathBuf::new);
            if run_relpath == Path::new("") {
                run_relpath.push(".");
            }
            let run = Run(run_relpath.display().to_string());
            run_map.entry(run).or_default().push(EventFileBuf(path));
        }
        Ok(run_map)
    }

    fn open(&self, path: &EventFileBuf) -> io::Result<Self::File> {
        // Paths as returned by `discover` are always valid Unicode.
        let mut object = self.prefix.clone();
        object.push_str(path.0.to_string_lossy().as_ref());
        let file = File::new(self.gcs.clone(), self.bucket.clone(), object);
        Ok(BufReader::with_capacity(self.buffer_capacity, file))
    }
}
