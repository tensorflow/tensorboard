# -*- coding: utf-8 -*-
# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""A safe method to encode numpy arrays containing nan, inf or -inf."""
import json
import numpy as np


class SafeEncoder(json.JSONEncoder):
    """Encoder that can handle numpy nan, inf, and -inf."""

    def __init__(self, nan_str="null", **kwargs):
        super(SafeEncoder, self).__init__(**kwargs)
        self.nan_str = nan_str

    def iterencode(self, o, _one_shot=False):
        """Encode the given object and yield each string
        representation as available.

        Args:
            o: The object to encode.
        """
        if self.check_circular:
            markers = {}
        else:
            markers = None
        if self.ensure_ascii:
            _encoder = json.encoder.encode_basestring_ascii
        else:
            _encoder = json.encoder.encode_basestring

        def floatstr(o, allow_nan=self.allow_nan,
                     _inf=json.encoder.INFINITY, _neginf=-json.encoder.INFINITY,
                     nan_str=self.nan_str):
            """Makes a string out of a float value

            Args:
                o: The object to encode.
                allow_nan: Whether nan values should be encoded or raise an
                    Exception.
                _inf: An infinity identifier for the encoder.
                _neginf: A identifier for negative inf values for the encoder.
                nan_str: The string with which to replace nan values.
            """
            if o != o:
                text = nan_str
            elif o == _inf:
                text = 'Infinity'
            elif o == _neginf:
                text = '-Infinity'
            else:
                return str(o)
            if not allow_nan:
                raise ValueError(
                    "Out of range float values are not JSON compliant: " +
                    repr(o))
            return text

        _iterencode = json.encoder._make_iterencode(
            markers, self.default, _encoder, self.indent, floatstr,
            self.key_separator, self.item_separator, self.sort_keys,
            self.skipkeys, _one_shot)
        return _iterencode(o, 0)
