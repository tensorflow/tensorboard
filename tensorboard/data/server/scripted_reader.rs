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

//! Test helper for simulating input streams that grow over time.

use std::collections::VecDeque;
use std::io::{self, Cursor, Read};

/// A reader that delegates to a sequence of cursors, reading from each in turn and simulating
/// EOF after each one.
#[derive(Debug)]
pub struct ScriptedReader(VecDeque<Cursor<Vec<u8>>>);

impl ScriptedReader {
    /// Creates a reader that reads from each of the given buffers in turn. The given iterator is
    /// exhausted eagerly.
    pub fn new<I: IntoIterator<Item = Vec<u8>>>(vecs: I) -> Self {
        ScriptedReader(vecs.into_iter().map(Cursor::new).collect())
    }
}

impl Read for ScriptedReader {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        let sub_reader = match self.0.front_mut() {
            None => return Ok(0),
            Some(r) => r,
        };
        let bytes_read = sub_reader.read(buf)?;
        if bytes_read == 0 {
            self.0.pop_front();
        }
        Ok(bytes_read)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test() {
        let mut sr = ScriptedReader::new(vec![
            vec![0, 1, 2, 3],
            vec![],
            vec![4, 5, 6, 7, 8, 9],
            vec![10],
        ]);
        // Repeatedly read 3 bytes at a time, and expect the following sequence of results:
        let expected: Vec<Vec<u8>> = vec![
            // Read first buffer, with underread.
            vec![0u8, 1, 2],
            vec![3],
            vec![],
            // Read second buffer, which is empty.
            vec![],
            // Read third buffer, exactly.
            vec![4, 5, 6],
            vec![7, 8, 9],
            vec![],
            // Read fourth buffer, with underread.
            vec![10],
            vec![],
            // Read past end of buffer list.
            vec![],
            vec![],
            vec![],
        ];
        for expected_data in expected {
            let mut buf = vec![77u8; 3];
            let bytes_read = sr.read(&mut buf).unwrap();
            assert_eq!(bytes_read, expected_data.len());
            // The rest of the buffer should be untouched: extend the expected value to match.
            let mut expected_buf = expected_data;
            expected_buf.resize(3, 77u8); // pad
            assert_eq!(buf, expected_buf);
        }
    }
}
