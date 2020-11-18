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

/// A step associated with a record, strictly increasing over time within a record stream.
#[derive(Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Copy, Clone)]
pub struct Step(pub i64);

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
        self.partial_cmp(&other)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tag_hash_map_str_access() {
        use std::collections::HashMap;
        let mut m: HashMap<Tag, i32> = HashMap::new();
        m.insert(Tag("accuracy".to_string()), 1);
        m.insert(Tag("loss".to_string()), 2);
        // We can call `get` given only a `&str`, not an owned `Tag`.
        assert_eq!(m.get("accuracy"), Some(&1));
        assert_eq!(m.get("xent"), None);
    }

    #[test]
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
}
