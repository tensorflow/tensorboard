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

//! Resumable reading for TFRecord streams.

use byteorder::{ByteOrder, LittleEndian};
use std::fmt::{self, Debug};
use std::io::{self, Read, Write};

use crate::masked_crc::MaskedCrc;

// From [TensorFlow `record_writer.cc` comments][1]:
// Format of a single record:
//  uint64    length
//  uint32    masked crc of length
//  byte      data[length]
//  uint32    masked crc of data
//
// [1]: https://github.com/tensorflow/tensorflow/blob/24d1fba948edd2c466b85b91836f055f5553404e/tensorflow/core/lib/io/record_writer.cc#L104-L108
const LENGTH_CRC_OFFSET: usize = 8;
const HEADER_LENGTH: usize = LENGTH_CRC_OFFSET + 4;
const FOOTER_LENGTH: usize = 4;

/// A reader for a stream of `TfRecords`. This reader can read a single record over one or more
/// underlying reads, to support growing, partially flushed files. It can also read records that
/// have incorrect data-CRCs: it's up to the caller to determine what to do in that case. However,
/// all records must have valid length-CRCs, because without knowing the length of each record we
/// can't continue to parse the file.
pub struct TfRecordReader<R> {
    /// TFRecord header: little-endian u64 length, u32 length-CRC. This vector always has capacity
    /// `HEADER_LENGTH`.
    //
    // Could be replaced by an inline `[u8; HEADER_LENGTH]` buffer plus `usize` length field to
    // avoid a level of memory indirection. Unlikely to matter a lot.
    header: Vec<u8>,
    /// Everything past the header in the TFRecord: the data buffer, plus a little-endian u32 CRC
    /// of the data buffer. Once `header.len() == HEADER_LENGTH`, this will have capacity equal to
    /// the data length plus `FOOTER_LENGTH`; before then, it will have no capacity.
    data_plus_footer: Vec<u8>,
    /// Underlying reader.
    reader: R,
}

/// A TFRecord with a data buffer and expected checksum. The checksum may or may not match the
/// actual contents.
#[derive(Debug, PartialEq, Eq)]
pub struct TfRecord {
    /// The payload of the TFRecord.
    pub data: Vec<u8>,
    /// The data CRC listed in the record, which may or not actually match the payload.
    pub data_crc: MaskedCrc,
}

/// A buffer's checksum was computed, but it did not match the expected value.
#[derive(Debug, PartialEq, Eq, thiserror::Error)]
#[error("checksum mismatch: got {got}, want {want}")]
pub struct ChecksumError {
    /// The actual checksum of the buffer.
    pub got: MaskedCrc,
    /// The expected checksum.
    pub want: MaskedCrc,
}

impl TfRecord {
    /// Validates the integrity of the record by computing its CRC-32C and checking it against the
    /// expected value.
    pub fn checksum(&self) -> Result<(), ChecksumError> {
        let got = MaskedCrc::compute(&self.data);
        let want = self.data_crc;
        if got == want {
            Ok(())
        } else {
            Err(ChecksumError { got, want })
        }
    }

    /// Creates a TFRecord from a data vector, computing the correct data CRC. Calling `checksum()`
    /// on this record will always succeed.
    pub fn from_data(data: Vec<u8>) -> Self {
        let data_crc = MaskedCrc::compute(&data);
        TfRecord { data, data_crc }
    }

    /// Encodes the record to an output stream. The data CRC will be taken from the `TfRecord`
    /// value, not recomputed from the payload. This means that reading a valid record and writing
    /// it back out will always produce identical input. It also means that the written data CRC
    /// may not be valid.
    ///
    /// This may call [`Write::write`] multiple times; consider providing a buffered output stream
    /// if this is an issue.
    ///
    /// A record can always be serialized. This method fails only due to underlying I/O errors.
    pub fn write<W: Write>(&self, mut writer: W) -> io::Result<()> {
        let len_buf: [u8; 8] = (self.data.len() as u64).to_le_bytes();
        writer.write_all(&len_buf)?;
        writer.write_all(&MaskedCrc::compute(&len_buf).0.to_le_bytes())?;
        writer.write_all(&self.data)?;
        writer.write_all(&self.data_crc.0.to_le_bytes())?;
        Ok(())
    }
}

