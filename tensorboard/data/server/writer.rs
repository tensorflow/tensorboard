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

//! Test helpers for writing event files.

use std::io::Write;

use crate::proto::tensorboard as pb;
use crate::types::{Step, Tag, WallTime};

/// Extends [`Write`] with methods for writing summary event files.
pub trait SummaryWriteExt: Write {
    /// Writes a TFRecord containing an `Event` proto into this writer.
    fn write_event(&mut self, event: &pb::Event) -> std::io::Result<()> {
        use prost::Message;
        let mut data = Vec::new();
        event.encode(&mut data)?;
        crate::tf_record::TfRecord::from_data(data).write(self)?;
        Ok(())
    }

    /// Writes a TFRecord containing a TF 1.x scalar event (`simple_value`) into this writer.
    fn write_scalar(
        &mut self,
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
        self.write_event(&event)
    }
}

impl<W: Write> SummaryWriteExt for W {}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Cursor, Read};

    use crate::event_file::{self, EventFileReader};

    fn read_all_events<R: Read>(reader: R) -> Result<Vec<pb::Event>, event_file::ReadEventError> {
        let mut result = Vec::new();
        use crate::event_file::ReadEventError::ReadRecordError;
        use crate::tf_record::ReadRecordError::Truncated;
        let mut reader = EventFileReader::new(reader);
        loop {
            match reader.read_event() {
                Ok(event) => result.push(event),
                Err(ReadRecordError(Truncated)) => return Ok(result),
                Err(e) => return Err(e.into()),
            }
        }
    }

    #[test]
    fn test_event_roundtrip() {
        let mut event: pb::Event = Default::default();
        event.step = 123;
        event.wall_time = 1234.5;
        event.what = Some(pb::event::What::FileVersion("hello!".to_string()));

        let mut cursor = Cursor::new(Vec::<u8>::new());
        cursor.write_event(&event).unwrap();
        cursor.set_position(0);
        assert_eq!(read_all_events(cursor).unwrap(), vec![event]);
    }

    #[test]
    fn test_scalar_roundtrip() {
        let mut cursor = Cursor::new(Vec::<u8>::new());
        cursor
            .write_scalar(
                &Tag("accuracy".to_string()),
                Step(777),
                WallTime::new(1234.5).unwrap(),
                0.875,
            )
            .unwrap();
        cursor.set_position(0);
        let events = read_all_events(cursor).unwrap();
        assert_eq!(events.len(), 1);

        let event = &events[0];
        let expected = pb::Event {
            step: 777,
            wall_time: 1234.5,
            what: Some(pb::event::What::Summary(pb::Summary {
                value: vec![pb::summary::Value {
                    tag: "accuracy".to_string(),
                    value: Some(pb::summary::value::Value::SimpleValue(0.875)),
                    ..Default::default()
                }],
                ..Default::default()
            })),
            ..Default::default()
        };
        assert_eq!(event, &expected);
    }
}
