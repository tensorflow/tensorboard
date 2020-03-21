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

from tensorboard.uploader.proto import experiment_pb2
from tensorboard.uploader.proto import export_service_pb2
from tensorboard.uploader import util
from tensorboard.util import grpc_util
from tensorboard.util import tb_logging

# Characters that are assumed to be safe in filenames. Note that the
# server's experiment IDs are base64 encodings of 16-byte blobs, so they
# can theoretically collide on case-insensitive filesystems. Each
# character has a ~3% chance of colliding, and so two random IDs have
# about a ~10^-33 chance of colliding. As a precaution, we'll still
# detect collision and fail fast rather than overwriting data.
_FILENAME_SAFE_CHARS = frozenset(string.ascii_letters + string.digits + "-_")

# Maximum value of a signed 64-bit integer.
_MAX_INT64 = 2 ** 63 - 1

# Output filename for experiment metadata (creation time, description,
# etc.) within an experiment directory.
_FILENAME_METADATA = "metadata.json"
# Output filename for scalar data within an experiment directory.
_FILENAME_SCALARS = "scalars.json"
# Output filename for blob sequences data within an experimental directly.
# This file does not contain the actual content of the blobs. Instead,
# it holds `blob_file_paths` that point to the binary files that contain
# the blobs' contents, in addition other metadata such as run and tag names.
_FILENAME_BLOB_SEQUENCES = "blob_sequences.json"

logger = tb_logging.get_logger()

_BLOBS_DIR = "blobs"
_BLOB_FILE_PREFIX = "blob_"
_BLOB_FILE_SUFFIX = ".bin"


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
        experiment_metadata_mask = experiment_pb2.ExperimentMask(
            create_time=True, update_time=True, name=True, description=True,
        )
        experiments = list_experiments(
            self._api, fieldmask=experiment_metadata_mask, read_time=read_time
        )
        for experiment in experiments:
            experiment_id = experiment.experiment_id
            experiment_metadata = {
                "name": experiment.name,
                "description": experiment.description,
                "create_time": util.format_time_absolute(
                    experiment.create_time
                ),
                "update_time": util.format_time_absolute(
                    experiment.update_time
                ),
            }
            experiment_dir = _experiment_directory(self._outdir, experiment_id)
            os.mkdir(experiment_dir)

            metadata_filepath = os.path.join(experiment_dir, _FILENAME_METADATA)
            with open(metadata_filepath, "w") as outfile:
                json.dump(experiment_metadata, outfile, sort_keys=True)
                outfile.write("\n")

            scalars_filepath = os.path.join(experiment_dir, _FILENAME_SCALARS)
            blob_sequences_filepath = os.path.join(
                experiment_dir, _FILENAME_BLOB_SEQUENCES
            )
            try:
                data = self._request_json_data(experiment_id, read_time)
                for block, filename in data:
                    if filename == _FILENAME_SCALARS:
                        filepath = scalars_filepath
                    elif filename == _FILENAME_BLOB_SEQUENCES:
                        filepath = blob_sequences_filepath
                    else:
                        continue
                    with open(filepath, "a") as outfile:
                        json.dump(block, outfile, sort_keys=True)
                        outfile.write("\n")
                        outfile.flush()
                yield experiment_id
            except grpc.RpcError as e:
                if e.code() == grpc.StatusCode.CANCELLED:
                    raise GrpcTimeoutException(experiment_id)
                else:
                    raise

    def _request_json_data(self, experiment_id, read_time):
        """Given experiment id, generates JSON data and destnation file name

        The JSON data describes the run, tag, metadata, in addition to
          - Actual data in the case of scalars
          - Pointer to binary files in the case of blob sequences.

        Args:
          experiment_id: The id of the experiment to request data for.
          read_time: Timestamp to use snapshot the Spanner database for reads.

        Yields:
          (JSON-serializable data, destination file name) tuples.
        """
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
            request, metadata=grpc_util.version_metadata()
        )
        for response in stream:
            metadata = base64.b64encode(
                response.tag_metadata.SerializeToString()
            ).decode("ascii")
            json_data = {
                u"run": response.run_name,
                u"tag": response.tag_name,
                u"summary_metadata": metadata,
            }
            filename = None
            if response.HasField("points"):
                json_data[u"points"] = self._process_scalar_points(
                    response.points
                )
                filename = _FILENAME_SCALARS
            elif response.HasField("blob_sequences"):
                json_data[u"points"] = self._process_blob_sequence_points(
                    response.blob_sequences, experiment_id
                )
                filename = _FILENAME_BLOB_SEQUENCES
            yield json_data, filename

    def _process_scalar_points(self, points):
        """Process scalar data points.

        Args:
          points: `export_service_pb2.StreamExperimentDataResponse.ScalarPoints`
            proto.

        Returns:
          A JSON-serializable `dict` for the steps, wall_times and values of the
            scalar data points.
        """
        wall_times = [t.ToNanoseconds() / 1e9 for t in points.wall_times]
        return {
            u"steps": list(points.steps),
            u"wall_times": wall_times,
            u"values": list(points.values),
        }

    def _process_blob_sequence_points(self, blob_sequences, experiment_id):
        """Process blob sequence points.

        As a side effect, also downloads the binary contents of the blobs
        to respective files. The paths to the files relative to the
        experiment directory is encapsulated in the returned JSON object.

        Args:
          blob_sequences:
            `export_service_pb2.StreamDataResponse.BlobSequencePoints` proto.

        Returns:
          A JSON-serializable `dict` for the steps and wall_times, as well as
            the blob_file_paths, which are the relative paths to the downloaded
            blob contents.
        """
        wall_times = [
            t.ToNanoseconds() / 1e9 for t in blob_sequences.wall_times
        ]
        json_object = {
            u"steps": list(blob_sequences.steps),
            u"wall_times": wall_times,
            u"blob_file_paths": [],
        }
        blob_file_paths = json_object[u"blob_file_paths"]
        for blobseq in blob_sequences.values:
            seq_blob_file_paths = []
            for entry in blobseq.entries:
                if entry.blob.blob_id:
                    blob_path = self._download_blob(
                        entry.blob.blob_id, experiment_id
                    )
                    seq_blob_file_paths.append(blob_path)
                else:
                    seq_blob_file_paths.append(None)
            blob_file_paths.append(seq_blob_file_paths)
        return json_object

    def _download_blob(self, blob_id, experiment_id):
        """Download the blob via rpc.

        Args:
          blob_id: Id of the blob.
          experiment_id: Id of the experiment where the blob belongs is
            from.

        Returns:
          If the blob is downloaded successfully:
            The path of the downloaded blob file relative to the experiment
            directory.
          Else:
            `None`.
        """
        # TODO(cais): Deduplicate with internal method perhaps.
        experiment_dir = _experiment_directory(self._outdir, experiment_id)
        blobs_dir = os.path.join(experiment_dir, _BLOBS_DIR)
        if not os.path.isdir(blobs_dir):
            _mkdir_p(blobs_dir)
        request = export_service_pb2.StreamBlobDataRequest(blob_id=blob_id)
        chunks = []
        try:
            for response in self._api.StreamBlobData(request):
                # TODO(cais, soergel): validate the various response fields
                chunks.append(response.data)
        except grpc.RpcError as rpc_error:
            logger.error(
                "An RPC error occurred during the downloading of blob with "
                "id %s. As a result, the data of the blob will be missing.",
                blob_id,
            )
            return None
        blob = b"".join(chunks)

        blob_abspath = os.path.join(
            blobs_dir, _BLOB_FILE_PREFIX + blob_id + _BLOB_FILE_SUFFIX
        )
        with open(blob_abspath, "wb") as f:
            f.write(blob)
        return os.path.relpath(blob_abspath, experiment_dir)


