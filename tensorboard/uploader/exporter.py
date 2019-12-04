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
"""Downloads experiment data from TensorBoard.dev."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64
import errno
import grpc
import json
import os
import string
import time

import six

from tensorboard.uploader.proto import export_service_pb2
from tensorboard.uploader import util
from tensorboard.util import grpc_util

# Characters that are assumed to be safe in filenames. Note that the
# server's experiment IDs are base64 encodings of 16-byte blobs, so they
# can theoretically collide on case-insensitive filesystems. Each
# character has a ~3% chance of colliding, and so two random IDs have
# about a ~10^-33 chance of colliding. As a precaution, we'll still
# detect collision and fail fast rather than overwriting data.
_FILENAME_SAFE_CHARS = frozenset(string.ascii_letters + string.digits + "-_")

# Maximum value of a signed 64-bit integer.
_MAX_INT64 = 2**63 - 1

class TensorBoardExporter(object):
  """Exports all of the user's experiment data from TensorBoard.dev.

  Data is exported into a directory, with one file per experiment. Each
  experiment file is a sequence of time series, represented as a stream
  of JSON objects, one per line. Each JSON object includes a run name,
  tag name, `tensorboard.compat.proto.summary_pb2.SummaryMetadata` proto
  (base64-encoded, standard RFC 4648 alphabet), and set of points.
  Points are stored in three equal-length lists of steps, wall times (as
  seconds since epoch), and scalar values, for storage efficiency.

  Such streams of JSON objects may be conveniently processed with tools
  like jq(1).

  For example one line of an experiment file might read (when
  pretty-printed):

      {
        "points": {
          "steps": [0, 5],
          "values": [4.8935227394104, 2.5438034534454346],
          "wall_times": [1563406522.669238, 1563406523.0268838]
        },
        "run": "lr_1E-04,conv=1,fc=2",
        "summary_metadata": "CgkKB3NjYWxhcnMSC3hlbnQveGVudF8x",
        "tag": "xent/xent_1"
      }

  This is a time series with two points, both logged on 2019-07-17, one
  about 0.36 seconds after the other.
  """

  def __init__(self, reader_service_client, output_directory):
    """Constructs a TensorBoardExporter.

    Args:
      reader_service_client: A TensorBoardExporterService stub instance.
      output_directory: Path to a directory into which to write data. The
        directory must not exist, to avoid stomping existing or concurrent
        output. Its ancestors will be created if needed.
    """
    self._api = reader_service_client
    self._outdir = output_directory
    parent_dir = os.path.dirname(self._outdir)
    if parent_dir:
      _mkdir_p(parent_dir)
    try:
      os.mkdir(self._outdir)
    except OSError as e:
      if e.errno == errno.EEXIST:
        # Bail to avoid stomping existing output.
        raise OutputDirectoryExistsError()

  def export(self, read_time=None):
    """Executes the export flow.

    Args:
      read_time: A fixed timestamp from which to export data, as float seconds
        since epoch (like `time.time()`). Optional; defaults to the current
        time.

    Yields:
      After each experiment is successfully downloaded, the ID of that
      experiment, as a string.
    """
    if read_time is None:
      read_time = time.time()
    for experiment_id in self._request_experiment_ids(read_time):
      filepath = _scalars_filepath(self._outdir, experiment_id)
      try:
        with _open_excl(filepath) as outfile:
          data = self._request_scalar_data(experiment_id, read_time)
          for block in data:
            json.dump(block, outfile, sort_keys=True)
            outfile.write("\n")
            outfile.flush()
        yield experiment_id
      except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.CANCELLED:
          raise GrpcTimeoutException(experiment_id)
        else:
          raise

  def _request_experiment_ids(self, read_time):
    """Yields all of the calling user's experiment IDs, as strings."""
    for experiment in list_experiments(self._api, read_time=read_time):
      if isinstance(experiment, export_service_pb2.Experiment):
        yield experiment.experiment_id
      elif isinstance(experiment, six.string_types):
        yield experiment
      else:
        raise AssertionError("Unexpected experiment type: %r" % (experiment,))

  def _request_scalar_data(self, experiment_id, read_time):
    """Yields JSON-serializable blocks of scalar data."""
    request = export_service_pb2.StreamExperimentDataRequest()
    request.experiment_id = experiment_id
    util.set_timestamp(request.read_timestamp, read_time)
    # No special error handling as we don't expect any errors from these
    # calls: all experiments should exist (read consistency timestamp)
    # and be owned by the calling user (only queried for own experiment
    # IDs). Any non-transient errors would be internal, and we have no
    # way to efficiently resume from transient errors because the server
    # does not support pagination.
    stream = self._api.StreamExperimentData(
        request, metadata=grpc_util.version_metadata())
    for response in stream:
      metadata = base64.b64encode(
          response.tag_metadata.SerializeToString()).decode("ascii")
      wall_times = [t.ToNanoseconds() / 1e9 for t in response.points.wall_times]
      yield {
          u"run": response.run_name,
          u"tag": response.tag_name,
          u"summary_metadata": metadata,
          u"points": {
              u"steps": list(response.points.steps),
              u"wall_times": wall_times,
              u"values": list(response.points.values),
          },
      }


