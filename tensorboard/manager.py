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
"""Private utilities for managing multiple TensorBoard processes."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import datetime
import json

import six

from tensorboard import version


# Type descriptors for `TensorboardInfo` fields.
_FieldType = collections.namedtuple(
    "_FieldType",
    (
        "serialized_type",
        "runtime_type",
        "serialize",
        "deserialize",
    ),
)
_type_timestamp = _FieldType(
    serialized_type=int,  # seconds since epoch
    runtime_type=datetime.datetime,  # microseconds component ignored
    serialize=lambda dt: int(dt.strftime("%s")),
    deserialize=lambda n: datetime.datetime.fromtimestamp(n),
)
_type_int = _FieldType(
    serialized_type=int,
    runtime_type=int,
    serialize=lambda n: n,
    deserialize=lambda n: n,
)
_type_str = _FieldType(
    serialized_type=six.text_type,  # `json.loads` always gives Unicode
    runtime_type=str,
    serialize=six.text_type,
    deserialize=str,
)

# Information about a running TensorBoard instance.
_TENSORBOARD_INFO_FIELDS = collections.OrderedDict((
    ("version", _type_str),
    ("start_time", _type_timestamp),
    ("pid", _type_int),
    ("port", _type_int),
    ("path_prefix", _type_str),  # may be empty
    ("logdir", _type_str),  # may be empty
    ("db", _type_str),  # may be empty
    ("cache_key", _type_str),  # opaque
))
TensorboardInfo = collections.namedtuple(
    "TensorboardInfo",
    _TENSORBOARD_INFO_FIELDS,
)

def _info_to_string(info):
  """Convert a `TensorboardInfo` to string form to be stored on disk.

  The format returned by this function is opaque and should only be
  interpreted by `_info_from_string`.

  Args:
    info: A valid `TensorboardInfo` object.

  Raises:
    ValueError: If any field on `info` is not of the correct type.

  Returns:
    A string representation of the provided `TensorboardInfo`.
  """
  for key in _TENSORBOARD_INFO_FIELDS:
    field_type = _TENSORBOARD_INFO_FIELDS[key]
    if not isinstance(getattr(info, key), field_type.runtime_type):
      raise ValueError(
          "expected %r of type %s, but found: %r" %
          (key, field_type.runtime_type, getattr(info, key))
      )
  if info.version != version.VERSION:
    raise ValueError(
        "expected 'version' to be %r, but found: %r" %
        (version.VERSION, info.version)
    )
  json_value = {
      k: _TENSORBOARD_INFO_FIELDS[k].serialize(getattr(info, k))
      for k in _TENSORBOARD_INFO_FIELDS
  }
  return json.dumps(json_value, sort_keys=True, indent=4)


def _info_from_string(info_string):
  """Parse a `TensorboardInfo` object from its string representation.

  Args:
    info_string: A string representation of a `TensorboardInfo`, as
      produced by a previous call to `_info_to_string`.

  Returns:
    A `TensorboardInfo` value.

  Raises:
    ValueError: If the provided string is not valid JSON, or if it does
      not represent a JSON object with a "version" field whose value is
      `tensorboard.version.VERSION`, or if it has the wrong set of
      fields, or if at least one field is of invalid type.
  """

  try:
    json_value = json.loads(info_string)
  except ValueError:
    raise ValueError("invalid JSON: %r" % (info_string,))
  if not isinstance(json_value, dict):
    raise ValueError("not a JSON object: %r" % (json_value,))
  if json_value.get("version") != version.VERSION:
    raise ValueError("incompatible version: %r" % (json_value,))
  expected_keys = frozenset(_TENSORBOARD_INFO_FIELDS)
  actual_keys = frozenset(json_value)
  if expected_keys != actual_keys:
    raise ValueError(
        "bad keys on TensorboardInfo (missing: %s; extraneous: %s)"
        % (expected_keys - actual_keys, actual_keys - expected_keys)
    )

  # Validate and deserialize fields.
  for key in _TENSORBOARD_INFO_FIELDS:
    field_type = _TENSORBOARD_INFO_FIELDS[key]
    if not isinstance(json_value[key], field_type.serialized_type):
      raise ValueError(
          "expected %r of type %s, but found: %r" %
          (key, field_type.serialized_type, json_value[key])
      )
    json_value[key] = field_type.deserialize(json_value[key])

  return TensorboardInfo(**json_value)
