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

use log::error;
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

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("empty --logdir")]
    EmptyLogdir,
    #[error("unknown protocol {:?} in logdir {}", .protocol, .full_logdir.display())]
    UnknownProtocol {
        protocol: String,
        full_logdir: PathBuf,
    },
    #[error(transparent)]
    GcsClientError(#[from] gcs::ClientError),
}

/// A `--logdir` flag value after parsing but before any impure operations like reading
/// credentials or opening an HTTP client.
#[derive(Debug, PartialEq, Eq)]
enum ParsedLogdir {
    Disk(PathBuf),
    Gcs { bucket: String, prefix: String },
}

impl ParsedLogdir {
    pub fn from_path(path: PathBuf) -> Result<Self, Error> {
        let path_str = path.to_string_lossy();
        if path_str.is_empty() {
            return Err(Error::EmptyLogdir);
        }

        let (protocol, subpath) = match path_str.split_once("://") {
            Some((p, s)) if is_protocol(p) => (p, s),
            // Otherwise, interpret as path on disk.
            _ => return Ok(ParsedLogdir::Disk(path)),
        };
        match protocol {
            "gs" => {
                let (bucket, prefix) = subpath.split_once('/').unwrap_or((subpath, ""));
                let (bucket, prefix) = (bucket.to_string(), prefix.to_string());
                Ok(ParsedLogdir::Gcs { bucket, prefix })
            }
            _ => Err(Error::UnknownProtocol {
                protocol: protocol.to_string(),
                full_logdir: path,
            }),
        }
    }
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
    pub fn new(path: PathBuf) -> Result<Self, Error> {
        match ParsedLogdir::from_path(path)? {
            ParsedLogdir::Disk(path) => Ok(DynLogdir::Disk(DiskLogdir::new(path))),
            ParsedLogdir::Gcs { bucket, prefix } => {
                let client = gcs::Client::new()?;
                let logdir = gcs::Logdir::new(client, bucket, prefix);
                Ok(DynLogdir::Gcs(logdir))
            }
        }
    }
}

/// [RFC 3986, section 3.1][rfc] specifies:
///
/// ```text
/// scheme      = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
/// ```
///
/// [rfc]: https://tools.ietf.org/html/rfc3986#section-3.1
fn is_protocol(s: &str) -> bool {
    if !s.chars().next().map_or(false, |c| c.is_ascii_alphabetic()) {
        return false;
    }
    s.chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-' || c == '.')
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_disk_absolute() {
        let p = PathBuf::from("/path/to/data");
        assert_eq!(
            ParsedLogdir::from_path(p.clone()).unwrap(),
            ParsedLogdir::Disk(p),
        );
    }

    #[test]
    fn test_parse_disk_relative() {
        let p = PathBuf::from("path/to/data");
        assert_eq!(
            ParsedLogdir::from_path(p.clone()).unwrap(),
            ParsedLogdir::Disk(p),
        );
    }

    #[test]
    fn test_parse_disk_unc() {
        let p = PathBuf::from(r#"C:\path\to\data"#);
        assert_eq!(
            ParsedLogdir::from_path(p.clone()).unwrap(),
            ParsedLogdir::Disk(p),
        );
    }

    #[test]
    fn test_parse_colonslashslash_but_not_protocol() {
        let p = PathBuf::from("protocols_cant_have_underscores://hmm");
        assert_eq!(
            ParsedLogdir::from_path(p.clone()).unwrap(),
            ParsedLogdir::Disk(p),
        );
    }

    #[test]
    fn test_parse_gcs_no_prefix() {
        let p = PathBuf::from("gs://tensorboard-bench-logs");
        assert_eq!(
            ParsedLogdir::from_path(p).unwrap(),
            ParsedLogdir::Gcs {
                bucket: "tensorboard-bench-logs".to_string(),
                prefix: "".to_string(),
            },
        );
    }

    #[test]
    fn test_parse_gcs_empty_prefix() {
        let p = PathBuf::from("gs://tensorboard-bench-logs/");
        assert_eq!(
            ParsedLogdir::from_path(p).unwrap(),
            ParsedLogdir::Gcs {
                bucket: "tensorboard-bench-logs".to_string(),
                prefix: "".to_string(),
            },
        );
    }

    #[test]
    fn test_parse_gcs_with_prefix() {
        let p = PathBuf::from("gs://tensorboard-bench-logs/mnist");
        assert_eq!(
            ParsedLogdir::from_path(p).unwrap(),
            ParsedLogdir::Gcs {
                bucket: "tensorboard-bench-logs".to_string(),
                prefix: "mnist".to_string(),
            },
        );
    }

    #[test]
    fn test_parse_empty() {
        match ParsedLogdir::from_path(PathBuf::new()) {
            Err(Error::EmptyLogdir) => (),
            other => panic!("{:?}", other),
        }
    }

    #[test]
    fn test_parse_unknown_protocol() {
        match ParsedLogdir::from_path(PathBuf::from("wat://wot")) {
            Err(Error::UnknownProtocol {
                protocol,
                full_logdir,
            }) if protocol == "wat" && full_logdir == PathBuf::from("wat://wot") => (),
            other => panic!("{:?}", other),
        }
    }
}