def list_experiments(api_client, fieldmask=None, read_time=None):
    """Yields all of the calling user's experiments.

    Args:
      api_client: A TensorBoardExporterService stub instance.
      fieldmask: An optional `experiment_pb2.ExperimentMask` value.
      read_time: A fixed timestamp from which to export data, as float seconds
        since epoch (like `time.time()`). Optional; defaults to the current
        time.

    Yields:
      For each experiment owned by the user, an `experiment_pb2.Experiment`
      value.

    Raises:
      RuntimeError: If the server returns experiment IDs but no experiments,
        as in an old, unsupported version of the protocol.
    """
    if read_time is None:
        read_time = time.time()
    request = export_service_pb2.StreamExperimentsRequest(limit=_MAX_INT64)
    util.set_timestamp(request.read_timestamp, read_time)
    if fieldmask:
        request.experiments_mask.CopyFrom(fieldmask)
    stream = api_client.StreamExperiments(
        request, metadata=grpc_util.version_metadata()
    )
    for response in stream:
        if response.experiments:
            for experiment in response.experiments:
                yield experiment
        elif response.experiment_ids:
            raise RuntimeError(
                "Server sent experiment_ids without experiments: <%r>"
                % (list(response.experiment_ids),)
            )
        else:
            # No data: not technically a problem, but not expected.
            logger.warn(
                "StreamExperiments RPC returned response with no experiments: <%r>",
                response,
            )


class OutputDirectoryExistsError(ValueError):
    pass


class OutputFileExistsError(ValueError):
    # Like Python 3's `__builtins__.FileExistsError`.
    pass


class GrpcTimeoutException(Exception):
    def __init__(self, experiment_id):
        super(GrpcTimeoutException, self).__init__(experiment_id)
        self.experiment_id = experiment_id


def _experiment_directory(base_dir, experiment_id):
    # Experiment IDs from the server should be filename-safe; verify
    # this before creating any files.
    bad_chars = frozenset(experiment_id) - _FILENAME_SAFE_CHARS
    if bad_chars:
        raise RuntimeError(
            "Unexpected characters ({bad_chars!r}) in experiment ID {eid!r}".format(
                bad_chars=sorted(bad_chars), eid=experiment_id
            )
        )
    return os.path.join(base_dir, "experiment_%s" % experiment_id)


def _mkdir_p(path):
    """Like `os.makedirs(path, exist_ok=True)`, but Python 2-compatible."""
    try:
        os.makedirs(path)
    except OSError as e:
        if e.errno != errno.EEXIST or not os.path.isdir(path):
            raise