/// Error returned by [`TfRecordReader::read_record`].
#[derive(Debug, thiserror::Error)]
pub enum ReadRecordError {
    /// Length field failed checksum. The file is corrupt, and reading must abort.
    #[error("length checksum mismatch: got {}, want {}", .0.got, .0.want)]
    BadLengthCrc(ChecksumError),
    /// No fatal errors so far, but the record is not complete. Call `read_record` again with the
    /// same state buffer once new data may be available.
    ///
    /// This includes the "trivial truncation" case where there are no bytes in a new record, so
    /// repeatedly reading records from a file of zero or more well-formed records will always
    /// finish with a `Truncated` error.
    #[error("record truncated")]
    Truncated,
    /// Record is too large to be represented in memory on this system.
    ///
    /// In principle, it would be possible to recover from this error, but in practice this should
    /// rarely occur since serialized protocol buffers do not exceed 2 GiB in size. Thus, no
    /// recovery codepath has been implemented, so reading must abort.
    #[error("record too large to fit in memory ({0} bytes)")]
    TooLarge(u64),
    /// Underlying I/O error. May be retryable if the underlying error is.
    #[error(transparent)]
    Io(#[from] io::Error),
}

impl<R: Debug> Debug for TfRecordReader<R> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("TfRecordReader")
            .field(
                "header",
                &format_args!("{}/{}", self.header.len(), self.header.capacity()),
            )
            .field(
                "data_plus_footer",
                &format_args!(
                    "{}/{}",
                    self.data_plus_footer.len(),
                    self.data_plus_footer.capacity()
                ),
            )
            .field("reader", &self.reader)
            .finish()
    }
}

impl<R: Read> TfRecordReader<R> {
    /// Creates an empty `TfRecordReader`, ready to read a stream of TFRecords from its beginning.
    /// The underlying reader should be aligned to the start of a record (usually, this is just the
    /// start of the file).
    ///
    /// This allocates a vector with 12 bytes of capacity to read TFRecord headers, which will be
    /// reused for all records read with this state value. Buffers for record payloads are
    /// allocated as records are read.
    pub fn new(reader: R) -> Self {
        TfRecordReader {
            reader,
            header: Vec::with_capacity(HEADER_LENGTH),
            data_plus_footer: Vec::new(),
        }
    }

    /// Consumes this `TfRecordReader<R>`, returning the underlying reader `R`.
    pub fn into_inner(self) -> R {
        self.reader
    }

    /// Attempts to read a TFRecord, pausing gracefully in the face of truncations. If the record
    /// is truncated, the result is a `Truncated` error; call `read_record` again once more data
    /// may have been written to resume reading where it left off. If the record is read
    /// successfully, this reader is left ready to read a new record.
    ///
    /// The record's length field is always validated against its checksum, but the full data is
    /// only validated if you call `checksum()` on the resulting record.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use rustboard_core::tf_record::{ReadRecordError, TfRecordReader};
    /// use std::io::Cursor;
    ///
    /// // Simulate a growing file...
    /// let (tx, rx) = std::sync::mpsc::channel();
    /// # struct ChannelReader(std::sync::mpsc::Receiver<u8>);
    /// # impl ChannelReader {
    /// #     fn new(rx: std::sync::mpsc::Receiver<u8>) -> Self {
    /// #         Self(rx)
    /// #     }
    /// # }
    /// # impl std::io::Read for ChannelReader {
    /// #     fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
    /// #         let fst = match buf.first_mut() {
    /// #             Some(fst) => fst,
    /// #             None => return Ok(0),
    /// #         };
    /// #         match self.0.try_recv() {
    /// #             Err(_) => Ok(0),
    /// #             Ok(byte) => {
    /// #                 *fst = byte;
    /// #                 Ok(1)
    /// #             }
    /// #         }
    /// #     }
    /// # }
    /// let file_reader = ChannelReader::new(rx); // implements `std::io::Read`
    /// let mut reader = TfRecordReader::new(file_reader);
    ///
    /// let mut buf: Vec<u8> = Vec::new();
    /// buf.extend(b"\x18\x00\x00\x00\x00\x00\x00\x00"); // length: 24 bytes
    /// buf.extend(b"\xa3\x7f\x4b\x22"); // length checksum (0x224b7fa3)
    /// let contents = b"\x09\x00\x00\x80\x38\x99\xd6\xd7\x41\x1a\x0dbrain.Event:2";
    /// buf.extend(&contents[..5]); // file truncated mid-write
    /// buf.into_iter().for_each(|b| tx.send(b).unwrap());
    ///
    /// // First attempt: read what we can, then encounter truncation.
    /// assert!(matches!(
    ///     reader.read_record(),
    ///     Err(ReadRecordError::Truncated)
    /// ));
    ///
    /// let mut buf: Vec<u8> = Vec::new();
    /// buf.extend(&contents[5..]); // rest of the payload
    /// buf.extend(b"\x12\x4b\x36\xab"); // data checksum (0xab364b12)
    /// buf.into_iter().for_each(|b| tx.send(b).unwrap());
    ///
    /// // Second read: read the rest of the record.
    /// let record = reader.read_record().unwrap();
    /// assert_eq!(record.data, contents);
    /// assert_eq!(record.checksum(), Ok(()));
    /// ```
    pub fn read_record(&mut self) -> Result<TfRecord, ReadRecordError> {
        if self.header.len() < HEADER_LENGTH {
            read_remaining(&mut self.reader, &mut self.header)?;

            let (length_buf, length_crc_buf) = self.header.split_at(LENGTH_CRC_OFFSET);
            let length_crc = MaskedCrc(LittleEndian::read_u32(length_crc_buf));
            let actual_crc = MaskedCrc::compute(length_buf);
            if length_crc != actual_crc {
                return Err(ReadRecordError::BadLengthCrc(ChecksumError {
                    got: actual_crc,
                    want: length_crc,
                }));
            }

            let length = LittleEndian::read_u64(length_buf);
            let data_plus_footer_length_u64 = length + (FOOTER_LENGTH as u64);
            let data_plus_footer_length = data_plus_footer_length_u64 as usize;
            if data_plus_footer_length as u64 != data_plus_footer_length_u64 {
                return Err(ReadRecordError::TooLarge(length));
            }
            self.data_plus_footer.reserve_exact(data_plus_footer_length);
        }

        if self.data_plus_footer.len() < self.data_plus_footer.capacity() {
            read_remaining(&mut self.reader, &mut self.data_plus_footer)?;
        }

        let data_length = self.data_plus_footer.len() - FOOTER_LENGTH;
        let data_crc_buf = self.data_plus_footer.split_off(data_length);
        // Take ownership of the data vector out of `self` so that we can hand it off to the
        // caller. This leaves an empty vector (`Vec::default()`) in `self`.
        let data = std::mem::take(&mut self.data_plus_footer);
        let data_crc = MaskedCrc(LittleEndian::read_u32(&data_crc_buf));
        self.header.clear(); // reset; caller may use this again
        Ok(TfRecord { data, data_crc })
    }
}

