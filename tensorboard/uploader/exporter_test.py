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
"""Tests for tensorboard.uploader.exporter."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import base64
import json
import os

import grpc
import grpc_testing
import numpy as np

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import


from tensorboard.uploader.proto import blob_pb2
from tensorboard.uploader.proto import experiment_pb2
from tensorboard.uploader.proto import export_service_pb2
from tensorboard.uploader.proto import export_service_pb2_grpc
from tensorboard.uploader import exporter as exporter_lib
from tensorboard.uploader import test_util
from tensorboard.uploader import util
from tensorboard.util import grpc_util
from tensorboard.util import tensor_util
from tensorboard import test as tb_test
from tensorboard.compat.proto import summary_pb2


def _make_experiments_response(eids):
    """Make a `StreamExperimentsResponse` with experiments with only IDs."""
    response = export_service_pb2.StreamExperimentsResponse()
    for eid in eids:
        response.experiments.add(experiment_id=eid)
    return response


def _outdir_files(outdir):
    """Recursively list `outdir`."""
    result = []
    for (dirpath, dirnames, filenames) in os.walk(outdir):
        for filename in filenames:
            fullpath = os.path.join(dirpath, filename)
            result.append(os.path.relpath(fullpath, outdir))
    return result


class TensorBoardExporterTest(tb_test.TestCase):
    def _create_mock_api_client(self):
        return _create_mock_api_client()

    def test_e2e_success_case_with_only_scalar_data(self):
        mock_api_client = self._create_mock_api_client()
        mock_api_client.StreamExperiments.return_value = iter(
            [_make_experiments_response(["789"])]
        )

        def stream_experiments(request, **kwargs):
            del request  # unused
            self.assertEqual(kwargs["metadata"], grpc_util.version_metadata())

            response = export_service_pb2.StreamExperimentsResponse()
            response.experiments.add(experiment_id="123")
            response.experiments.add(experiment_id="456")
            yield response

            response = export_service_pb2.StreamExperimentsResponse()
            experiment = response.experiments.add()
            experiment.experiment_id = "789"
            experiment.name = "bert"
            experiment.description = "ernie"
            util.set_timestamp(experiment.create_time, 981173106)
            util.set_timestamp(experiment.update_time, 1015218367)
            yield response

        def stream_experiment_data(request, **kwargs):
            self.assertEqual(kwargs["metadata"], grpc_util.version_metadata())
            for run in ("train", "test"):
                for tag in ("accuracy", "loss"):
                    response = export_service_pb2.StreamExperimentDataResponse()
                    response.run_name = run
                    response.tag_name = tag
                    display_name = "%s:%s" % (request.experiment_id, tag)
                    response.tag_metadata.CopyFrom(
                        test_util.scalar_metadata(display_name)
                    )
                    for step in range(10):
                        response.points.steps.append(step)
                        response.points.values.append(2.0 * step)
                        response.points.wall_times.add(
                            seconds=1571084520 + step, nanos=862939144
                        )
                    yield response

        mock_api_client.StreamExperiments = mock.Mock(wraps=stream_experiments)
        mock_api_client.StreamExperimentData = mock.Mock(
            wraps=stream_experiment_data
        )

        outdir = os.path.join(self.get_temp_dir(), "outdir")
        exporter = exporter_lib.TensorBoardExporter(mock_api_client, outdir)
        start_time = 1571084846.25
        start_time_pb = test_util.timestamp_pb(1571084846250000000)

        generator = exporter.export(read_time=start_time)
        expected_files = []
        self.assertTrue(os.path.isdir(outdir))
        self.assertCountEqual(expected_files, _outdir_files(outdir))
        mock_api_client.StreamExperiments.assert_not_called()
        mock_api_client.StreamExperimentData.assert_not_called()

        # The first iteration should request the list of experiments and
        # data for one of them.
        self.assertEqual(next(generator), "123")
        expected_files.append(os.path.join("experiment_123", "metadata.json"))
        expected_files.append(os.path.join("experiment_123", "scalars.json"))
        expected_files.append(os.path.join("experiment_123", "tensors.json"))
        # blob_sequences.json should exist and be empty.
        expected_files.append(
            os.path.join("experiment_123", "blob_sequences.json")
        )
        self.assertCountEqual(expected_files, _outdir_files(outdir))

        # Check that the tensors and blob_sequences data files are empty, because
        # there are no tensors or blob sequences.
        with open(
            os.path.join(outdir, "experiment_123", "tensors.json")
        ) as infile:
            self.assertEqual(infile.read(), "")
        with open(
            os.path.join(outdir, "experiment_123", "blob_sequences.json")
        ) as infile:
            self.assertEqual(infile.read(), "")

        expected_eids_request = export_service_pb2.StreamExperimentsRequest()
        expected_eids_request.read_timestamp.CopyFrom(start_time_pb)
        expected_eids_request.limit = 2 ** 63 - 1
        expected_eids_request.experiments_mask.create_time = True
        expected_eids_request.experiments_mask.update_time = True
        expected_eids_request.experiments_mask.name = True
        expected_eids_request.experiments_mask.description = True
        mock_api_client.StreamExperiments.assert_called_once_with(
            expected_eids_request, metadata=grpc_util.version_metadata()
        )

        expected_data_request = export_service_pb2.StreamExperimentDataRequest()
        expected_data_request.experiment_id = "123"
        expected_data_request.read_timestamp.CopyFrom(start_time_pb)
        mock_api_client.StreamExperimentData.assert_called_once_with(
            expected_data_request, metadata=grpc_util.version_metadata()
        )

        # The next iteration should just request data for the next experiment.
        mock_api_client.StreamExperiments.reset_mock()
        mock_api_client.StreamExperimentData.reset_mock()
        self.assertEqual(next(generator), "456")

        expected_files.append(os.path.join("experiment_456", "metadata.json"))
        expected_files.append(os.path.join("experiment_456", "scalars.json"))
        expected_files.append(os.path.join("experiment_456", "tensors.json"))
        # blob_sequences.json should exist and be empty.
        expected_files.append(
            os.path.join("experiment_456", "blob_sequences.json")
        )
        self.assertCountEqual(expected_files, _outdir_files(outdir))
        mock_api_client.StreamExperiments.assert_not_called()
        expected_data_request.experiment_id = "456"
        mock_api_client.StreamExperimentData.assert_called_once_with(
            expected_data_request, metadata=grpc_util.version_metadata()
        )

        # Again, request data for the next experiment; this experiment ID
        # was in the second response batch in the list of IDs.
        expected_files.append(os.path.join("experiment_789", "metadata.json"))
        expected_files.append(os.path.join("experiment_789", "scalars.json"))
        expected_files.append(os.path.join("experiment_789", "tensors.json"))
        # blob_sequences.json should exist and be empty.
        expected_files.append(
            os.path.join("experiment_789", "blob_sequences.json")
        )
        mock_api_client.StreamExperiments.reset_mock()
        mock_api_client.StreamExperimentData.reset_mock()
        self.assertEqual(next(generator), "789")

        self.assertCountEqual(expected_files, _outdir_files(outdir))
        mock_api_client.StreamExperiments.assert_not_called()
        expected_data_request.experiment_id = "789"
        mock_api_client.StreamExperimentData.assert_called_once_with(
            expected_data_request, metadata=grpc_util.version_metadata()
        )

        # The final continuation shouldn't need to send any RPCs.
        mock_api_client.StreamExperiments.reset_mock()
        mock_api_client.StreamExperimentData.reset_mock()
        self.assertEqual(list(generator), [])

        self.assertCountEqual(expected_files, _outdir_files(outdir))
        mock_api_client.StreamExperiments.assert_not_called()
        mock_api_client.StreamExperimentData.assert_not_called()

        # Spot-check one of the scalar data files.
        with open(
            os.path.join(outdir, "experiment_456", "scalars.json")
        ) as infile:
            jsons = [json.loads(line) for line in infile]
        self.assertLen(jsons, 4)
        datum = jsons[2]
        self.assertEqual(datum.pop("run"), "test")
        self.assertEqual(datum.pop("tag"), "accuracy")
        summary_metadata = summary_pb2.SummaryMetadata.FromString(
            base64.b64decode(datum.pop("summary_metadata"))
        )
        expected_summary_metadata = test_util.scalar_metadata("456:accuracy")
        self.assertEqual(summary_metadata, expected_summary_metadata)
        points = datum.pop("points")
        expected_steps = [x for x in range(10)]
        expected_values = [2.0 * x for x in range(10)]
        expected_wall_times = [1571084520.862939144 + x for x in range(10)]
        self.assertEqual(points.pop("steps"), expected_steps)
        self.assertEqual(points.pop("values"), expected_values)
        self.assertEqual(points.pop("wall_times"), expected_wall_times)
        self.assertEqual(points, {})
        self.assertEqual(datum, {})

        # Check that one of the blob_sequences data file is empty, because there
        # no blob sequences in this experiment.
        with open(
            os.path.join(outdir, "experiment_456", "blob_sequences.json")
        ) as infile:
            self.assertEqual(infile.read(), "")

        # Spot-check one of the metadata files.
        with open(
            os.path.join(outdir, "experiment_789", "metadata.json")
        ) as infile:
            metadata = json.load(infile)
        self.assertEqual(
            metadata,
            {
                "name": "bert",
                "description": "ernie",
                "create_time": "2001-02-03T04:05:06Z",
                "update_time": "2002-03-04T05:06:07Z",
            },
        )

    def test_e2e_success_case_with_only_tensors_data(self):
        mock_api_client = self._create_mock_api_client()

        def stream_experiments(request, **kwargs):
            del request  # unused
            self.assertEqual(kwargs["metadata"], grpc_util.version_metadata())

            response = export_service_pb2.StreamExperimentsResponse()
            response.experiments.add(experiment_id="123")
            yield response

        def stream_experiment_data(request, **kwargs):
            self.assertEqual(kwargs["metadata"], grpc_util.version_metadata())
            for run in ("train_1", "train_2"):
                for tag in ("dense_1/kernel", "dense_1/bias"):
                    response = export_service_pb2.StreamExperimentDataResponse()
                    response.run_name = run
                    response.tag_name = tag
                    display_name = "%s:%s" % (request.experiment_id, tag)
                    response.tag_metadata.CopyFrom(
                        test_util.scalar_metadata(display_name)
                    )
                    for step in range(2):
                        response.tensors.steps.append(step)
                        response.tensors.wall_times.add(
                            seconds=1571084520 + step,
                            nanos=862939144 if run == "train_1" else 962939144,
                        )
                        response.tensors.values.append(
                            tensor_util.make_tensor_proto(
                                np.ones([3, 2]) * step
                            )
                        )
                    yield response

        mock_api_client.StreamExperiments = mock.Mock(wraps=stream_experiments)
        mock_api_client.StreamExperimentData = mock.Mock(
            wraps=stream_experiment_data
        )

        outdir = os.path.join(self.get_temp_dir(), "outdir")
        exporter = exporter_lib.TensorBoardExporter(mock_api_client, outdir)
        start_time = 1571084846.25
        start_time_pb = test_util.timestamp_pb(1571084846250000000)

        generator = exporter.export(read_time=start_time)
        expected_files = []
        self.assertTrue(os.path.isdir(outdir))
        self.assertCountEqual(expected_files, _outdir_files(outdir))
        mock_api_client.StreamExperiments.assert_not_called()
        mock_api_client.StreamExperimentData.assert_not_called()

        # The first iteration should request the list of experiments and
        # data for one of them.
        self.assertEqual(next(generator), "123")
        expected_files.append(os.path.join("experiment_123", "metadata.json"))
        # scalars.json should exist and be empty.
        expected_files.append(os.path.join("experiment_123", "scalars.json"))
        expected_files.append(os.path.join("experiment_123", "tensors.json"))
        # blob_sequences.json should exist and be empty.
        expected_files.append(
            os.path.join("experiment_123", "blob_sequences.json")
        )
        expected_files.append(
            os.path.join("experiment_123", "tensors", "1571084520.862939.npz")
        )
        expected_files.append(
            os.path.join("experiment_123", "tensors", "1571084520.862939_1.npz")
        )
        expected_files.append(
            os.path.join("experiment_123", "tensors", "1571084520.962939.npz")
        )
        expected_files.append(
            os.path.join("experiment_123", "tensors", "1571084520.962939_1.npz")
        )
        self.assertCountEqual(expected_files, _outdir_files(outdir))

        # Check that the scalars and blob_sequences data files are empty, because
        # there are no scalars or blob sequences.
        with open(
            os.path.join(outdir, "experiment_123", "scalars.json")
        ) as infile:
            self.assertEqual(infile.read(), "")
        with open(
            os.path.join(outdir, "experiment_123", "blob_sequences.json")
        ) as infile:
            self.assertEqual(infile.read(), "")

        expected_eids_request = export_service_pb2.StreamExperimentsRequest()
        expected_eids_request.read_timestamp.CopyFrom(start_time_pb)
        expected_eids_request.limit = 2 ** 63 - 1
        expected_eids_request.experiments_mask.create_time = True
        expected_eids_request.experiments_mask.update_time = True
        expected_eids_request.experiments_mask.name = True
        expected_eids_request.experiments_mask.description = True
        mock_api_client.StreamExperiments.assert_called_once_with(
            expected_eids_request, metadata=grpc_util.version_metadata()
        )

        expected_data_request = export_service_pb2.StreamExperimentDataRequest()
        expected_data_request.experiment_id = "123"
        expected_data_request.read_timestamp.CopyFrom(start_time_pb)
        mock_api_client.StreamExperimentData.assert_called_once_with(
            expected_data_request, metadata=grpc_util.version_metadata()
        )

        # The final StreamExperiments continuation shouldn't need to send any
        # RPCs.
        mock_api_client.StreamExperiments.reset_mock()
        mock_api_client.StreamExperimentData.reset_mock()
        self.assertEqual(list(generator), [])

        # Check tensor data.
        with open(
            os.path.join(outdir, "experiment_123", "tensors.json")
        ) as infile:
            jsons = [json.loads(line) for line in infile]
        self.assertLen(jsons, 4)

        datum = jsons[0]
        self.assertEqual(datum.pop("run"), "train_1")
        self.assertEqual(datum.pop("tag"), "dense_1/kernel")
        summary_metadata = summary_pb2.SummaryMetadata.FromString(
            base64.b64decode(datum.pop("summary_metadata"))
        )
        expected_summary_metadata = test_util.scalar_metadata(
            "123:dense_1/kernel"
        )
        self.assertEqual(summary_metadata, expected_summary_metadata)
        points = datum.pop("points")
        self.assertEqual(points.pop("steps"), [0, 1])
        self.assertEqual(
            points.pop("tensors_file_path"),
            os.path.join("tensors", "1571084520.862939.npz"),
        )
        self.assertEqual(datum, {})

        datum = jsons[3]
        self.assertEqual(datum.pop("run"), "train_2")
        self.assertEqual(datum.pop("tag"), "dense_1/bias")
        summary_metadata = summary_pb2.SummaryMetadata.FromString(
            base64.b64decode(datum.pop("summary_metadata"))
        )
        expected_summary_metadata = test_util.scalar_metadata(
            "123:dense_1/bias"
        )
        self.assertEqual(summary_metadata, expected_summary_metadata)
        points = datum.pop("points")
        self.assertEqual(points.pop("steps"), [0, 1])
        self.assertEqual(
            points.pop("tensors_file_path"),
            os.path.join("tensors", "1571084520.962939_1.npz"),
        )
        self.assertEqual(datum, {})

        # Load and check the tensor data from the save .npz files.
        for filename in (
            "1571084520.862939.npz",
            "1571084520.862939_1.npz",
            "1571084520.962939.npz",
            "1571084520.962939_1.npz",
        ):
            tensors = np.load(
                os.path.join(outdir, "experiment_123", "tensors", filename)
            )
            tensors = [tensors[key] for key in tensors.keys()]
            self.assertLen(tensors, 2)
            np.testing.assert_array_equal(tensors[0], 0 * np.ones([3, 2]))
            np.testing.assert_array_equal(tensors[1], 1 * np.ones([3, 2]))

    def test_e2e_success_case_with_blob_sequence_data(self):
        """Covers exporting of complete and incomplete blob sequences

        as well as rpc error during blob streaming.
        """
        mock_api_client = self._create_mock_api_client()

        def stream_experiments(request, **kwargs):
            del request  # unused
            self.assertEqual(kwargs["metadata"], grpc_util.version_metadata())

            response = export_service_pb2.StreamExperimentsResponse()
            response.experiments.add(experiment_id="123")
            yield response
            response = export_service_pb2.StreamExperimentsResponse()
            response.experiments.add(experiment_id="456")
            yield response

        def stream_experiment_data(request, **kwargs):
            self.assertEqual(kwargs["metadata"], grpc_util.version_metadata())

            tag = "__default_graph__"
            for run in ("train", "test"):
                response = export_service_pb2.StreamExperimentDataResponse()
                response.run_name = run
                response.tag_name = tag
                display_name = "%s:%s" % (request.experiment_id, tag)
                response.tag_metadata.CopyFrom(
                    summary_pb2.SummaryMetadata(
                        data_class=summary_pb2.DATA_CLASS_BLOB_SEQUENCE
                    )
                )
                for step in range(1):
                    response.blob_sequences.steps.append(step)
                    response.blob_sequences.wall_times.add(
                        seconds=1571084520 + step, nanos=862939144
                    )
                    blob_sequence = blob_pb2.BlobSequence()
                    if run == "train":
                        # A finished blob sequence.
                        blob = blob_pb2.Blob(
                            blob_id="%s_blob" % run,
                            state=blob_pb2.BlobState.BLOB_STATE_CURRENT,
                        )
                        blob_sequence.entries.append(
                            blob_pb2.BlobSequenceEntry(blob=blob)
                        )
                        # An unfinished blob sequence.
                        blob = blob_pb2.Blob(
                            state=blob_pb2.BlobState.BLOB_STATE_UNFINALIZED,
                        )
                        blob_sequence.entries.append(
                            blob_pb2.BlobSequenceEntry(blob=blob)
                        )
                    elif run == "test":
                        blob_sequence.entries.append(
                            # `blob` unspecified: a hole in the blob sequence.
                            blob_pb2.BlobSequenceEntry()
                        )
                    response.blob_sequences.values.append(blob_sequence)
                yield response

        mock_api_client.StreamExperiments = mock.Mock(wraps=stream_experiments)
        mock_api_client.StreamExperimentData = mock.Mock(
            wraps=stream_experiment_data
        )
        mock_api_client.StreamBlobData.side_effect = [
            iter(
                [
                    export_service_pb2.StreamBlobDataResponse(
                        data=b"4321", offset=0, final_chunk=False,
                    ),
                    export_service_pb2.StreamBlobDataResponse(
                        data=b"8765", offset=4, final_chunk=True,
                    ),
                ]
            ),
            # Raise error from `StreamBlobData` to test the grpc-error
            # condition.
            test_util.grpc_error(grpc.StatusCode.INTERNAL, "Error for testing"),
        ]

        outdir = os.path.join(self.get_temp_dir(), "outdir")
        exporter = exporter_lib.TensorBoardExporter(mock_api_client, outdir)
        start_time = 1571084846.25
        start_time_pb = test_util.timestamp_pb(1571084846250000000)

        generator = exporter.export(read_time=start_time)
        expected_files = []
        self.assertTrue(os.path.isdir(outdir))
        self.assertCountEqual(expected_files, _outdir_files(outdir))
        mock_api_client.StreamExperiments.assert_not_called()
        mock_api_client.StreamExperimentData.assert_not_called()

        # The first iteration should request the list of experiments and
        # data for one of them.
        self.assertEqual(next(generator), "123")
        expected_files.append(os.path.join("experiment_123", "metadata.json"))
        # scalars.json and tensors.json should exist and be empty.
        expected_files.append(os.path.join("experiment_123", "scalars.json"))
        expected_files.append(os.path.join("experiment_123", "tensors.json"))
        expected_files.append(
            os.path.join("experiment_123", "blob_sequences.json")
        )
        expected_files.append(
            os.path.join("experiment_123", "blobs", "blob_train_blob.bin")
        )
        # blobs/blob_test_blob.bin should not exist, because it contains
        # an unfinished blob.
        self.assertCountEqual(expected_files, _outdir_files(outdir))

        # Check that the scalars and tensors data files are empty, because there
        # no scalars or tensors.
        with open(
            os.path.join(outdir, "experiment_123", "scalars.json")
        ) as infile:
            self.assertEqual(infile.read(), "")
        with open(
            os.path.join(outdir, "experiment_123", "tensors.json")
        ) as infile:
            self.assertEqual(infile.read(), "")

        # Check the blob_sequences.json file.
        with open(
            os.path.join(outdir, "experiment_123", "blob_sequences.json")
        ) as infile:
            jsons = [json.loads(line) for line in infile]
        self.assertLen(jsons, 2)

        datum = jsons[0]
        self.assertEqual(datum.pop("run"), "train")
        self.assertEqual(datum.pop("tag"), "__default_graph__")
        summary_metadata = summary_pb2.SummaryMetadata.FromString(
            base64.b64decode(datum.pop("summary_metadata"))
        )
        expected_summary_metadata = summary_pb2.SummaryMetadata(
            data_class=summary_pb2.DATA_CLASS_BLOB_SEQUENCE
        )
        self.assertEqual(summary_metadata, expected_summary_metadata)
        points = datum.pop("points")
        self.assertEqual(datum, {})
        self.assertEqual(points.pop("steps"), [0])
        self.assertEqual(points.pop("wall_times"), [1571084520.862939144])
        # The 1st blob is finished; the 2nd is unfinished.
        self.assertEqual(
            points.pop("blob_file_paths"), [["blobs/blob_train_blob.bin", None]]
        )
        self.assertEqual(points, {})

        datum = jsons[1]
        self.assertEqual(datum.pop("run"), "test")
        self.assertEqual(datum.pop("tag"), "__default_graph__")
        summary_metadata = summary_pb2.SummaryMetadata.FromString(
            base64.b64decode(datum.pop("summary_metadata"))
        )
        self.assertEqual(summary_metadata, expected_summary_metadata)
        points = datum.pop("points")
        self.assertEqual(datum, {})
        self.assertEqual(points.pop("steps"), [0])
        self.assertEqual(points.pop("wall_times"), [1571084520.862939144])
        # `None` blob file path indicates an unfinished blob.
        self.assertEqual(points.pop("blob_file_paths"), [[None]])
        self.assertEqual(points, {})

        # Check the BLOB files.
        with open(
            os.path.join(
                outdir, "experiment_123", "blobs", "blob_train_blob.bin"
            ),
            "rb",
        ) as f:
            self.assertEqual(f.read(), b"43218765")

        # Check call to StreamBlobData.
        expected_blob_data_request = export_service_pb2.StreamBlobDataRequest(
            blob_id="train_blob"
        )
        mock_api_client.StreamBlobData.assert_called_once_with(
            expected_blob_data_request, metadata=grpc_util.version_metadata()
        )

        # Test the case where blob streaming errors out.
        self.assertEqual(next(generator), "456")
        # Check the blob_sequences.json file.
        with open(
            os.path.join(outdir, "experiment_456", "blob_sequences.json")
        ) as infile:
            jsons = [json.loads(line) for line in infile]
        self.assertLen(jsons, 2)

        datum = jsons[0]
        self.assertEqual(datum.pop("run"), "train")
        self.assertEqual(datum.pop("tag"), "__default_graph__")
        summary_metadata = summary_pb2.SummaryMetadata.FromString(
            base64.b64decode(datum.pop("summary_metadata"))
        )
        self.assertEqual(summary_metadata, expected_summary_metadata)
        points = datum.pop("points")
        self.assertEqual(datum, {})
        self.assertEqual(points.pop("steps"), [0])
        self.assertEqual(points.pop("wall_times"), [1571084520.862939144])
        # `None` represents the blob that experienced error during downloading
        # and hence is missing.
        self.assertEqual(points.pop("blob_file_paths"), [[None, None]])
        self.assertEqual(points, {})

        datum = jsons[1]
        self.assertEqual(datum.pop("run"), "test")
        self.assertEqual(datum.pop("tag"), "__default_graph__")
        summary_metadata = summary_pb2.SummaryMetadata.FromString(
            base64.b64decode(datum.pop("summary_metadata"))
        )
        self.assertEqual(summary_metadata, expected_summary_metadata)
        points = datum.pop("points")
        self.assertEqual(datum, {})
        self.assertEqual(points.pop("steps"), [0])
        self.assertEqual(points.pop("wall_times"), [1571084520.862939144])
        # `None` represents the blob that experienced error during downloading
        # and hence is missing.
        self.assertEqual(points.pop("blob_file_paths"), [[None]])
        self.assertEqual(points, {})

    def test_rejects_dangerous_experiment_ids(self):
        mock_api_client = self._create_mock_api_client()

        def stream_experiments(request, **kwargs):
            del request  # unused
            yield _make_experiments_response(["../authorized_keys"])

        mock_api_client.StreamExperiments = stream_experiments

        outdir = os.path.join(self.get_temp_dir(), "outdir")
        exporter = exporter_lib.TensorBoardExporter(mock_api_client, outdir)
        generator = exporter.export()

        with self.assertRaises(RuntimeError) as cm:
            next(generator)

        msg = str(cm.exception)
        self.assertIn("Unexpected characters", msg)
        self.assertIn(repr(sorted([u".", u"/"])), msg)
        self.assertIn("../authorized_keys", msg)
        mock_api_client.StreamExperimentData.assert_not_called()

    def test_fails_nicely_on_stream_experiment_data_timeout(self):
        # Setup: Client where:
        #   1. stream_experiments will say there is one experiment_id.
        #   2. stream_experiment_data will raise a grpc CANCELLED, as per
        #      a timeout.
        mock_api_client = self._create_mock_api_client()
        experiment_id = "123"

        def stream_experiments(request, **kwargs):
            del request  # unused
            yield _make_experiments_response([experiment_id])

        def stream_experiment_data(request, **kwargs):
            raise test_util.grpc_error(
                grpc.StatusCode.CANCELLED, "details string"
            )

        mock_api_client.StreamExperiments = stream_experiments
        mock_api_client.StreamExperimentData = stream_experiment_data

        outdir = os.path.join(self.get_temp_dir(), "outdir")
        # Execute: exporter.export()
        exporter = exporter_lib.TensorBoardExporter(mock_api_client, outdir)
        generator = exporter.export()
        # Expect: A nice exception of the right type and carrying the right
        #   experiment_id.
        with self.assertRaises(exporter_lib.GrpcTimeoutException) as cm:
            next(generator)
        self.assertEquals(cm.exception.experiment_id, experiment_id)

    def test_stream_experiment_data_passes_through_unexpected_exception(self):
        # Setup: Client where:
        #   1. stream_experiments will say there is one experiment_id.
        #   2. stream_experiment_data will throw an internal error.
        mock_api_client = self._create_mock_api_client()
        experiment_id = "123"

        def stream_experiments(request, **kwargs):
            del request  # unused
            yield _make_experiments_response([experiment_id])

        def stream_experiment_data(request, **kwargs):
            del request  # unused
            raise test_util.grpc_error(
                grpc.StatusCode.INTERNAL, "details string"
            )

        mock_api_client.StreamExperiments = stream_experiments
        mock_api_client.StreamExperimentData = stream_experiment_data

        outdir = os.path.join(self.get_temp_dir(), "outdir")
        # Execute: exporter.export().
        exporter = exporter_lib.TensorBoardExporter(mock_api_client, outdir)
        generator = exporter.export()
        # Expect: The internal error is passed through.
        with self.assertRaises(grpc.RpcError) as cm:
            next(generator)
        self.assertEquals(cm.exception.details(), "details string")

    def test_handles_outdir_with_no_slash(self):
        oldcwd = os.getcwd()
        try:
            os.chdir(self.get_temp_dir())
            mock_api_client = self._create_mock_api_client()
            mock_api_client.StreamExperiments.return_value = iter(
                [_make_experiments_response(["123"])]
            )
            mock_api_client.StreamExperimentData.return_value = iter(
                [export_service_pb2.StreamExperimentDataResponse()]
            )

            exporter = exporter_lib.TensorBoardExporter(
                mock_api_client, "outdir"
            )
            generator = exporter.export()
            self.assertEqual(list(generator), ["123"])
            self.assertTrue(os.path.isdir("outdir"))
        finally:
            os.chdir(oldcwd)

    def test_rejects_existing_directory(self):
        mock_api_client = self._create_mock_api_client()
        outdir = os.path.join(self.get_temp_dir(), "outdir")
        os.mkdir(outdir)
        with open(os.path.join(outdir, "scalars_999.json"), "w"):
            pass

        with self.assertRaises(exporter_lib.OutputDirectoryExistsError):
            exporter_lib.TensorBoardExporter(mock_api_client, outdir)

        mock_api_client.StreamExperiments.assert_not_called()
        mock_api_client.StreamExperimentData.assert_not_called()

    def test_propagates_mkdir_errors(self):
        mock_api_client = self._create_mock_api_client()
        outdir = os.path.join(self.get_temp_dir(), "some_file", "outdir")
        with open(os.path.join(self.get_temp_dir(), "some_file"), "w"):
            pass

        with self.assertRaises(OSError):
            exporter_lib.TensorBoardExporter(mock_api_client, outdir)

        mock_api_client.StreamExperiments.assert_not_called()
        mock_api_client.StreamExperimentData.assert_not_called()


class ListExperimentsTest(tb_test.TestCase):
    def test_experiment_ids_only(self):
        # Legacy server behavior; should raise an error.
        mock_api_client = _create_mock_api_client()

        def stream_experiments(request, **kwargs):
            del request  # unused
            yield export_service_pb2.StreamExperimentsResponse(
                experiment_ids=["123", "456"]
            )
            yield export_service_pb2.StreamExperimentsResponse(
                experiment_ids=["789"]
            )

        mock_api_client.StreamExperiments = mock.Mock(wraps=stream_experiments)
        with self.assertRaises(RuntimeError) as cm:
            list(exporter_lib.list_experiments(mock_api_client))
        self.assertIn(repr(["123", "456"]), str(cm.exception))

    def test_mixed_experiments_and_ids(self):
        mock_api_client = _create_mock_api_client()

        def stream_experiments(request, **kwargs):
            del request  # unused

            # Should ignore `experiment_ids` in the presence of `experiments`.
            response = export_service_pb2.StreamExperimentsResponse()
            response.experiment_ids.append("999")  # will be omitted
            response.experiments.add(experiment_id="789")
            response.experiments.add(experiment_id="012")
            yield response

        mock_api_client.StreamExperiments = mock.Mock(wraps=stream_experiments)
        gen = exporter_lib.list_experiments(mock_api_client)
        mock_api_client.StreamExperiments.assert_not_called()
        expected = [
            experiment_pb2.Experiment(experiment_id="789"),
            experiment_pb2.Experiment(experiment_id="012"),
        ]
        self.assertEqual(list(gen), expected)

    def test_experiments_only(self):
        mock_api_client = _create_mock_api_client()

        def stream_experiments(request, **kwargs):
            del request  # unused
            response = export_service_pb2.StreamExperimentsResponse()
            response.experiments.add(experiment_id="789", name="one")
            response.experiments.add(experiment_id="012", description="two")
            yield response

        mock_api_client.StreamExperiments = mock.Mock(wraps=stream_experiments)
        gen = exporter_lib.list_experiments(mock_api_client)
        mock_api_client.StreamExperiments.assert_not_called()
        expected = [
            experiment_pb2.Experiment(experiment_id="789", name="one"),
            experiment_pb2.Experiment(experiment_id="012", description="two"),
        ]
        self.assertEqual(list(gen), expected)


def _create_mock_api_client():
    # Create a stub instance (using a test channel) in order to derive a mock
    # from it with autospec enabled. Mocking TensorBoardExporterServiceStub
    # itself doesn't work with autospec because grpc constructs stubs via
    # metaclassing.
    test_channel = grpc_testing.channel(
        service_descriptors=[], time=grpc_testing.strict_real_time()
    )
    stub = export_service_pb2_grpc.TensorBoardExporterServiceStub(test_channel)
    mock_api_client = mock.create_autospec(stub)
    return mock_api_client


if __name__ == "__main__":
    tb_test.main()
