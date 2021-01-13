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

//! Opaque, URL-safe blob keys.

use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::convert::TryFrom;
use std::fmt::Display;
use std::str::FromStr;

use crate::types::Step;

const BASE_64_CONFIG: base64::Config = base64::URL_SAFE_NO_PAD;

/// Unique identifier for a blob.
///
/// Blob keys are returned by the `ReadBlobSequences` RPC, and can be dereferenced via the
/// `ReadBlob` RPC.
///
/// Blob keys implement [`Display`] and [`FromStr`], which should be used for encoding and
/// decoding, respectively. The `Display` format of a blob key is URL-safe.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlobKey<'a> {
    pub experiment_id: Cow<'a, str>,
    pub run: Cow<'a, str>,
    pub tag: Cow<'a, str>,
    pub step: Step,
    pub index: usize,
}

/// Helper struct to encode `BlobKey`s as tuples (rather than objects with named keys) and to use
/// portable integers over the wire.
#[derive(Debug, Serialize, Deserialize)]
struct WireBlobKey<'a>(&'a str, &'a str, &'a str, i64, u64);

/// An error returned when parsing a `BlobKey`.
#[derive(Debug, thiserror::Error)]
pub enum ParseBlobKeyError {
    #[error("invalid base-64: {}", .0)]
    BadBase64(base64::DecodeError),
    #[error("invalid JSON: {}", .0)]
    BadJson(serde_json::Error),
    #[error("index does not fit in memory on this system: {} > {}", .0, usize::MAX)]
    BadIndex(u64),
}

impl<'a> FromStr for BlobKey<'a> {
    type Err = ParseBlobKeyError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let buf = base64::decode_config(s, BASE_64_CONFIG).map_err(ParseBlobKeyError::BadBase64)?;
        let WireBlobKey(experiment_id, run, tag, step, index) =
            serde_json::from_slice(&buf).map_err(ParseBlobKeyError::BadJson)?;
        let index = usize::try_from(index).map_err(|_| ParseBlobKeyError::BadIndex(index))?;
        Ok(BlobKey {
            experiment_id: Cow::Owned(experiment_id.into()),
            run: Cow::Owned(run.into()),
            tag: Cow::Owned(tag.into()),
            step: Step(step),
            index,
        })
    }
}

impl<'a> Display for BlobKey<'a> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        use base64::display::Base64Display;
        let wire = WireBlobKey(
            &self.experiment_id,
            &self.run,
            &self.tag,
            self.step.0,
            self.index as u64,
        );
        let json =
            serde_json::to_string(&wire).expect("wire blob keys should always be serializable");
        Base64Display::with_config(json.as_bytes(), BASE_64_CONFIG).fmt(f)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_roundtrip() {
        let key = BlobKey {
            experiment_id: Cow::Borrowed("123"),
            run: Cow::Owned("mnist".to_string()),
            tag: Cow::Borrowed("input_image"),
            step: Step(777),
            index: 123,
        };
        assert_eq!(key.to_string().parse::<BlobKey>().unwrap(), key);
    }

    #[test]
    fn test_no_padding() {
        for eid_length in 0..10 {
            let key = BlobKey {
                experiment_id: Cow::Owned("x".repeat(eid_length)),
                run: Cow::Borrowed("run"),
                tag: Cow::Borrowed("tag"),
                step: Step(0),
                index: 0,
            };
            let encoded = key.to_string();
            assert!(
                !encoded.ends_with('='),
                "encoded form should not end with '=': {:?} => {:?}",
                key,
                encoded,
            );
        }
    }

    #[test]
    fn test_bad_base64() {
        match "???".parse::<BlobKey>().unwrap_err() {
            ParseBlobKeyError::BadBase64(_) => (),
            other => panic!("expected BadBase64(_), got {:?}", other),
        };
    }

    #[test]
    fn test_bad_json() {
        match "AAAAAA".parse::<BlobKey>().unwrap_err() {
            ParseBlobKeyError::BadJson(_) => (),
            other => panic!("expected BadJson(_), got {:?}", other),
        };
    }
}
