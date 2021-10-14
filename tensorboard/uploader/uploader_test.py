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
"""Tests for tensorboard.uploader.uploader."""


import itertools
import os
import re
from unittest import mock

import grpc
import grpc_testing

import tensorflow as tf

from google.protobuf import message
from tensorboard import data_compat
from tensorboard import dataclass_compat
from tensorboard.compat.proto import tensor_shape_pb2
from tensorboard.uploader.proto import experiment_pb2
from tensorboard.uploader.proto import scalar_pb2
from tensorboard.uploader.proto import server_info_pb2
from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader import test_util
from tensorboard.uploader import upload_tracker
from tensorboard.uploader import uploader as uploader_lib
from tensorboard.uploader import logdir_loader
from tensorboard.uploader import util
from tensorboard.uploader import uploader_errors
from tensorboard.uploader.orchestration import byte_budget_manager
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import graph_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.compat.proto import tensor_pb2
from tensorboard.compat.proto import types_pb2
from tensorboard.plugins.histogram import metadata as histograms_metadata
from tensorboard.plugins.histogram import summary_v2 as histogram_v2
from tensorboard.plugins.graph import metadata as graphs_metadata
from tensorboard.plugins.scalar import metadata as scalars_metadata
from tensorboard.plugins.scalar import summary_v2 as scalar_v2
from tensorboard.summary import v1 as summary_v1
from tensorboard.util import test_util as tb_test_util
from tensorboard.util import tensor_util


def _create_example_graph_bytes(large_attr_size):
    graph_def = graph_pb2.GraphDef()
    graph_def.node.add(name="alice", op="Person")
    graph_def.node.add(name="bob", op="Person")

    graph_def.node[1].attr["small"].s = b"small_attr_value"
    graph_def.node[1].attr["large"].s = b"l" * large_attr_size
    graph_def.node.add(
        name="friendship", op="Friendship", input=["alice", "bob"]
    )
    return graph_def.SerializeToString()


class AbortUploadError(Exception):
    """Exception used in testing to abort the upload process."""


def _create_mock_client():
    # Create a stub instance (using a test channel) in order to derive a mock
    # from it with autospec enabled. Mocking TensorBoardWriterServiceStub itself
    # doesn't work with autospec because grpc constructs stubs via metaclassing.
    test_channel = grpc_testing.channel(
        service_descriptors=[], time=grpc_testing.strict_real_time()
    )
    stub = write_service_pb2_grpc.TensorBoardWriterServiceStub(test_channel)
    mock_client = mock.create_autospec(stub)
    fake_exp_response = write_service_pb2.CreateExperimentResponse(
        experiment_id="123", url="should not be used!"
    )
    mock_client.CreateExperiment.return_value = fake_exp_response
    mock_client.GetOrCreateBlobSequence.side_effect = (
        write_service_pb2.GetOrCreateBlobSequenceResponse(
            blob_sequence_id="blob%d" % i
        )
        for i in itertools.count()
    )
    return mock_client


# By default allow at least one plugin for each upload type: Scalar, Tensor, and
# Blobs.
_SCALARS_HISTOGRAMS_AND_GRAPHS = frozenset(
    (
        scalars_metadata.PLUGIN_NAME,
        histograms_metadata.PLUGIN_NAME,
        graphs_metadata.PLUGIN_NAME,
    )
)

# Sentinel for `_create_*` helpers, for arguments for which we want to
# supply a default other than the `None` used by the code under test.
_USE_DEFAULT = object()


def _create_uploader(
    writer_client=_USE_DEFAULT,
    logdir=None,
    max_scalar_request_size=_USE_DEFAULT,
    max_blob_request_size=_USE_DEFAULT,
    max_blob_size=_USE_DEFAULT,
    logdir_poll_rate_limiter=_USE_DEFAULT,
    rpc_rate_limiter=_USE_DEFAULT,
    tensor_rpc_rate_limiter=_USE_DEFAULT,
    blob_rpc_rate_limiter=_USE_DEFAULT,
    name=None,
    description=None,
    verbosity=0,  # Use 0 to minimize littering the test output.
    one_shot=None,
):
    if writer_client is _USE_DEFAULT:
        writer_client = _create_mock_client()
    if max_scalar_request_size is _USE_DEFAULT:
        max_scalar_request_size = 128000
    if max_blob_request_size is _USE_DEFAULT:
        max_blob_request_size = 128000
    if max_blob_size is _USE_DEFAULT:
        max_blob_size = 12345
    if logdir_poll_rate_limiter is _USE_DEFAULT:
        logdir_poll_rate_limiter = util.RateLimiter(0)
    if rpc_rate_limiter is _USE_DEFAULT:
        rpc_rate_limiter = util.RateLimiter(0)
    if tensor_rpc_rate_limiter is _USE_DEFAULT:
        tensor_rpc_rate_limiter = util.RateLimiter(0)
    if blob_rpc_rate_limiter is _USE_DEFAULT:
        blob_rpc_rate_limiter = util.RateLimiter(0)

    upload_limits = server_info_pb2.UploadLimits(
        max_scalar_request_size=max_scalar_request_size,
        max_tensor_request_size=128000,
        max_tensor_point_size=11111,
        max_blob_request_size=max_blob_request_size,
        max_blob_size=max_blob_size,
    )

    return uploader_lib.TensorBoardUploader(
        writer_client,
        logdir,
        allowed_plugins=_SCALARS_HISTOGRAMS_AND_GRAPHS,
        upload_limits=upload_limits,
        logdir_poll_rate_limiter=logdir_poll_rate_limiter,
        rpc_rate_limiter=rpc_rate_limiter,
        tensor_rpc_rate_limiter=tensor_rpc_rate_limiter,
        blob_rpc_rate_limiter=blob_rpc_rate_limiter,
        name=name,
        description=description,
        verbosity=verbosity,
        one_shot=one_shot,
    )


