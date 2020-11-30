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

//! Shared state for sampled data available to readers.

use std::collections::HashMap;
use std::sync::RwLock;

use crate::proto::tensorboard as pb;
use crate::reservoir::Basin;
use crate::types::{Run, Step, Tag, WallTime};

/// Current state of in-memory sampled data.
///
/// A commit is an internally mutable structure. All readers and writers should keep a shared
/// reference to a single commit. When writers need to update it, they grab an exclusive lock to
/// the contents.
///
/// Deadlock safety: any thread should obtain the outer lock (around the hash map) before an inner
/// lock (around the run data), and should obtain at most one `RunData` lock at once.
#[derive(Debug, Default)]
pub struct Commit {
    pub runs: RwLock<HashMap<Run, RwLock<RunData>>>,
}

impl Commit {
    /// Creates a new, empty commit.
    pub fn new() -> Self {
        Commit::default()
    }
}

/// Data for a single run.
///
/// This contains all data and metadata for a run. For now, that data includes only scalars;
/// tensors and blob sequences will come soon.
#[derive(Debug, Default)]
pub struct RunData {
    /// The time of the first event recorded for this run.
    ///
    /// Used to define an ordering on runs that is stable as new runs are added, so that existing
    /// runs aren't constantly changing color.
    pub start_time: Option<WallTime>,

    /// Scalar time series for this run.
    pub scalars: TagStore<ScalarValue>,
}

pub type TagStore<V> = HashMap<Tag, TimeSeries<V>>;

#[derive(Debug)]
pub struct TimeSeries<V> {
    /// Summary metadata for this time series.
    pub metadata: Box<pb::SummaryMetadata>,

    /// Reservoir basin for data points in this time series.
    ///
    /// See [`TimeSeries::valid_values`] for a client-friendly view that omits `DataLoss` points
    /// and transposes `Step`s into the tuple.
    pub basin: Basin<(WallTime, Result<V, DataLoss>)>,
}

impl<V> TimeSeries<V> {
    /// Creates a new time series from the given summary metadata.
    pub fn new(metadata: Box<pb::SummaryMetadata>) -> Self {
        TimeSeries {
            metadata,
            basin: Basin::new(),
        }
    }

    /// Gets an iterator over `self.values` that omits `DataLoss` points.
    pub fn valid_values(&self) -> impl Iterator<Item = (Step, WallTime, &V)> {
        self.basin
            .as_slice()
            .iter()
            .filter_map(|(step, (wall_time, v))| Some((*step, *wall_time, v.as_ref().ok()?)))
    }
}

/// A value in a time series is corrupt and should be ignored.
///
/// This is used when a point looks superficially reasonable when it's offered to the reservoir,
/// but at commit time we realize that it can't be enriched into a valid point. This might happen
/// if, for instance, a point in a scalar time series has a tensor value containing a string. We
/// don't care too much about what happens to these invalid values. Keeping them in the commit as
/// `DataLoss` tombstones is convenient, and [`TimeSeries::valid_values`] offers a view that
/// abstracts over this detail by only showing valid data.
#[derive(Debug, PartialEq)]
pub struct DataLoss;

/// The value of a scalar time series at a single point.
#[derive(Debug, Copy, Clone, PartialEq)]
pub struct ScalarValue(pub f32);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_values() {
        let mut ts = TimeSeries::<&str>::new(Box::new(pb::SummaryMetadata::default()));

        let mut rsv = crate::reservoir::StageReservoir::new(10);
        let wall_time = WallTime::new(0.0).unwrap(); // don't really care
        rsv.offer(Step(0), "zero");
        rsv.offer(Step(1), "one");
        rsv.offer(Step(2), "two");
        rsv.offer(Step(3), "three");
        rsv.offer(Step(5), "five");
        rsv.commit_map(&mut ts.basin, |s| {
            (wall_time, if s == "three" { Err(DataLoss) } else { Ok(s) })
        });

        assert_eq!(
            ts.valid_values().collect::<Vec<_>>(),
            vec![
                (Step(0), wall_time, &"zero"),
                (Step(1), wall_time, &"one"),
                (Step(2), wall_time, &"two"),
                // missing: Step(3)
                (Step(5), wall_time, &"five")
            ]
        );
    }
}
