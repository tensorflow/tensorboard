# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================

import os
import struct
from tensorboard.compat.tensorflow_stub.pywrap_tensorflow import masked_crc32c


def directory_check(path):
    '''Initialize the directory for log files.'''
    if not os.path.exists(path):
        os.makedirs(path)

class RecordWriter(object):
    def __init__(self, logfile):
        self._writer = open(logfile, 'wb')

    # Format of a single record:
    # uint64    length
    # uint32    masked crc of length
    # byte      data[length]
    # uint32    masked crc of data
    def write(self, data):
        header_len = struct.pack('Q', len(data))
        header_len_crc = struct.pack('I', masked_crc32c(header_len))
        footer_crc = struct.pack('I', masked_crc32c(data))
        self._writer.write(header_len + header_len_crc + data + footer_crc)

    def flush(self):
        if self._writer is not None:
            self._writer.flush()
        else:
            raise OSError('file writer is missing')

    def close(self):
        if self._writer is not None:
            self._writer.close()
        else:
            raise OSError('file writer is missing')