def _create_request_sender(
    experiment_id=None,
    api=None,
    allowed_plugins=_USE_DEFAULT,
):
    if api is _USE_DEFAULT:
        api = _create_mock_client()
    if allowed_plugins is _USE_DEFAULT:
        allowed_plugins = _SCALARS_HISTOGRAMS_AND_GRAPHS

    upload_limits = server_info_pb2.UploadLimits(
        max_scalar_request_size=128000,
        max_tensor_request_size=128000,
        max_tensor_point_size=11111,
        max_blob_size=12345,
    )

    rpc_rate_limiter = util.RateLimiter(0)
    tensor_rpc_rate_limiter = util.RateLimiter(0)
    blob_rpc_rate_limiter = util.RateLimiter(0)

    return uploader_lib._BatchedRequestSender(
        experiment_id=experiment_id,
        api=api,
        allowed_plugins=allowed_plugins,
        upload_limits=upload_limits,
        rpc_rate_limiter=rpc_rate_limiter,
        tensor_rpc_rate_limiter=tensor_rpc_rate_limiter,
        blob_rpc_rate_limiter=blob_rpc_rate_limiter,
        tracker=upload_tracker.UploadTracker(verbosity=0),
    )


class TensorboardUploaderTest(tf.test.TestCase):
    def test_create_experiment(self):
        logdir = "/logs/foo"
        uploader = _create_uploader(_create_mock_client(), logdir)
        eid = uploader.create_experiment()
        self.assertEqual(eid, "123")

    def test_create_experiment_with_name(self):
        logdir = "/logs/foo"
        mock_client = _create_mock_client()
        new_name = "This is the new name"
        uploader = _create_uploader(mock_client, logdir, name=new_name)
        eid = uploader.create_experiment()
        self.assertEqual(eid, "123")
        mock_client.CreateExperiment.assert_called_once()
        (args, _) = mock_client.CreateExperiment.call_args

        expected_request = write_service_pb2.CreateExperimentRequest(
            name=new_name,
        )
        self.assertEqual(args[0], expected_request)

    def test_create_experiment_with_description(self):
        logdir = "/logs/foo"
        mock_client = _create_mock_client()
        new_description = """
        **description**"
        may have "strange" unicode chars 🌴 \\/<>
        """
        uploader = _create_uploader(
            mock_client, logdir, description=new_description
        )
        eid = uploader.create_experiment()
        self.assertEqual(eid, "123")
        mock_client.CreateExperiment.assert_called_once()
        (args, _) = mock_client.CreateExperiment.call_args

        expected_request = write_service_pb2.CreateExperimentRequest(
            description=new_description,
        )
        self.assertEqual(args[0], expected_request)

    def test_create_experiment_with_all_metadata(self):
        logdir = "/logs/foo"
        mock_client = _create_mock_client()
        new_description = """
        **description**"
        may have "strange" unicode chars 🌴 \\/<>
        """
        new_name = "This is a cool name."
        uploader = _create_uploader(
            mock_client, logdir, name=new_name, description=new_description
        )
        eid = uploader.create_experiment()
        self.assertEqual(eid, "123")
        mock_client.CreateExperiment.assert_called_once()
        (args, _) = mock_client.CreateExperiment.call_args

        expected_request = write_service_pb2.CreateExperimentRequest(
            name=new_name,
            description=new_description,
        )
        self.assertEqual(args[0], expected_request)

    def test_start_uploading_without_create_experiment_fails(self):
        mock_client = _create_mock_client()
        uploader = _create_uploader(mock_client, "/logs/foo")
        with self.assertRaisesRegex(RuntimeError, "call create_experiment()"):
            uploader.start_uploading()

    def test_start_uploading_scalars(self):
        mock_client = _create_mock_client()
        mock_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_tensor_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_blob_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_tracker = mock.MagicMock()
        with mock.patch.object(
            upload_tracker, "UploadTracker", return_value=mock_tracker
        ):
            uploader = _create_uploader(
                mock_client,
                "/logs/foo",
                # Send each Event below in a separate WriteScalarRequest
                max_scalar_request_size=100,
                rpc_rate_limiter=mock_rate_limiter,
                tensor_rpc_rate_limiter=mock_tensor_rate_limiter,
                blob_rpc_rate_limiter=mock_blob_rate_limiter,
                verbosity=1,  # In order to test the upload tracker.
            )
            uploader.create_experiment()

        def scalar_event(tag, value):
            return event_pb2.Event(summary=scalar_v2.scalar_pb(tag, value))

        mock_logdir_loader = mock.create_autospec(logdir_loader.LogdirLoader)
        mock_logdir_loader.get_run_events.side_effect = [
            {
                "run 1": _apply_compat(
                    [scalar_event("1.1", 5.0), scalar_event("1.2", 5.0)]
                ),
                "run 2": _apply_compat(
                    [scalar_event("2.1", 5.0), scalar_event("2.2", 5.0)]
                ),
            },
            {
                "run 3": _apply_compat(
                    [scalar_event("3.1", 5.0), scalar_event("3.2", 5.0)]
                ),
                "run 4": _apply_compat(
                    [scalar_event("4.1", 5.0), scalar_event("4.2", 5.0)]
                ),
                "run 5": _apply_compat(
                    [scalar_event("5.1", 5.0), scalar_event("5.2", 5.0)]
                ),
            },
            AbortUploadError,
        ]

        with mock.patch.object(
            uploader, "_logdir_loader", mock_logdir_loader
        ), self.assertRaises(AbortUploadError):
            uploader.start_uploading()
        self.assertEqual(4 + 6, mock_client.WriteScalar.call_count)
        self.assertEqual(4 + 6, mock_rate_limiter.tick.call_count)
        self.assertEqual(0, mock_tensor_rate_limiter.tick.call_count)
        self.assertEqual(0, mock_blob_rate_limiter.tick.call_count)

        # Check upload tracker calls.
        self.assertEqual(mock_tracker.send_tracker.call_count, 2)
        self.assertEqual(mock_tracker.scalars_tracker.call_count, 10)
        self.assertLen(mock_tracker.scalars_tracker.call_args[0], 1)
        self.assertEqual(mock_tracker.tensors_tracker.call_count, 0)
        self.assertEqual(mock_tracker.blob_tracker.call_count, 0)

    def test_start_uploading_scalars_one_shot(self):
        """Check that one-shot uploading stops without AbortUploadError."""
        mock_client = _create_mock_client()
        mock_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_tensor_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_blob_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_tracker = mock.MagicMock()
        with mock.patch.object(
            upload_tracker, "UploadTracker", return_value=mock_tracker
        ):
            uploader = _create_uploader(
                mock_client,
                "/logs/foo",
                # Send each Event below in a separate WriteScalarRequest
                max_scalar_request_size=100,
                rpc_rate_limiter=mock_rate_limiter,
                tensor_rpc_rate_limiter=mock_tensor_rate_limiter,
                blob_rpc_rate_limiter=mock_blob_rate_limiter,
                verbosity=1,  # In order to test the upload tracker.
                one_shot=True,
            )
            uploader.create_experiment()

        def scalar_event(tag, value):
            return event_pb2.Event(summary=scalar_v2.scalar_pb(tag, value))

        mock_logdir_loader = mock.create_autospec(logdir_loader.LogdirLoader)
        mock_logdir_loader.get_run_events.side_effect = [
            {
                "run 1": _apply_compat(
                    [scalar_event("1.1", 5.0), scalar_event("1.2", 5.0)]
                ),
                "run 2": _apply_compat(
                    [scalar_event("2.1", 5.0), scalar_event("2.2", 5.0)]
                ),
            },
            # Note the lack of AbortUploadError here.
        ]

        with mock.patch.object(uploader, "_logdir_loader", mock_logdir_loader):
            uploader.start_uploading()

        self.assertEqual(4, mock_client.WriteScalar.call_count)
        self.assertEqual(4, mock_rate_limiter.tick.call_count)
        self.assertEqual(0, mock_tensor_rate_limiter.tick.call_count)
        self.assertEqual(0, mock_blob_rate_limiter.tick.call_count)

        # Check upload tracker calls.
        self.assertEqual(mock_tracker.send_tracker.call_count, 1)
        self.assertEqual(mock_tracker.scalars_tracker.call_count, 4)
        self.assertLen(mock_tracker.scalars_tracker.call_args[0], 1)
        self.assertEqual(mock_tracker.tensors_tracker.call_count, 0)
        self.assertEqual(mock_tracker.blob_tracker.call_count, 0)

    def test_start_uploading_tensors(self):
        mock_client = _create_mock_client()
        mock_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_tensor_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_blob_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_tracker = mock.MagicMock()
        with mock.patch.object(
            upload_tracker, "UploadTracker", return_value=mock_tracker
        ):
            uploader = _create_uploader(
                mock_client,
                "/logs/foo",
                rpc_rate_limiter=mock_rate_limiter,
                tensor_rpc_rate_limiter=mock_tensor_rate_limiter,
                blob_rpc_rate_limiter=mock_blob_rate_limiter,
                verbosity=1,  # In order to test the upload tracker.
            )
            uploader.create_experiment()

        def tensor_event(tag, value):
            return event_pb2.Event(
                summary=histogram_v2.histogram_pb(tag, value)
            )

        mock_logdir_loader = mock.create_autospec(logdir_loader.LogdirLoader)
        mock_logdir_loader.get_run_events.side_effect = [
            {
                "run 1": _apply_compat(
                    [tensor_event("1.1", [5.0]), tensor_event("1.2", [5.0])]
                ),
            },
            AbortUploadError,
        ]

        with mock.patch.object(
            uploader, "_logdir_loader", mock_logdir_loader
        ), self.assertRaises(AbortUploadError):
            uploader.start_uploading()
        self.assertEqual(1, mock_client.WriteTensor.call_count)
        self.assertEqual(0, mock_rate_limiter.tick.call_count)
        self.assertEqual(1, mock_tensor_rate_limiter.tick.call_count)
        self.assertEqual(0, mock_blob_rate_limiter.tick.call_count)

        # Check upload tracker calls.
        self.assertEqual(mock_tracker.send_tracker.call_count, 1)
        self.assertEqual(mock_tracker.scalars_tracker.call_count, 0)
        tensors_tracker = mock_tracker.tensors_tracker
        self.assertEqual(tensors_tracker.call_count, 1)
        self.assertLen(tensors_tracker.call_args[0], 4)
        self.assertEqual(tensors_tracker.call_args[0][0], 2)  # num_tensors
        self.assertEqual(
            tensors_tracker.call_args[0][1], 0
        )  # num_tensors_skipped
        # tensor_bytes: avoid asserting the exact value as it's hard to reason about.
        self.assertGreater(tensors_tracker.call_args[0][2], 0)
        self.assertEqual(
            tensors_tracker.call_args[0][3], 0
        )  # tensor_bytes_skipped
        self.assertEqual(mock_tracker.blob_tracker.call_count, 0)

    def test_start_uploading_graphs(self):
        mock_client = _create_mock_client()
        mock_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_tensor_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_blob_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_tracker = mock.MagicMock()
        with mock.patch.object(
            upload_tracker, "UploadTracker", return_value=mock_tracker
        ):
            uploader = _create_uploader(
                mock_client,
                "/logs/foo",
                # Verify behavior with lots of small chunks
                max_blob_request_size=100,
                rpc_rate_limiter=mock_rate_limiter,
                tensor_rpc_rate_limiter=mock_tensor_rate_limiter,
                blob_rpc_rate_limiter=mock_blob_rate_limiter,
                verbosity=1,  # In order to test tracker.
            )
            uploader.create_experiment()

        # Of course a real Event stream will never produce the same Event twice,
        # but is this test context it's fine to reuse this one.
        graph_event = event_pb2.Event(
            graph_def=_create_example_graph_bytes(950)
        )
        expected_graph_def = graph_pb2.GraphDef.FromString(
            graph_event.graph_def
        )
        mock_logdir_loader = mock.create_autospec(logdir_loader.LogdirLoader)
        mock_logdir_loader.get_run_events.side_effect = [
            {
                "run 1": _apply_compat([graph_event, graph_event]),
                "run 2": _apply_compat([graph_event, graph_event]),
            },
            {
                "run 3": _apply_compat([graph_event, graph_event]),
                "run 4": _apply_compat([graph_event, graph_event]),
                "run 5": _apply_compat([graph_event, graph_event]),
            },
            AbortUploadError,
        ]

        with mock.patch.object(
            uploader, "_logdir_loader", mock_logdir_loader
        ), self.assertRaises(AbortUploadError):
            uploader.start_uploading()
        self.assertEqual(1, mock_client.CreateExperiment.call_count)
        self.assertEqual(10, mock_client.WriteBlob.call_count)
        for (i, call) in enumerate(mock_client.WriteBlob.call_args_list):
            requests = list(call[0][0])
            data = b"".join(r.data for r in requests)
            actual_graph_def = graph_pb2.GraphDef.FromString(data)
            self.assertProtoEquals(expected_graph_def, actual_graph_def)
            self.assertEqual(
                set(r.blob_sequence_id for r in requests),
                {"blob%d" % i},
            )
        self.assertEqual(0, mock_rate_limiter.tick.call_count)
        self.assertEqual(0, mock_tensor_rate_limiter.tick.call_count)
        self.assertEqual(10, mock_blob_rate_limiter.tick.call_count)

        # Check upload tracker calls.
        self.assertEqual(mock_tracker.send_tracker.call_count, 2)
        self.assertEqual(mock_tracker.scalars_tracker.call_count, 0)
        self.assertEqual(mock_tracker.tensors_tracker.call_count, 0)
        self.assertEqual(mock_tracker.blob_tracker.call_count, 10)
        self.assertLen(mock_tracker.blob_tracker.call_args[0], 1)
        self.assertGreater(mock_tracker.blob_tracker.call_args[0][0], 0)

    def test_upload_skip_large_blob(self):
        mock_client = _create_mock_client()
        mock_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_blob_rate_limiter = mock.create_autospec(util.RateLimiter)
        uploader = _create_uploader(
            mock_client,
            "/logs/foo",
            # Verify behavior with lots of small chunks
            max_blob_request_size=100,
            max_blob_size=100,
            rpc_rate_limiter=mock_rate_limiter,
            blob_rpc_rate_limiter=mock_blob_rate_limiter,
        )
        uploader.create_experiment()

        graph_event = event_pb2.Event(
            graph_def=_create_example_graph_bytes(950)
        )

        mock_logdir_loader = mock.create_autospec(logdir_loader.LogdirLoader)
        mock_logdir_loader.get_run_events.side_effect = [
            {"run 1": _apply_compat([graph_event])},
            AbortUploadError,
        ]

        with mock.patch.object(
            uploader, "_logdir_loader", mock_logdir_loader
        ), self.assertRaises(AbortUploadError):
            uploader.start_uploading()
        self.assertEqual(1, mock_client.CreateExperiment.call_count)
        self.assertEqual(0, mock_client.WriteBlob.call_count)
        self.assertEqual(0, mock_rate_limiter.tick.call_count)
        self.assertEqual(1, mock_blob_rate_limiter.tick.call_count)

    def test_filter_graphs(self):
        # Three graphs: one short, one long, one corrupt.
        bytes_0 = _create_example_graph_bytes(123)
        bytes_1 = _create_example_graph_bytes(9999)
        # invalid (truncated) proto: length-delimited field 1 (0x0a) of
        # length 0x7f specified, but only len("bogus") = 5 bytes given
        # <https://developers.google.com/protocol-buffers/docs/encoding>
        bytes_2 = b"\x0a\x7fbogus"

        logdir = self.get_temp_dir()
        for (i, b) in enumerate([bytes_0, bytes_1, bytes_2]):
            run_dir = os.path.join(logdir, "run_%04d" % i)
            event = event_pb2.Event(step=0, wall_time=123 * i, graph_def=b)
            with tb_test_util.FileWriter(run_dir) as writer:
                writer.add_event(event)

        limiter = mock.create_autospec(util.RateLimiter)
        limiter.tick.side_effect = [None, AbortUploadError]
        mock_client = _create_mock_client()
        uploader = _create_uploader(
            mock_client,
            logdir,
            logdir_poll_rate_limiter=limiter,
        )
        uploader.create_experiment()

        with self.assertRaises(AbortUploadError):
            uploader.start_uploading()

        actual_blobs = []
        for call in mock_client.WriteBlob.call_args_list:
            requests = call[0][0]
            actual_blobs.append(b"".join(r.data for r in requests))

        actual_graph_defs = []
        for blob in actual_blobs:
            try:
                actual_graph_defs.append(graph_pb2.GraphDef.FromString(blob))
            except message.DecodeError:
                actual_graph_defs.append(None)

        with self.subTest("graphs with small attr values should be unchanged"):
            expected_graph_def_0 = graph_pb2.GraphDef.FromString(bytes_0)
            self.assertEqual(actual_graph_defs[0], expected_graph_def_0)

        with self.subTest("large attr values should be filtered out"):
            expected_graph_def_1 = graph_pb2.GraphDef.FromString(bytes_1)
            del expected_graph_def_1.node[1].attr["large"]
            expected_graph_def_1.node[1].attr["_too_large_attrs"].list.s.append(
                b"large"
            )
            requests = list(mock_client.WriteBlob.call_args[0][0])
            self.assertEqual(actual_graph_defs[1], expected_graph_def_1)

        with self.subTest("corrupt graphs should be skipped"):
            self.assertLen(actual_blobs, 2)

    def test_upload_server_error(self):
        mock_client = _create_mock_client()
        mock_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_blob_rate_limiter = mock.create_autospec(util.RateLimiter)
        uploader = _create_uploader(
            mock_client,
            "/logs/foo",
            rpc_rate_limiter=mock_rate_limiter,
            blob_rpc_rate_limiter=mock_blob_rate_limiter,
        )
        uploader.create_experiment()

        # Of course a real Event stream will never produce the same Event twice,
        # but is this test context it's fine to reuse this one.
        graph_event = event_pb2.Event(
            graph_def=_create_example_graph_bytes(950)
        )

        mock_logdir_loader = mock.create_autospec(logdir_loader.LogdirLoader)
        mock_logdir_loader.get_run_events.side_effect = [
            {"run 1": _apply_compat([graph_event])},
            {"run 1": _apply_compat([graph_event])},
            AbortUploadError,
        ]

        mock_client.WriteBlob.side_effect = [
            [write_service_pb2.WriteBlobResponse()],
            test_util.grpc_error(grpc.StatusCode.INTERNAL, "nope"),
        ]

        # This demonstrates that the INTERNAL error is NOT handled, so the
        # uploader will die if this happens.
        with mock.patch.object(
            uploader, "_logdir_loader", mock_logdir_loader
        ), self.assertRaises(grpc.RpcError):
            uploader.start_uploading()
        self.assertEqual(1, mock_client.CreateExperiment.call_count)
        self.assertEqual(2, mock_client.WriteBlob.call_count)
        self.assertEqual(0, mock_rate_limiter.tick.call_count)
        self.assertEqual(2, mock_blob_rate_limiter.tick.call_count)

    def test_upload_same_graph_twice(self):
        mock_client = _create_mock_client()
        mock_rate_limiter = mock.create_autospec(util.RateLimiter)
        mock_blob_rate_limiter = mock.create_autospec(util.RateLimiter)
        uploader = _create_uploader(
            mock_client,
            "/logs/foo",
            rpc_rate_limiter=mock_rate_limiter,
            blob_rpc_rate_limiter=mock_blob_rate_limiter,
        )
        uploader.create_experiment()

        graph_event = event_pb2.Event(
            graph_def=_create_example_graph_bytes(950)
        )

        mock_logdir_loader = mock.create_autospec(logdir_loader.LogdirLoader)
        mock_logdir_loader.get_run_events.side_effect = [
            {"run 1": _apply_compat([graph_event])},
            {"run 1": _apply_compat([graph_event])},
            AbortUploadError,
        ]

        mock_client.WriteBlob.side_effect = [
            [write_service_pb2.WriteBlobResponse()],
            test_util.grpc_error(grpc.StatusCode.ALREADY_EXISTS, "nope"),
        ]

        # This demonstrates that the ALREADY_EXISTS error is handled gracefully.
        with mock.patch.object(
            uploader, "_logdir_loader", mock_logdir_loader
        ), self.assertRaises(AbortUploadError):
            uploader.start_uploading()
        self.assertEqual(1, mock_client.CreateExperiment.call_count)
        self.assertEqual(2, mock_client.WriteBlob.call_count)
        self.assertEqual(0, mock_rate_limiter.tick.call_count)
        self.assertEqual(2, mock_blob_rate_limiter.tick.call_count)

    def test_upload_empty_logdir(self):
        logdir = self.get_temp_dir()
        mock_client = _create_mock_client()
        uploader = _create_uploader(mock_client, logdir)
        uploader.create_experiment()
        uploader._upload_once()
        mock_client.WriteScalar.assert_not_called()

    def test_upload_polls_slowly_once_done(self):
        class Success(Exception):
            pass

        mock_rate_limiter = mock.create_autospec(util.RateLimiter)
        upload_call_count = 0

        def mock_upload_once():
            nonlocal upload_call_count
            upload_call_count += 1
            tick_count = mock_rate_limiter.tick.call_count
            self.assertEqual(tick_count, upload_call_count)
            if tick_count >= 3:
                raise Success()

        uploader = _create_uploader(
            logdir=self.get_temp_dir(),
            logdir_poll_rate_limiter=mock_rate_limiter,
        )
        uploader._upload_once = mock_upload_once

        uploader.create_experiment()
        with self.assertRaises(Success):
            uploader.start_uploading()

    def test_upload_swallows_rpc_failure(self):
        logdir = self.get_temp_dir()
        with tb_test_util.FileWriter(logdir) as writer:
            writer.add_test_summary("foo")
        mock_client = _create_mock_client()
        uploader = _create_uploader(mock_client, logdir)
        uploader.create_experiment()
        error = test_util.grpc_error(grpc.StatusCode.INTERNAL, "Failure")
        mock_client.WriteScalar.side_effect = error
        uploader._upload_once()
        mock_client.WriteScalar.assert_called_once()

    def test_upload_full_logdir(self):
        logdir = self.get_temp_dir()
        mock_client = _create_mock_client()
        uploader = _create_uploader(mock_client, logdir)
        uploader.create_experiment()

        # Convenience helpers for constructing expected requests.
        run = write_service_pb2.WriteScalarRequest.Run
        tag = write_service_pb2.WriteScalarRequest.Tag
        point = scalar_pb2.ScalarPoint

        # First round
        writer = tb_test_util.FileWriter(logdir)
        writer.add_test_summary("foo", simple_value=5.0, step=1)
        writer.add_test_summary("foo", simple_value=6.0, step=2)
        writer.add_test_summary("foo", simple_value=7.0, step=3)
        writer.add_test_summary("bar", simple_value=8.0, step=3)
        writer.flush()
        writer_a = tb_test_util.FileWriter(os.path.join(logdir, "a"))
        writer_a.add_test_summary("qux", simple_value=9.0, step=2)
        writer_a.flush()
        uploader._upload_once()
        self.assertEqual(1, mock_client.WriteScalar.call_count)
        request1 = mock_client.WriteScalar.call_args[0][0]
        _clear_wall_times(request1)
        expected_request1 = write_service_pb2.WriteScalarRequest(
            experiment_id="123",
            runs=[
                run(
                    name=".",
                    tags=[
                        tag(
                            name="foo",
                            metadata=test_util.scalar_metadata("foo"),
                            points=[
                                point(step=1, value=5.0),
                                point(step=2, value=6.0),
                                point(step=3, value=7.0),
                            ],
                        ),
                        tag(
                            name="bar",
                            metadata=test_util.scalar_metadata("bar"),
                            points=[point(step=3, value=8.0)],
                        ),
                    ],
                ),
                run(
                    name="a",
                    tags=[
                        tag(
                            name="qux",
                            metadata=test_util.scalar_metadata("qux"),
                            points=[point(step=2, value=9.0)],
                        )
                    ],
                ),
            ],
        )
        self.assertProtoEquals(expected_request1, request1)
        mock_client.WriteScalar.reset_mock()

        # Second round
        writer.add_test_summary("foo", simple_value=10.0, step=5)
        writer.add_test_summary("baz", simple_value=11.0, step=1)
        writer.flush()
        writer_b = tb_test_util.FileWriter(os.path.join(logdir, "b"))
        writer_b.add_test_summary("xyz", simple_value=12.0, step=1)
        writer_b.flush()
        uploader._upload_once()
        self.assertEqual(1, mock_client.WriteScalar.call_count)
        request2 = mock_client.WriteScalar.call_args[0][0]
        _clear_wall_times(request2)
        expected_request2 = write_service_pb2.WriteScalarRequest(
            experiment_id="123",
            runs=[
                run(
                    name=".",
                    tags=[
                        tag(
                            name="foo",
                            metadata=test_util.scalar_metadata("foo"),
                            points=[point(step=5, value=10.0)],
                        ),
                        tag(
                            name="baz",
                            metadata=test_util.scalar_metadata("baz"),
                            points=[point(step=1, value=11.0)],
                        ),
                    ],
                ),
                run(
                    name="b",
                    tags=[
                        tag(
                            name="xyz",
                            metadata=test_util.scalar_metadata("xyz"),
                            points=[point(step=1, value=12.0)],
                        )
                    ],
                ),
            ],
        )
        self.assertProtoEquals(expected_request2, request2)
        mock_client.WriteScalar.reset_mock()

        # Empty third round
        uploader._upload_once()
        mock_client.WriteScalar.assert_not_called()

    def test_verbosity_zero_creates_upload_tracker_with_verbosity_zero(self):
        mock_client = _create_mock_client()
        mock_tracker = mock.MagicMock()
        with mock.patch.object(
            upload_tracker, "UploadTracker", return_value=mock_tracker
        ) as mock_constructor:
            uploader = _create_uploader(
                mock_client,
                "/logs/foo",
                verbosity=0,  # Explicitly set verbosity to 0.
            )
            uploader.create_experiment()

        def scalar_event(tag, value):
            return event_pb2.Event(summary=scalar_v2.scalar_pb(tag, value))

        mock_logdir_loader = mock.create_autospec(logdir_loader.LogdirLoader)
        mock_logdir_loader.get_run_events.side_effect = [
            {
                "run 1": _apply_compat(
                    [scalar_event("1.1", 5.0), scalar_event("1.2", 5.0)]
                ),
            },
            AbortUploadError,
        ]

        with mock.patch.object(
            uploader, "_logdir_loader", mock_logdir_loader
        ), self.assertRaises(AbortUploadError):
            uploader.start_uploading()

        self.assertEqual(mock_constructor.call_count, 1)
        self.assertEqual(
            mock_constructor.call_args[1], {"verbosity": 0, "one_shot": False}
        )
        self.assertEqual(mock_tracker.scalars_tracker.call_count, 1)


