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

"""
To write tf_record into file. Here we use it for tensorboard's event writting.
The code was borrowed from https://github.com/TeamHG-Memex/tensorboard_logger
"""

import copy
import io
import os.path
import re
import struct

from .crc32c import crc32c


_VALID_OP_NAME_START = re.compile('^[A-Za-z0-9.]')
_VALID_OP_NAME_PART = re.compile('[A-Za-z0-9_.\\-/]+')


class RecordWriter(object):
    """write encoded protobuf along with its checksum.

    """
    def __init__(self, path):
        self._name_to_tf_name = {}
        self._tf_names = set()
        self.path = path
        self._writer = None
        self._writer = open(path, 'wb')

    def write(self, event_str):
        w = self._writer.write
        header = struct.pack('Q', len(event_str))
        w(header)
        w(struct.pack('I', masked_crc32c(header)))
        w(event_str)
        w(struct.pack('I', masked_crc32c(event_str)))

    def flush(self):
        self._writer.flush()

    def close(self):
        self._writer.close()


def masked_crc32c(data):
    x = u32(crc32c(data))
    return u32(((x >> 15) | u32(x << 17)) + 0xa282ead8)


def u32(x):
    return x & 0xffffffff


def make_valid_tf_name(name):
    if not _VALID_OP_NAME_START.match(name):
        # Must make it valid somehow, but don't want to remove stuff
        name = '.' + name
    return '_'.join(_VALID_OP_NAME_PART.findall(name))