/// Fills `buf`'s remaining capacity from `reader`, or fails with `Truncated` if the reader is dry.
fn read_remaining<R: Read>(reader: R, buf: &mut Vec<u8>) -> Result<(), ReadRecordError> {
    let want = buf.capacity() - buf.len();
    reader.take(want as u64).read_to_end(buf)?;
    if buf.len() < buf.capacity() {
        return Err(ReadRecordError::Truncated);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scripted_reader::ScriptedReader;
    use std::io::Cursor;

    #[test]
    /// Tests a happy path with multiple records, one of which is truncated.
    fn test_success() {
        // Event file with `tf.summary.scalar("accuracy", 0.99, step=77)`
        // dumped via `xxd logs/*`.
        let record_1a = &b"\x09\x00\x00\x80\x38\x99"[..];
        let record_1b = &b"\xd6\xd7\x41\x1a\x0dbrain.Event:2"[..];
        let record_2 = &b"\
            \x09\xc4\x05\xb7\x3d\x99\xd6\xd7\x41\
            \x10\x4d\x2a\x25\
            \x0a\x23\x0a\x08accuracy\
            \x42\x0a\x08\x01\x12\x00\x22\x04\xa4\x70\x7d\x3f\x4a\
            \x0b\x0a\x09\x0a\x07scalars\
        "[..];

        let mut reads = Vec::new();
        // Record 1: first 5 bytes of header
        reads.push(b"\x18\x00\x00\x00\x00".to_vec());
        // Record 1: next 6 bytes of header
        reads.push(b"\x00\x00\x00\xa3\x7f\x4b".to_vec());
        // Record 1: last byte of header and Part A of contents
        reads.push([&b"\x22"[..], record_1a].concat().to_vec());
        // Record 1: Part B of contents, 4 bytes of footer; Record 2: first 2 bytes of header
        reads.push({
            let mut v = record_1b.to_vec();
            v.extend(b"\x12\x4b\x36\xab");
            v.extend(b"\x32\x00");
            v
        });
        // Record 2: last 10 bytes of header, all contents, all of footer
        reads.push({
            let mut v = Vec::new();
            v.extend(b"\x00\x00\x00\x00\x00\x00\x24\x19\x56\xec");
            v.extend(record_2);
            v.extend(b"\xa5\x5b\x64\x33");
            v
        });

        let mut reader = TfRecordReader::new(ScriptedReader::new(reads));

        #[derive(Debug)]
        enum TestCase {
            Truncated,
            Record(Vec<u8>),
        }
        use TestCase::*;

        let steps: Vec<TestCase> = vec![
            Truncated,
            Truncated,
            Truncated,
            Record([record_1a, record_1b].concat().to_vec()),
            Truncated,
            Record(record_2.to_vec()),
        ];
        for (i, step) in steps.into_iter().enumerate() {
            let result = reader.read_record();
            match (step, result) {
                (Truncated, Err(ReadRecordError::Truncated)) => (),
                (Record(v), Ok(r)) if v == r.data => {
                    r.checksum()
                        .unwrap_or_else(|e| panic!("step {}: checksum failure: {:?}", i + 1, e));
                }
                (step, result) => {
                    panic!("step {}: got {:?}, want {:?}", i + 1, result, step);
                }
            }
        }
    }

    #[test]
    fn test_length_crc_mismatch() {
        let mut file = Vec::new();
        file.extend(b"\x18\x00\x00\x00\x00\x00\x00\x00");
        file.extend(b"\x99\x7f\x4b\x55");
        file.extend(b"123456789abcdef012345678");
        file.extend(b"\x00\x00\x00\x00");

        let mut reader = TfRecordReader::new(Cursor::new(file));
        match reader.read_record() {
            Err(ReadRecordError::BadLengthCrc(ChecksumError {
                got: MaskedCrc(0x224b7fa3),
                want: MaskedCrc(0x554b7f99),
            })) => (),
            other => panic!("{:?}", other),
        }
    }

    #[test]
    fn test_data_crc_mismatch() {
        let mut file = Vec::new();
        file.extend(b"\x18\x00\x00\x00\x00\x00\x00\x00");
        file.extend(b"\xa3\x7f\x4b\x22");
        file.extend(b"123456789abcdef012345678");
        file.extend(b"\xdf\x9b\x57\x13"); // 0x13579bdf

        let mut reader = TfRecordReader::new(Cursor::new(file));
        let record = reader.read_record().expect("read_record");
        assert_eq!(record.data, b"123456789abcdef012345678".to_vec());
        match record.checksum() {
            Err(ChecksumError {
                want: MaskedCrc(0x13579bdf),
                got: _,
            }) => (),
            other => panic!("{:?}", other),
        }
    }

    #[test]
    fn test_error_display() {
        let e = ReadRecordError::BadLengthCrc(ChecksumError {
            got: MaskedCrc(0x01234567),
            want: MaskedCrc(0xfedcba98),
        });
        assert_eq!(
            e.to_string(),
            "length checksum mismatch: got 0x01234567, want 0xfedcba98"
        );

        let e = ReadRecordError::Truncated;
        assert_eq!(e.to_string(), "record truncated");

        let e = ReadRecordError::TooLarge(999);
        assert_eq!(
            e.to_string(),
            "record too large to fit in memory (999 bytes)"
        );

        let io_error = io::Error::new(io::ErrorKind::BrokenPipe, "pipe machine broke");
        let expected_message = io_error.to_string();
        let e = ReadRecordError::Io(io_error);
        assert_eq!(e.to_string(), expected_message);
    }

    #[test]
    fn test_from_data() {
        let test_cases = vec![
            b"".to_vec(),
            b"\x00".to_vec(),
            b"the quick brown fox jumped over the lazy dog".to_vec(),
        ];
        for data in test_cases {
            TfRecord::from_data(data).checksum().unwrap();
        }
    }

    fn test_write_read_roundtrip(record: &TfRecord) {
        let mut cursor = Cursor::new(Vec::<u8>::new());
        record.write(&mut cursor).expect("failed to write record");
        let written_len = cursor.position();
        cursor.set_position(0);
        let mut reader = TfRecordReader::new(cursor);
        let output_record = reader.read_record().expect("read_record");
        assert_eq!(&output_record, record);
        assert_eq!(reader.into_inner().position(), written_len); // should have read all the bytes and not more
    }

    #[test]
    fn test_write_read_roundtrip_valid_data_crc() {
        let data = b"hello world".to_vec();
        let record = TfRecord {
            data_crc: MaskedCrc::compute(&data),
            data,
        };
        test_write_read_roundtrip(&record);
    }

    #[test]
    fn test_write_read_roundtrip_invalid_data_crc() {
        let record = TfRecord {
            data: b"hello world".to_vec(),
            data_crc: MaskedCrc(0x12345678),
        };
        test_write_read_roundtrip(&record);
    }
}
