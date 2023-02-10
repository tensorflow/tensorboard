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

//! Core simple types.

use std::borrow::Borrow;
use std::collections::HashMap;
use std::str::FromStr;

use crate::reservoir::Capacity;

/// A step associated with a record, strictly increasing over time within a record stream.
#[derive(Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Copy, Clone)]
pub struct Step(pub i64);

impl From<Step> for i64 {
    fn from(step: Step) -> i64 {
        step.0
    }
}

/// The wall time of a TensorBoard event.
///
/// Wall times represent floating-point seconds since Unix epoch. They must be finite and non-NaN.
#[derive(Debug, PartialEq, PartialOrd, Copy, Clone)]
pub struct WallTime(f64);

impl WallTime {
    /// Parses a wall time from a time stamp representing seconds since Unix epoch.
    ///
    /// Returns `None` if the given time is infinite or NaN.
    pub fn new(time: f64) -> Option<Self> {
        if time.is_finite() {
            Some(WallTime(time))
        } else {
            None
        }
    }
}

// Wall times are totally ordered and have a total equivalence relation, since we guarantee that
// they are not NaN.
#[allow(clippy::derive_ord_xor_partial_ord)] // okay because it agrees with `PartialOrd` impl
impl Ord for WallTime {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.partial_cmp(other)
            .unwrap_or_else(|| unreachable!("{:?} <> {:?}", &self, &other))
    }
}
impl Eq for WallTime {}

impl From<WallTime> for f64 {
    fn from(wt: WallTime) -> f64 {
        wt.0
    }
}

/// The name of a time series within the context of a run.
///
/// Tag names are valid Unicode text strings. They should be non-empty, though this type does not
/// enforce that.
#[derive(Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Clone)]
pub struct Tag(pub String);

impl Borrow<str> for Tag {
    fn borrow(&self) -> &str {
        &self.0
    }
}

/// The name of a TensorBoard run.
///
/// Run names are derived from directory names relative to the logdir, but are lossily converted to
/// valid Unicode strings.
#[derive(Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Clone)]
pub struct Run(pub String);

impl Borrow<str> for Run {
    fn borrow(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ParsePluginSamplingHintError {
    #[error("hint components should be of the form `plugin=num_samples`, but found {part:?}")]
    SyntaxError { part: String },
    #[error(transparent)]
    ParseIntError(#[from] std::num::ParseIntError),
}

/// A map defining how many samples per plugin to keep.
#[derive(Debug, Default)]
pub struct PluginSamplingHint(pub HashMap<String, Capacity>);

impl FromStr for PluginSamplingHint {
    type Err = ParsePluginSamplingHintError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let mut result = HashMap::new();
        if s.is_empty() {
            return Ok(PluginSamplingHint(result));
        }
        for pair_str in s.split(',') {
            let pair: Vec<_> = pair_str.split('=').collect();
            if pair.len() != 2 || pair[0].is_empty() {
                return Err(ParsePluginSamplingHintError::SyntaxError {
                    part: pair_str.to_string(),
                });
            }
            let plugin_name: String = pair[0].to_string();
            let num_samples = if pair[1] == "all" {
                Capacity::Unbounded
            } else {
                Capacity::Bounded(pair[1].parse::<usize>()?)
            };
            result.insert(plugin_name, num_samples);
        }
        Ok(PluginSamplingHint(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tag_hash_map_str_access() {
        let mut m: HashMap<Tag, i32> = HashMap::new();
        m.insert(Tag("accuracy".to_string()), 1);
        m.insert(Tag("loss".to_string()), 2);
        // We can call `get` given only a `&str`, not an owned `Tag`.
        assert_eq!(m.get("accuracy"), Some(&1));
        assert_eq!(m.get("xent"), None);
    }

    #[test]
    fn test_run_hash_map_str_access() {
        let mut m: HashMap<Run, i32> = HashMap::new();
        m.insert(Run("train".to_string()), 1);
        m.insert(Run("test".to_string()), 2);
        // We can call `get` given only a `&str`, not an owned `Run`.
        assert_eq!(m.get("train"), Some(&1));
        assert_eq!(m.get("val"), None);
    }

    #[test]
    #[allow(clippy::float_cmp)]
    fn test_wall_time() {
        assert_eq!(WallTime::new(f64::INFINITY), None);
        assert_eq!(WallTime::new(-f64::INFINITY), None);
        assert_eq!(WallTime::new(f64::NAN), None);

        assert_eq!(f64::from(WallTime::new(1234.5).unwrap()), 1234.5);
        assert!(WallTime::new(1234.5) < WallTime::new(2345.625));

        let mut actual = vec![
            WallTime::new(123.0).unwrap(),
            WallTime::new(-456.0).unwrap(),
            WallTime::new(789.0).unwrap(),
        ];
        actual.sort();
        let expected = vec![
            WallTime::new(-456.0).unwrap(),
            WallTime::new(123.0).unwrap(),
            WallTime::new(789.0).unwrap(),
        ];
        assert_eq!(actual, expected);
    }

    #[test]
    fn test_plugin_sampling_hint() {
        use Capacity::{Bounded, Unbounded};

        // Parse from a valid hint with arbitrary plugin names.
        let hint1 = "scalars=500,images=0,histograms=all,unknown=10".parse::<PluginSamplingHint>();
        let mut expected1: HashMap<String, Capacity> = HashMap::new();
        expected1.insert("scalars".to_string(), Bounded(500));
        expected1.insert("images".to_string(), Bounded(0));
        expected1.insert("histograms".to_string(), Unbounded);
        expected1.insert("unknown".to_string(), Bounded(10));
        assert_eq!(hint1.unwrap().0, expected1);

        // Parse from an empty hint.
        let hint2 = "".parse::<PluginSamplingHint>();
        let expected2: HashMap<String, Capacity> = HashMap::new();
        assert_eq!(hint2.unwrap().0, expected2);

        // Parse from an invalid hint.
        match "x=1.5".parse::<PluginSamplingHint>().unwrap_err() {
            ParsePluginSamplingHintError::ParseIntError(_) => (),
            other => panic!("expected ParseIntError, got {:?}", other),
        };

        match "x=wat".parse::<PluginSamplingHint>().unwrap_err() {
            ParsePluginSamplingHintError::ParseIntError(_) => (),
            other => panic!("expected ParseIntError, got {:?}", other),
        };

        match "=1".parse::<PluginSamplingHint>().unwrap_err() {
            ParsePluginSamplingHintError::SyntaxError { part: _ } => (),
            other => panic!("expected SyntaxError, got {:?}", other),
        };

        match ",=,".parse::<PluginSamplingHint>().unwrap_err() {
            ParsePluginSamplingHintError::SyntaxError { part: _ } => (),
            other => panic!("expected SyntaxError, got {:?}", other),
        };
    }
}
