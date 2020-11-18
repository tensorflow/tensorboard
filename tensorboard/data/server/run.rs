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

//! Loader for a single run, with one or more event files.

use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;

use crate::data_compat::{EventValue, SummaryValue};
use crate::event_file::EventFileReader;
use crate::proto::tensorboard as pb;
use crate::reservoir::StageReservoir;
use crate::types::{Step, Tag, WallTime};

/// A loader to accumulate reservoir-sampled events in a single TensorBoard run.
///
/// For now, a run loader always reads from [`File`]s on disk. In the future, this may be
/// parameterized over a filesystem interface.
#[derive(Debug)]
pub struct RunLoader {
    /// The earliest event `wall_time` seen in any event file in this run.
    ///
    /// This is `None` if and only if no events have been seen. Its value may decrease as new
    /// events are read, but in practice this is expected to be the wall time of the first
    /// `file_version` event in the first event file.
    start_time: Option<WallTime>,

    /// The event files in this run.
    ///
    /// Event files are sorted and read lexicographically by name, which is designed to coincide
    /// with actual start time. See [`EventFile::Dead`] for conditions under which an event file
    /// may be dead. Once an event file is added to this map, it may become dead, but it will not
    /// be removed entirely. This way, we know not to just re-open it again at the next load cycle.
    files: BTreeMap<PathBuf, EventFile<BufReader<File>>>,

    /// Reservoir-sampled data and metadata for each time series.
    time_series: HashMap<Tag, TimeSeries>,
}

#[derive(Debug)]
enum EventFile<R> {
    /// An event file that may still have more valid data.
    Active(EventFileReader<R>),
    /// An event file that can no longer be read.
    ///
    /// This can be because of a non-recoverable read error (e.g., a bad length checksum), due to
    /// the last-read record being very old (note: not yet implemented), or due to the file being
    /// deleted.
    Dead,
}

#[derive(Debug)]
struct TimeSeries {
    data_class: pb::DataClass,
    metadata: Box<pb::SummaryMetadata>,
    rsv: StageReservoir<StageValue>,
}

impl TimeSeries {
    fn new(metadata: Box<pb::SummaryMetadata>) -> Self {
        let data_class =
            pb::DataClass::from_i32(metadata.data_class).unwrap_or(pb::DataClass::Unknown);
        let capacity = match data_class {
            pb::DataClass::Scalar => 1000,
            pb::DataClass::Tensor => 100,
            pb::DataClass::BlobSequence => 10,
            _ => 0,
        };
        Self {
            data_class,
            metadata,
            rsv: StageReservoir::new(capacity),
        }
    }
}

/// A value staged in the reservoir.
///
/// This is kept as close as possible to the on-disk event representation, since every record in
/// the stream is converted into this format.
#[derive(Debug)]
struct StageValue {
    wall_time: WallTime,
    payload: EventValue,
}

impl RunLoader {
    pub fn new() -> Self {
        Self {
            start_time: None,
            files: BTreeMap::new(),
            time_series: HashMap::new(),
        }
    }

    /// Loads new data given the current set of event files.
    ///
    /// The provided filenames should correspond to the entire set of event files currently part of
    /// this run.
    pub fn reload(&mut self, filenames: Vec<PathBuf>) {
        self.update_file_set(filenames);
        self.reload_files();
    }

    /// Updates the active key set of `self.files` to match the given filenames.
    ///
    /// After this function returns, `self.files` may still have keys not in `filenames`, but they
    /// will all map to [`EventFile::Dead`].
    fn update_file_set(&mut self, filenames: Vec<PathBuf>) {
        // Remove any discarded files.
        let new_file_set: HashSet<&PathBuf> = filenames.iter().collect();
        for (k, v) in self.files.iter_mut() {
            if !new_file_set.contains(k) {
                *v = EventFile::Dead;
            }
        }

        // Open readers for any new files.
        for filename in filenames {
            use std::collections::btree_map;
            match self.files.entry(filename) {
                btree_map::Entry::Occupied(_) => {}
                btree_map::Entry::Vacant(v) => {
                    let event_file = match File::open(v.key()) {
                        Ok(file) => {
                            let reader = EventFileReader::new(BufReader::new(file));
                            EventFile::Active(reader)
                        }
                        // TODO(@wchargin): Improve error handling?
                        Err(e) => {
                            eprintln!("failed to open event file {:?}: {:?}", v.key(), e);
                            EventFile::Dead
                        }
                    };
                    v.insert(event_file);
                }
            };
        }
    }

    /// Reads data from all active event files.
    fn reload_files(&mut self) {
        for (filename, ef) in self.files.iter_mut() {
            let reader = match ef {
                EventFile::Dead => continue,
                EventFile::Active(reader) => reader,
            };

            loop {
                use crate::event_file::ReadEventError::ReadRecordError;
                use crate::tf_record::ReadRecordError::Truncated;
                let event = match reader.read_event() {
                    Ok(event) => event,
                    Err(ReadRecordError(Truncated)) => break,
                    Err(e) => {
                        // TODO(@wchargin): Improve error handling?
                        eprintln!("read error in {}: {:?}", filename.display(), e);
                        *ef = EventFile::Dead;
                        break;
                    }
                };
                read_event(&mut self.time_series, &mut self.start_time, event);
            }
        }
    }
}