def list_experiments(api_client, fieldmask=None, read_time=None):
  """Yields all of the calling user's experiments.

  Args:
    api_client: A TensorBoardExporterService stub instance.
    fieldmask: An optional `export_service_pb2.ExperimentMask` value.
    read_time: A fixed timestamp from which to export data, as float seconds
      since epoch (like `time.time()`). Optional; defaults to the current
      time.

  Yields:
    For each experiment owned by the user, an `export_service_pb2.Experiment`
    value, or a simple string experiment ID for older servers.
  """
  if read_time is None:
    read_time = time.time()
  request = export_service_pb2.StreamExperimentsRequest(limit=_MAX_INT64)
  util.set_timestamp(request.read_timestamp, read_time)
  if fieldmask:
    request.experiments_mask.CopyFrom(fieldmask)
  stream = api_client.StreamExperiments(
      request, metadata=grpc_util.version_metadata())
  for response in stream:
    if response.experiments:
      for experiment in response.experiments:
        yield experiment
    else:
      # Old servers.
      for experiment_id in response.experiment_ids:
        yield experiment_id


class OutputDirectoryExistsError(ValueError):
  pass


class OutputFileExistsError(ValueError):
  # Like Python 3's `__builtins__.FileExistsError`.
  pass

class GrpcTimeoutException(Exception):
  def __init__(self, experiment_id):
    super(GrpcTimeoutException, self).__init__(experiment_id)
    self.experiment_id = experiment_id

def _scalars_filepath(base_dir, experiment_id):
  """Gets file path in which to store scalars for the given experiment."""
  # Experiment IDs from the server should be filename-safe; verify
  # this before creating any files.
  bad_chars = frozenset(experiment_id) - _FILENAME_SAFE_CHARS
  if bad_chars:
    raise RuntimeError(
        "Unexpected characters ({bad_chars!r}) in experiment ID {eid!r}".format(
            bad_chars=sorted(bad_chars), eid=experiment_id))
  return os.path.join(base_dir, "scalars_%s.json" % experiment_id)


def _mkdir_p(path):
  """Like `os.makedirs(path, exist_ok=True)`, but Python 2-compatible."""
  try:
    os.makedirs(path)
  except OSError as e:
    if e.errno != errno.EEXIST or not os.path.isdir(path):
      raise


def _open_excl(path):
  """Like `open(path, "x")`, but Python 2-compatible."""
  try:
    # `os.O_EXCL` works on Windows as well as POSIX-compliant systems.
    # See: <https://bugs.python.org/issue12760>
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
  except OSError as e:
    if e.errno == errno.EEXIST:
      raise OutputFileExistsError(path)
    else:
      raise
  return os.fdopen(fd, "w")