class DeleteExperimentTest(tf.test.TestCase):
    def _create_mock_client(self):
        # Create a stub instance (using a test channel) in order to derive a mock
        # from it with autospec enabled. Mocking TensorBoardWriterServiceStub itself
        # doesn't work with autospec because grpc constructs stubs via metaclassing.
        test_channel = grpc_testing.channel(
            service_descriptors=[], time=grpc_testing.strict_real_time()
        )
        stub = write_service_pb2_grpc.TensorBoardWriterServiceStub(test_channel)
        mock_client = mock.create_autospec(stub)
        return mock_client

    def test_success(self):
        mock_client = _create_mock_client()
        response = write_service_pb2.DeleteExperimentResponse()
        mock_client.DeleteExperiment.return_value = response

        uploader_lib.delete_experiment(mock_client, "123")

        expected_request = write_service_pb2.DeleteExperimentRequest()
        expected_request.experiment_id = "123"
        mock_client.DeleteExperiment.assert_called_once()
        (args, _) = mock_client.DeleteExperiment.call_args
        self.assertEqual(args[0], expected_request)

    def test_not_found(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.NOT_FOUND, "nope")
        mock_client.DeleteExperiment.side_effect = error

        with self.assertRaises(uploader_errors.ExperimentNotFoundError):
            uploader_lib.delete_experiment(mock_client, "123")

    def test_unauthorized(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.PERMISSION_DENIED, "nope")
        mock_client.DeleteExperiment.side_effect = error

        with self.assertRaises(uploader_errors.PermissionDeniedError):
            uploader_lib.delete_experiment(mock_client, "123")

    def test_internal_error(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.INTERNAL, "travesty")
        mock_client.DeleteExperiment.side_effect = error

        with self.assertRaises(grpc.RpcError) as cm:
            uploader_lib.delete_experiment(mock_client, "123")
        msg = str(cm.exception)
        self.assertIn("travesty", msg)