/// Reads a single event into the structures of a run loader.
///
/// This is a standalone function because it's called from `reload_files` in a context that already
/// has an exclusive reference into `self.files`, and so can't call methods on `&mut self`.
fn read_event(
    time_series: &mut HashMap<Tag, TimeSeries>,
    start_time: &mut Option<WallTime>,
    e: pb::Event,
) {
    let step = Step(e.step);
    let wall_time = match WallTime::new(e.wall_time) {
        None => {
            // TODO(@wchargin): Improve error handling.
            eprintln!(
                "dropping event at step {} with invalid wall time {}",
                e.step, e.wall_time
            );
            return;
        }
        Some(wt) => wt,
    };
    if start_time.map(|start| wall_time < start).unwrap_or(true) {
        *start_time = Some(wall_time);
    }
    match e.what {
        Some(pb::event::What::GraphDef(_)) => {
            // TODO(@wchargin): Handle run graphs.
            eprintln!("graph_def events not yet handled");
        }
        Some(pb::event::What::Summary(sum)) => {
            for mut summary_pb_value in sum.value {
                let summary_value = match summary_pb_value.value {
                    None => continue,
                    Some(v) => SummaryValue(Box::new(v)),
                };

                use std::collections::hash_map::Entry;
                let ts = match time_series.entry(Tag(summary_pb_value.tag)) {
                    Entry::Occupied(o) => o.into_mut(),
                    Entry::Vacant(v) => {
                        let metadata =
                            summary_value.initial_metadata(summary_pb_value.metadata.take());
                        v.insert(TimeSeries::new(metadata))
                    }
                };
                let sv = StageValue {
                    wall_time,
                    payload: EventValue::Summary(summary_value),
                };
                ts.rsv.offer(step, sv);
            }
        }
        _ => {}
    }
}

impl Default for RunLoader {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use std::fs::File;
    use std::io::{BufWriter, Write};

    /// Writes an event to the given writer, in TFRecord form.
    fn write_event<W: Write>(writer: W, event: &pb::Event) -> std::io::Result<()> {
        use prost::Message;
        let mut data = Vec::new();
        event.encode(&mut data)?;
        crate::tf_record::TfRecord::from_data(data).write(writer)?;
        Ok(())
    }

    /// Writes a TF 1.x scalar event (`simple_value`) to the given writer.
    fn write_scalar<W: Write>(
        writer: W,
        tag: &Tag,
        step: Step,
        wt: WallTime,
        value: f32,
    ) -> std::io::Result<()> {
        let event = pb::Event {
            step: step.0,
            wall_time: wt.into(),
            what: Some(pb::event::What::Summary(pb::Summary {
                value: vec![pb::summary::Value {
                    tag: tag.0.clone(),
                    value: Some(pb::summary::value::Value::SimpleValue(value)),
                    ..Default::default()
                }],
                ..Default::default()
            })),
            ..Default::default()
        };
        write_event(writer, &event)
    }

    #[test]
    fn test() -> Result<(), Box<dyn std::error::Error>> {
        let logdir = tempfile::tempdir()?;
        let f1_name = logdir.path().join("tfevents.123");
        let f2_name = logdir.path().join("tfevents.456");
        let mut f1 = BufWriter::new(File::create(&f1_name)?);
        let mut f2 = BufWriter::new(File::create(&f2_name)?);

        // Write file versions.
        for (f, wall_time) in &mut [(&mut f1, 1234.0), (&mut f2, 2345.0)] {
            let file_version = pb::Event {
                wall_time: *wall_time,
                what: Some(pb::event::What::FileVersion("brain.Event:2".to_string())),
                ..Default::default()
            };
            write_event(f, &file_version)?;
        }

        // Write some data points across both files.
        let tag = Tag("accuracy".to_string());
        write_scalar(&mut f1, &tag, Step(0), WallTime::new(1235.0).unwrap(), 0.25)?;
        write_scalar(&mut f1, &tag, Step(1), WallTime::new(1236.0).unwrap(), 0.50)?;
        write_scalar(&mut f2, &tag, Step(2), WallTime::new(2346.0).unwrap(), 0.75)?;
        write_scalar(&mut f2, &tag, Step(3), WallTime::new(2347.0).unwrap(), 1.00)?;
        f1.into_inner()?.sync_all()?;
        f2.into_inner()?.sync_all()?;

        let mut loader = RunLoader::new();
        loader.reload(vec![f1_name, f2_name]);

        // Start time should be that of the file version event, even though that didn't correspond
        // to any time series.
        assert_eq!(loader.start_time, Some(WallTime::new(1234.0).unwrap()));
        assert_eq!(loader.time_series.keys().collect::<Vec<_>>(), vec![&tag]);
        let ts = loader.time_series.get_mut(&tag).unwrap();
        assert_eq!(
            *ts.metadata,
            pb::SummaryMetadata {
                plugin_data: Some(pb::summary_metadata::PluginData {
                    plugin_name: crate::data_compat::SCALARS_PLUGIN_NAME.to_string(),
                    ..Default::default()
                }),
                data_class: pb::DataClass::Scalar.into(),
                ..Default::default()
            }
        );
        let mut basin = crate::reservoir::Basin::new();
        ts.rsv.commit(&mut basin);

        // Points should be as expected (no downsampling at these sizes).
        let mut actual_points = Vec::new();
        for (step, StageValue { wall_time, payload }) in basin.as_slice() {
            if let EventValue::Summary(SummaryValue(value_box)) = payload {
                if let pb::summary::value::Value::SimpleValue(f) = **value_box {
                    actual_points.push((*step, *wall_time, f));
                    continue;
                }
            }
            panic!("step {:?}: {:?}", step, payload);
        }
        assert_eq!(
            actual_points,
            vec![
                (Step(0), WallTime::new(1235.0).unwrap(), 0.25),
                (Step(1), WallTime::new(1236.0).unwrap(), 0.50),
                (Step(2), WallTime::new(2346.0).unwrap(), 0.75),
                (Step(3), WallTime::new(2347.0).unwrap(), 1.00),
            ]
        );

        Ok(())
    }
}
