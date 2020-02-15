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
import errno
import json
import os

import grpc
import grpc_testing

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import


from tensorboard.uploader.proto import experiment_pb2
from tensorboard.uploader.proto import export_service_pb2
from tensorboard.uploader.proto import export_service_pb2_grpc
from tensorboard.uploader import exporter as exporter_lib
from tensorboard.uploader import test_util
from tensorboard.util import grpc_util
from tensorboard import test as tb_test
from tensorboard.compat.proto import summary_pb2


class TensorBoardExporterTest(tb_test.TestCase):
    def _create_mock_api_client(self):
        return _create_mock_api_client()

    def _make_experiments_response(self, eids):
        return export_service_pb2.StreamExperimentsResponse(experiment_ids=eids)

    def test_e2e_success_case(self):
        mock_api_client = self._create_mock_api_client()
        mock_api_client.StreamExperiments.return_value = iter(
            [
                export_service_pb2.StreamExperimentsResponse(
                    experiment_ids=["789"]
                ),
            ]
        )

        def stream_experiments(request, **kwargs):
            del request  # unused
            self.assertEqual(kwargs["metadata"], grpc_util.version_metadata())
            yield export_service_pb2.StreamExperimentsResponse(
                experiment_ids=["123", "456"]
            )
            yield export_service_pb2.StreamExperimentsResponse(
                experiment_ids=["789"]
            )

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
        self.assertCountEqual(expected_files, os.listdir(outdir))
        mock_api_client.StreamExperiments.assert_not_called()
        mock_api_client.StreamExperimentData.assert_not_called()

        # The first iteration should request the list of experiments and
        # data for one of them.
        self.assertEqual(next(generator), "123")
        expected_files.append("scalars_123.json")
        self.assertCountEqual(expected_files, os.listdir(outdir))

        expected_eids_request = export_service_pb2.StreamExperimentsRequest()
        expected_eids_request.read_timestamp.CopyFrom(start_time_pb)
        expected_eids_request.limit = 2 ** 63 - 1
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

        expected_files.append("scalars_456.json")
        self.assertCountEqual(expected_files, os.listdir(outdir))
        mock_api_client.StreamExperiments.assert_not_called()
        expected_data_request.experiment_id = "456"
        mock_api_client.StreamExperimentData.assert_called_once_with(
            expected_data_request, metadata=grpc_util.version_metadata()
        )

        # Again, request data for the next experiment; this experiment ID
        # was in the second response batch in the list of IDs.
        expected_files.append("scalars_789.json")
        mock_api_client.StreamExperiments.reset_mock()
        mock_api_client.StreamExperimentData.reset_mock()
        self.assertEqual(next(generator), "789")

        self.assertCountEqual(expected_files, os.listdir(outdir))
        mock_api_client.StreamExperiments.assert_not_called()
        expected_data_request.experiment_id = "789"
        mock_api_client.StreamExperimentData.assert_called_once_with(
            expected_data_request, metadata=grpc_util.version_metadata()
        )

        # The final continuation shouldn't need to send any RPCs.
        mock_api_client.StreamExperiments.reset_mock()
        mock_api_client.StreamExperimentData.reset_mock()
        self.assertEqual(list(generator), [])

        self.assertCountEqual(expected_files, os.listdir(outdir))
        mock_api_client.StreamExperiments.assert_not_called()
        mock_api_client.StreamExperimentData.assert_not_called()

        # Spot-check one of the files.
        with open(os.path.join(outdir, "scalars_456.json")) as infile:
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

    def test_rejects_dangerous_experiment_ids(self):
        mock_api_client = self._create_mock_api_client()

        def stream_experiments(request, **kwargs):
            del request  # unused
            yield export_service_pb2.StreamExperimentsResponse(
                experiment_ids=["../authorized_keys"]
            )

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
            yield export_service_pb2.StreamExperimentsResponse(
                experiment_ids=[experiment_id]
            )

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
            yield export_service_pb2.StreamExperimentsResponse(
                experiment_ids=[experiment_id]
            )

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
                [
                    export_service_pb2.StreamExperimentsResponse(
                        experiment_ids=["123"]
                    ),
                ]
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

    def test_rejects_existing_file(self):
        mock_api_client = self._create_mock_api_client()

        def stream_experiments(request, **kwargs):
            del request  # unused
            yield export_service_pb2.StreamExperimentsResponse(
                experiment_ids=["123"]
            )

        mock_api_client.StreamExperiments = stream_experiments

        outdir = os.path.join(self.get_temp_dir(), "outdir")
        exporter = exporter_lib.TensorBoardExporter(mock_api_client, outdir)
        generator = exporter.export()

        with open(os.path.join(outdir, "scalars_123.json"), "w"):
            pass

        with self.assertRaises(exporter_lib.OutputFileExistsError):
            next(generator)

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
        gen = exporter_lib.list_experiments(mock_api_client)
        mock_api_client.StreamExperiments.assert_not_called()
        self.assertEqual(list(gen), ["123", "456", "789"])

    def test_mixed_experiments_and_ids(self):
        mock_api_client = _create_mock_api_client()

        def stream_experiments(request, **kwargs):
            del request  # unused

            # Should include `experiment_ids` when no `experiments` given.
            response = export_service_pb2.StreamExperimentsResponse()
            response.experiment_ids.append("123")
            response.experiment_ids.append("456")
            yield response

            # Should ignore `experiment_ids` in the presence of `experiments`.
            response = export_service_pb2.StreamExperimentsResponse()
            response.experiment_ids.append("999")  # will be omitted
            response.experiments.add(experiment_id="789")
            response.experiments.add(experiment_id="012")
            yield response

            # Should include `experiments` even when no `experiment_ids` are given.
            response = export_service_pb2.StreamExperimentsResponse()
            response.experiments.add(experiment_id="345")
            response.experiments.add(experiment_id="678")
            yield response

        mock_api_client.StreamExperiments = mock.Mock(wraps=stream_experiments)
        gen = exporter_lib.list_experiments(mock_api_client)
        mock_api_client.StreamExperiments.assert_not_called()
        expected = [
            "123",
            "456",
            experiment_pb2.Experiment(experiment_id="789"),
            experiment_pb2.Experiment(experiment_id="012"),
            experiment_pb2.Experiment(experiment_id="345"),
            experiment_pb2.Experiment(experiment_id="678"),
        ]
        self.assertEqual(list(gen), expected)