class UpdateExperimentMetadataTest(tf.test.TestCase):
    def _create_mock_client(self):
        # Create a stub instance (using a test channel) in order to derive a mock
        # from it with autospec enabled. Mocking TensorBoardWriterServiceStub itself
        # doesn't work with autospec because grpc constructs stubs via metaclassing.
        test_channel = grpc_testing.channel(
            service_descriptors=[], time=grpc_testing.strict_real_time()
        )
        stub = write_service_pb2_grpc.TensorBoardWriterServiceStub(test_channel)
        mock_client = mock.create_autospec(stub)
        return mock_client

    def test_success(self):
        mock_client = _create_mock_client()
        new_name = "a new name"
        response = write_service_pb2.UpdateExperimentResponse()
        mock_client.UpdateExperiment.return_value = response

        uploader_lib.update_experiment_metadata(
            mock_client, "123", name=new_name
        )

        expected_request = write_service_pb2.UpdateExperimentRequest(
            experiment=experiment_pb2.Experiment(
                experiment_id="123", name=new_name
            ),
            experiment_mask=experiment_pb2.ExperimentMask(name=True),
        )
        mock_client.UpdateExperiment.assert_called_once()
        (args, _) = mock_client.UpdateExperiment.call_args
        self.assertEqual(args[0], expected_request)

    def test_not_found(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.NOT_FOUND, "nope")
        mock_client.UpdateExperiment.side_effect = error

        with self.assertRaises(uploader_errors.ExperimentNotFoundError):
            uploader_lib.update_experiment_metadata(mock_client, "123", name="")

    def test_unauthorized(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.PERMISSION_DENIED, "nope")
        mock_client.UpdateExperiment.side_effect = error

        with self.assertRaises(uploader_errors.PermissionDeniedError):
            uploader_lib.update_experiment_metadata(mock_client, "123", name="")

    def test_invalid_argument(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(
            grpc.StatusCode.INVALID_ARGUMENT, "too many"
        )
        mock_client.UpdateExperiment.side_effect = error

        with self.assertRaises(uploader_errors.InvalidArgumentError) as cm:
            uploader_lib.update_experiment_metadata(mock_client, "123", name="")
        msg = str(cm.exception)
        self.assertIn("too many", msg)

    def test_internal_error(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.INTERNAL, "travesty")
        mock_client.UpdateExperiment.side_effect = error

        with self.assertRaises(grpc.RpcError) as cm:
            uploader_lib.update_experiment_metadata(mock_client, "123", name="")
        msg = str(cm.exception)
        self.assertIn("travesty", msg)


class VarintCostTest(tf.test.TestCase):
    def test_varint_cost(self):
        self.assertEqual(uploader_lib._varint_cost(0), 1)
        self.assertEqual(uploader_lib._varint_cost(7), 1)
        self.assertEqual(uploader_lib._varint_cost(127), 1)
        self.assertEqual(uploader_lib._varint_cost(128), 2)
        self.assertEqual(uploader_lib._varint_cost(128 * 128 - 1), 2)
        self.assertEqual(uploader_lib._varint_cost(128 * 128), 3)


def _clear_wall_times(request):
    """Clears the wall_time fields in a WriteScalarRequest to be
    deterministic."""
    for run in request.runs:
        for tag in run.tags:
            for point in tag.points:
                point.ClearField("wall_time")


def _apply_compat(events):
    initial_metadata = {}
    for event in events:
        event = data_compat.migrate_event(event)
        events = dataclass_compat.migrate_event(
            event, initial_metadata=initial_metadata
        )
        for event in events:
            yield event


def _extract_tag_counts(run_proto):
    return {tag.name: len(tag.points) for tag in run_proto.tags}


if __name__ == "__main__":
    tf.test.main()
