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

//! Parsing for event files containing a stream of `Event` protos.

use prost::{DecodeError, Message};
use std::io::Read;

use crate::proto::tensorboard::Event;
use crate::tf_record::{ChecksumError, ReadRecordError, TfRecordReader};

/// A reader for a stream of `Event` protos framed as TFRecords.
///
/// As with [`TfRecordReader`], an event may be read over one or more underlying reads, to support
/// growing, partially flushed files.
#[derive(Debug)]
pub struct EventFileReader<R> {
    /// Wall time of the record most recently read from this event file, or `None` if no records
    /// have been read. Used for determining when to consider this file dead and abandon it.
    last_wall_time: Option<f64>,
    /// Underlying record reader owned by this event file.
    reader: TfRecordReader<R>,
    /// Whether to compute CRCs for records before parsing as protos.
    checksum: bool,
}

/// Error returned by [`EventFileReader::read_event`].
#[derive(Debug, thiserror::Error)]
pub enum ReadEventError {
    /// The record failed its checksum.
    #[error(transparent)]
    InvalidRecord(#[from] ChecksumError),
    /// The record passed its checksum, but the contained protocol buffer is invalid.
    #[error(transparent)]
    InvalidProto(#[from] DecodeError),
    /// The record is a valid `Event` proto, but its `wall_time` is `NaN`.
    #[error("NaN wall time at step {}", .0.step)]
    NanWallTime(Event),
    /// An error occurred reading the record. May or may not be fatal.
    #[error(transparent)]
    ReadRecordError(#[from] ReadRecordError),
}

impl ReadEventError {
    /// Checks whether this error indicates a truncated record. This is a convenience method, since
    /// the end of a file always implies a truncation event.
    pub fn truncated(&self) -> bool {
        matches!(
            self,
            ReadEventError::ReadRecordError(ReadRecordError::Truncated)
        )
    }
}

impl<R: Read> EventFileReader<R> {
    /// Creates a new `EventFileReader` wrapping the given reader.
    pub fn new(reader: R) -> Self {
        Self {
            last_wall_time: None,
            reader: TfRecordReader::new(reader),
            checksum: true,
        }
    }

    /// Sets whether to compute checksums for records before parsing them as protos.
    pub fn checksum(&mut self, yes: bool) {
        self.checksum = yes;
    }

    /// Reads the next event from the file.
    pub fn read_event(&mut self) -> Result<Event, ReadEventError> {
        let record = self.reader.read_record()?;
        let event = if self.checksum {
            record.checksum()?;
            Event::decode(&record.data[..])?
        } else {
            match Event::decode(&record.data[..]) {
                Ok(proto) => proto,
                Err(e) => {
                    record.checksum()?;
                    return Err(e.into());
                }
            }
        };
        let wall_time = event.wall_time;
        if wall_time.is_nan() {
            return Err(ReadEventError::NanWallTime(event));
        }
        self.last_wall_time = Some(wall_time);
        Ok(event)
    }

    /// Gets the wall time of the event most recently read from the event file, or `None` if no
    /// events have yet been read.
    pub fn last_wall_time(&self) -> &Option<f64> {
        &self.last_wall_time
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::masked_crc::MaskedCrc;
    use crate::proto::tensorboard as pb;
    use crate::scripted_reader::ScriptedReader;
    use crate::tf_record::TfRecord;
    use std::io::Cursor;

    /// Encodes an `Event` proto to bytes.
    fn encode_event(e: &Event) -> Vec<u8> {
        let mut encoded = Vec::new();
        Event::encode(e, &mut encoded).expect("failed to encode event");
        encoded
    }

    #[test]
    fn test() {
        let good_event = Event {
            what: Some(pb::event::What::FileVersion("good event".to_string())),
            wall_time: 1234.5,
            ..Event::default()
        };
        let mut nan_event = Event {
            what: Some(pb::event::What::FileVersion("bad wall time".to_string())),
            wall_time: f64::NAN,
            ..Event::default()
        };
        let records = vec![
            TfRecord::from_data(encode_event(&good_event)),
            TfRecord::from_data(encode_event(&nan_event)),
            TfRecord::from_data(b"failed proto, OK record".to_vec()),
            TfRecord {
                data: b"failed proto, failed checksum, OK record structure".to_vec(),
                data_crc: MaskedCrc(0x12345678),
            },
            TfRecord {
                data: encode_event(&good_event),
                data_crc: MaskedCrc(0x12345678), // OK proto, failed checksum, OK record structure
            },
        ];
        let mut file = Vec::new();
        for record in records {
            record.write(&mut file).expect("writing record");
        }
        let mut reader = EventFileReader::new(Cursor::new(file));

        assert_eq!(reader.last_wall_time(), &None);
        assert_eq!(reader.read_event().unwrap(), good_event);
        assert_eq!(reader.last_wall_time(), &Some(1234.5));
        match reader.read_event() {
            Err(ReadEventError::NanWallTime(mut e)) => {
                // can't just check `e == nan_event` because `NaN != NaN`
                assert!(e.wall_time.is_nan());
                e.wall_time = 0.0;
                nan_event.wall_time = 0.0;
                assert_eq!(e, nan_event);
            }
            other => panic!("{:?}", other),
        };
        assert_eq!(reader.last_wall_time(), &Some(1234.5));
        match reader.read_event() {
            Err(ReadEventError::InvalidProto(_)) => (),
            other => panic!("{:?}", other),
        };
        assert_eq!(reader.last_wall_time(), &Some(1234.5));
        match reader.read_event() {
            Err(ReadEventError::InvalidRecord(ChecksumError {
                got: _,
                want: MaskedCrc(0x12345678),
            })) => (),
            other => panic!("{:?}", other),
        };
        assert_eq!(reader.last_wall_time(), &Some(1234.5));
        match reader.read_event() {
            Err(ReadEventError::InvalidRecord(ChecksumError { got, want: _ }))
                if got == MaskedCrc::compute(&encode_event(&good_event)) => {}
            other => panic!("{:?}", other),
        };
        assert_eq!(reader.last_wall_time(), &Some(1234.5));
        // After end of file, should get a truncation error.
        let last = reader.read_event();
        assert!(last.as_ref().unwrap_err().truncated(), "{:?}", last);
        assert_eq!(reader.last_wall_time(), &Some(1234.5));
    }

    #[test]
    fn test_no_checksum() {
        let event = Event {
            what: Some(pb::event::What::FileVersion("hello".to_string())),
            ..Event::default()
        };
        let records = vec![
            TfRecord::from_data(encode_event(&event)),
            {
                let mut record = TfRecord::from_data(encode_event(&event));
                record.data_crc.0 ^= 0x1; // invalidate checksum
                record
            },
            {
                let mut record = TfRecord::from_data(b"failed proto, failed checksum".to_vec());
                record.data_crc.0 ^= 0x1; // invalidate checksum
                record
            },
            TfRecord::from_data(b"failed proto, okay checksum".to_vec()),
        ];
        let mut file = Vec::new();
        for record in records {
            record.write(&mut file).expect("writing record");
        }
        let mut reader = EventFileReader::new(Cursor::new(file));
        reader.checksum(false);

        // First record is genuinely okay.
        match reader.read_event() {
            Ok(_) => (),
            other => panic!("first record: {:?}", other),
        };
        // Second record is a valid proto, but invalid record checksum; with `checksum(false)`,
        // this should not be caught.
        match reader.read_event() {
            Ok(_) => (),
            other => panic!("second record: {:?}", other),
        };
        // Third record is an invalid proto with an invalid checksum, so the checksum error should
        // be caught.
        match reader.read_event() {
            Err(ReadEventError::InvalidRecord(_)) => (),
            other => panic!("third record: {:?}", other),
        };
        // Fourth record is an invalid proto with valid checksum, which should still be caught.
        match reader.read_event() {
            Err(ReadEventError::InvalidProto(_)) => (),
            other => panic!("fourth record: {:?}", other),
        };
        // After four records, should be done.
        match reader.read_event() {
            Err(ReadEventError::ReadRecordError(ReadRecordError::Truncated)) => (),
            other => panic!("eof: {:?}", other),
        };
    }

    #[test]
    fn test_resume() {
        let event = Event {
            what: Some(pb::event::What::FileVersion("good event".to_string())),
            wall_time: 1234.5,
            ..Event::default()
        };
        let mut file = Cursor::new(Vec::<u8>::new());
        TfRecord::from_data(encode_event(&event))
            .write(&mut file)
            .unwrap();
        let record_bytes = file.into_inner();
        let (beginning, end) = record_bytes.split_at(6);

        let sr = ScriptedReader::new(vec![beginning.to_vec(), end.to_vec()]);
        let mut reader = EventFileReader::new(sr);

        // first read should be truncated
        let result = reader.read_event();
        assert!(result.as_ref().unwrap_err().truncated(), "{:?}", result);
        assert_eq!(reader.last_wall_time(), &None);

        // second read should be the full record
        let result = reader.read_event();
        assert_eq!(result.unwrap(), event);
        assert_eq!(reader.last_wall_time(), &Some(1234.5));

        // further reads should be truncated again
        let result = reader.read_event();
        assert!(result.as_ref().unwrap_err().truncated(), "{:?}", result);
        assert_eq!(reader.last_wall_time(), &Some(1234.5));
    }
}