class MkdirPTest(tb_test.TestCase):
    def test_makes_full_chain(self):
        path = os.path.join(self.get_temp_dir(), "a", "b", "c")
        exporter_lib._mkdir_p(path)
        self.assertTrue(os.path.isdir(path))

    def test_makes_leaf(self):
        base = os.path.join(self.get_temp_dir(), "a", "b")
        exporter_lib._mkdir_p(base)
        leaf = os.path.join(self.get_temp_dir(), "a", "b", "c")
        exporter_lib._mkdir_p(leaf)
        self.assertTrue(os.path.isdir(leaf))

    def test_fails_when_path_is_a_normal_file(self):
        path = os.path.join(self.get_temp_dir(), "somefile")
        with open(path, "w"):
            pass
        with self.assertRaises(OSError) as cm:
            exporter_lib._mkdir_p(path)
        self.assertEqual(cm.exception.errno, errno.EEXIST)

    def test_propagates_other_errors(self):
        base = os.path.join(self.get_temp_dir(), "somefile")
        with open(base, "w"):
            pass
        leaf = os.path.join(self.get_temp_dir(), "somefile", "somedir")
        with self.assertRaises(OSError) as cm:
            exporter_lib._mkdir_p(leaf)
        self.assertNotEqual(cm.exception.errno, errno.EEXIST)
        if os.name == "nt":
            expected_errno = errno.ENOENT
        else:
            expected_errno = errno.ENOTDIR
        self.assertEqual(cm.exception.errno, expected_errno)


class OpenExclTest(tb_test.TestCase):
    def test_success(self):
        path = os.path.join(self.get_temp_dir(), "test.txt")
        with exporter_lib._open_excl(path) as outfile:
            outfile.write("hello\n")
        with open(path) as infile:
            self.assertEqual(infile.read(), "hello\n")

    def test_fails_when_file_exists(self):
        path = os.path.join(self.get_temp_dir(), "test.txt")
        with open(path, "w"):
            pass
        with self.assertRaises(exporter_lib.OutputFileExistsError) as cm:
            exporter_lib._open_excl(path)
        self.assertEqual(str(cm.exception), path)

    def test_propagates_other_errors(self):
        path = os.path.join(self.get_temp_dir(), "enoent", "test.txt")
        with self.assertRaises(OSError) as cm:
            exporter_lib._open_excl(path)
        self.assertEqual(cm.exception.errno, errno.ENOENT)


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
