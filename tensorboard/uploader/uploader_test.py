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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import itertools
import os
import re
import sys

import grpc
import grpc_testing

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import

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
from tensorboard.uploader import dry_run_stubs
from tensorboard.uploader import test_util
from tensorboard.uploader import upload_tracker
from tensorboard.uploader import uploader as uploader_lib
from tensorboard.uploader import uploader_subcommand
from tensorboard.uploader import logdir_loader
from tensorboard.uploader import server_info as server_info_lib
from tensorboard.uploader import util
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
    experiment_id=None, api=None, allowed_plugins=_USE_DEFAULT,
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


def _create_scalar_request_sender(
    experiment_id=None, api=_USE_DEFAULT, max_request_size=_USE_DEFAULT
):
    if api is _USE_DEFAULT:
        api = _create_mock_client()
    if max_request_size is _USE_DEFAULT:
        max_request_size = 128000
    return uploader_lib._ScalarBatchedRequestSender(
        experiment_id=experiment_id,
        api=api,
        rpc_rate_limiter=util.RateLimiter(0),
        max_request_size=max_request_size,
        tracker=upload_tracker.UploadTracker(verbosity=0),
    )


def _create_tensor_request_sender(
    experiment_id=None,
    api=_USE_DEFAULT,
    max_request_size=_USE_DEFAULT,
    max_tensor_point_size=_USE_DEFAULT,
):
    if api is _USE_DEFAULT:
        api = _create_mock_client()
    if max_request_size is _USE_DEFAULT:
        max_request_size = 128000
    if max_tensor_point_size is _USE_DEFAULT:
        max_tensor_point_size = 11111
    return uploader_lib._TensorBatchedRequestSender(
        experiment_id=experiment_id,
        api=api,
        rpc_rate_limiter=util.RateLimiter(0),
        max_request_size=max_request_size,
        max_tensor_point_size=max_tensor_point_size,
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
        may have "strange" unicode chars 🌴 \/<>
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
            name=new_name, description=new_description,
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
                set(r.blob_sequence_id for r in requests), {"blob%d" % i},
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
            mock_client, logdir, logdir_poll_rate_limiter=limiter,
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
        upload_call_count_box = [0]

        def mock_upload_once():
            upload_call_count_box[0] += 1
            tick_count = mock_rate_limiter.tick.call_count
            self.assertEqual(tick_count, upload_call_count_box[0])
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
        self.assertEqual(mock_constructor.call_args[1], {"verbosity": 0})
        self.assertEqual(mock_tracker.scalars_tracker.call_count, 1)


class BatchedRequestSenderTest(tf.test.TestCase):
    def _populate_run_from_events(
        self, scalar_run, tensor_run, events, allowed_plugins=_USE_DEFAULT
    ):
        mock_client = _create_mock_client()
        builder = _create_request_sender(
            experiment_id="123",
            api=mock_client,
            allowed_plugins=allowed_plugins,
        )
        builder.send_requests({"": _apply_compat(events)})
        scalar_requests = [
            c[0][0] for c in mock_client.WriteScalar.call_args_list
        ]
        if scalar_requests:
            self.assertLen(scalar_requests, 1)
            self.assertLen(scalar_requests[0].runs, 1)
            scalar_run.MergeFrom(scalar_requests[0].runs[0])
        tensor_requests = [
            c[0][0] for c in mock_client.WriteTensor.call_args_list
        ]
        if tensor_requests:
            self.assertLen(tensor_requests, 1)
            self.assertLen(tensor_requests[0].runs, 1)
            tensor_run.MergeFrom(tensor_requests[0].runs[0])

    def test_empty_events(self):
        scalar_run = write_service_pb2.WriteScalarRequest.Run()
        tensor_run = write_service_pb2.WriteTensorRequest.Run()
        self._populate_run_from_events(scalar_run, tensor_run, [])
        self.assertProtoEquals(
            scalar_run, write_service_pb2.WriteScalarRequest.Run()
        )
        self.assertProtoEquals(
            tensor_run, write_service_pb2.WriteTensorRequest.Run()
        )

    def test_scalar_and_tensor_events(self):
        events = [
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar1", 5.0)),
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar2", 5.0)),
            event_pb2.Event(
                summary=histogram_v2.histogram_pb("histogram", [5.0])
            ),
            event_pb2.Event(
                summary=histogram_v2.histogram_pb("histogram", [6.0])
            ),
        ]
        scalar_run = write_service_pb2.WriteScalarRequest.Run()
        tensor_run = write_service_pb2.WriteTensorRequest.Run()
        self._populate_run_from_events(scalar_run, tensor_run, events)
        scalar_tag_counts = _extract_tag_counts(scalar_run)
        self.assertEqual(scalar_tag_counts, {"scalar1": 1, "scalar2": 1})
        tensor_tag_counts = _extract_tag_counts(tensor_run)
        self.assertEqual(tensor_tag_counts, {"histogram": 2})

    def test_skips_non_scalar_and_non_tensor_events(self):
        events = [
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar1", 5.0)),
            event_pb2.Event(file_version="brain.Event:2"),
            event_pb2.Event(
                summary=histogram_v2.histogram_pb("histogram", [5.0])
            ),
        ]
        scalar_run = write_service_pb2.WriteScalarRequest.Run()
        tensor_run = write_service_pb2.WriteTensorRequest.Run()
        self._populate_run_from_events(scalar_run, tensor_run, events)
        scalar_tag_counts = _extract_tag_counts(scalar_run)
        self.assertEqual(scalar_tag_counts, {"scalar1": 1})
        tensor_tag_counts = _extract_tag_counts(tensor_run)
        self.assertEqual(tensor_tag_counts, {"histogram": 1})

    def test_skips_non_scalar_events_in_scalar_time_series(self):
        events = [
            event_pb2.Event(file_version="brain.Event:2"),
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar1", 5.0)),
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar2", 5.0)),
            event_pb2.Event(
                summary=histogram_v2.histogram_pb("scalar2", [5.0])
            ),
        ]
        scalar_run = write_service_pb2.WriteScalarRequest.Run()
        tensor_run = write_service_pb2.WriteTensorRequest.Run()
        self._populate_run_from_events(scalar_run, tensor_run, events)
        scalar_tag_counts = _extract_tag_counts(scalar_run)
        self.assertEqual(scalar_tag_counts, {"scalar1": 1, "scalar2": 1})
        tensor_tag_counts = _extract_tag_counts(tensor_run)
        self.assertEqual(tensor_tag_counts, {})

    def test_skips_events_from_disallowed_plugins(self):
        event = event_pb2.Event(
            step=1, wall_time=123.456, summary=scalar_v2.scalar_pb("foo", 5.0)
        )
        scalar_run = write_service_pb2.WriteScalarRequest.Run()
        tensor_run = write_service_pb2.WriteTensorRequest.Run()
        self._populate_run_from_events(
            scalar_run,
            tensor_run,
            [event],
            allowed_plugins=frozenset("not-scalars"),
        )
        expected_scalar_run = write_service_pb2.WriteScalarRequest.Run()
        self.assertProtoEquals(scalar_run, expected_scalar_run)
        expected_tensor_run = write_service_pb2.WriteTensorRequest.Run()
        self.assertProtoEquals(tensor_run, expected_tensor_run)

    def test_remembers_first_metadata_in_time_series(self):
        scalar_1 = event_pb2.Event(summary=scalar_v2.scalar_pb("loss", 4.0))
        scalar_2 = event_pb2.Event(summary=scalar_v2.scalar_pb("loss", 3.0))
        scalar_2.summary.value[0].ClearField("metadata")
        events = [
            event_pb2.Event(file_version="brain.Event:2"),
            scalar_1,
            scalar_2,
        ]
        scalar_run = write_service_pb2.WriteScalarRequest.Run()
        tensor_run = write_service_pb2.WriteTensorRequest.Run()
        self._populate_run_from_events(scalar_run, tensor_run, events)
        scalar_tag_counts = _extract_tag_counts(scalar_run)
        self.assertEqual(scalar_tag_counts, {"loss": 2})

    def test_expands_multiple_values_in_event(self):
        event = event_pb2.Event(step=1, wall_time=123.456)
        event.summary.value.add(tag="foo", simple_value=1.0)
        event.summary.value.add(tag="foo", simple_value=2.0)
        event.summary.value.add(tag="foo", simple_value=3.0)
        scalar_run = write_service_pb2.WriteScalarRequest.Run()
        tensor_run = write_service_pb2.WriteTensorRequest.Run()
        self._populate_run_from_events(scalar_run, tensor_run, [event])
        expected_scalar_run = write_service_pb2.WriteScalarRequest.Run()
        foo_tag = expected_scalar_run.tags.add()
        foo_tag.name = "foo"
        foo_tag.metadata.display_name = "foo"
        foo_tag.metadata.plugin_data.plugin_name = "scalars"
        foo_tag.metadata.data_class = summary_pb2.DATA_CLASS_SCALAR
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=1.0
        )
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=2.0
        )
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=3.0
        )
        self.assertProtoEquals(scalar_run, expected_scalar_run)


class ScalarBatchedRequestSenderTest(tf.test.TestCase):
    def _add_events(self, sender, run_name, events):
        for event in events:
            for value in event.summary.value:
                sender.add_event(run_name, event, value, value.metadata)

    def _add_events_and_flush(self, events):
        mock_client = _create_mock_client()
        sender = _create_scalar_request_sender(
            experiment_id="123", api=mock_client,
        )
        self._add_events(sender, "", events)
        sender.flush()

        requests = [c[0][0] for c in mock_client.WriteScalar.call_args_list]
        self.assertLen(requests, 1)
        self.assertLen(requests[0].runs, 1)
        return requests[0].runs[0]

    def test_aggregation_by_tag(self):
        def make_event(step, wall_time, tag, value):
            return event_pb2.Event(
                step=step,
                wall_time=wall_time,
                summary=scalar_v2.scalar_pb(tag, value),
            )

        events = [
            make_event(1, 1.0, "one", 11.0),
            make_event(1, 2.0, "two", 22.0),
            make_event(2, 3.0, "one", 33.0),
            make_event(2, 4.0, "two", 44.0),
            make_event(
                1, 5.0, "one", 55.0
            ),  # Should preserve duplicate step=1.
            make_event(1, 6.0, "three", 66.0),
        ]
        run_proto = self._add_events_and_flush(events)
        tag_data = {
            tag.name: [
                (p.step, p.wall_time.ToSeconds(), p.value) for p in tag.points
            ]
            for tag in run_proto.tags
        }
        self.assertEqual(
            tag_data,
            {
                "one": [(1, 1.0, 11.0), (2, 3.0, 33.0), (1, 5.0, 55.0)],
                "two": [(1, 2.0, 22.0), (2, 4.0, 44.0)],
                "three": [(1, 6.0, 66.0)],
            },
        )

    def test_v1_summary(self):
        event = event_pb2.Event(step=1, wall_time=123.456)
        event.summary.value.add(tag="foo", simple_value=5.0)
        run_proto = self._add_events_and_flush(_apply_compat([event]))
        expected_run_proto = write_service_pb2.WriteScalarRequest.Run()
        foo_tag = expected_run_proto.tags.add()
        foo_tag.name = "foo"
        foo_tag.metadata.display_name = "foo"
        foo_tag.metadata.plugin_data.plugin_name = "scalars"
        foo_tag.metadata.data_class = summary_pb2.DATA_CLASS_SCALAR
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=5.0
        )
        self.assertProtoEquals(run_proto, expected_run_proto)

    def test_v1_summary_tb_summary(self):
        tf_summary = summary_v1.scalar_pb("foo", 5.0)
        tb_summary = summary_pb2.Summary.FromString(
            tf_summary.SerializeToString()
        )
        event = event_pb2.Event(step=1, wall_time=123.456, summary=tb_summary)
        run_proto = self._add_events_and_flush(_apply_compat([event]))
        expected_run_proto = write_service_pb2.WriteScalarRequest.Run()
        foo_tag = expected_run_proto.tags.add()
        foo_tag.name = "foo/scalar_summary"
        foo_tag.metadata.display_name = "foo"
        foo_tag.metadata.plugin_data.plugin_name = "scalars"
        foo_tag.metadata.data_class = summary_pb2.DATA_CLASS_SCALAR
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=5.0
        )
        self.assertProtoEquals(run_proto, expected_run_proto)

    def test_v2_summary(self):
        event = event_pb2.Event(
            step=1, wall_time=123.456, summary=scalar_v2.scalar_pb("foo", 5.0)
        )
        run_proto = self._add_events_and_flush(_apply_compat([event]))
        expected_run_proto = write_service_pb2.WriteScalarRequest.Run()
        foo_tag = expected_run_proto.tags.add()
        foo_tag.name = "foo"
        foo_tag.metadata.plugin_data.plugin_name = "scalars"
        foo_tag.metadata.data_class = summary_pb2.DATA_CLASS_SCALAR
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=5.0
        )
        self.assertProtoEquals(run_proto, expected_run_proto)

    def test_propagates_experiment_deletion(self):
        event = event_pb2.Event(step=1)
        event.summary.value.add(tag="foo", simple_value=1.0)

        mock_client = _create_mock_client()
        sender = _create_scalar_request_sender("123", mock_client)
        self._add_events(sender, "run", _apply_compat([event]))

        error = test_util.grpc_error(grpc.StatusCode.NOT_FOUND, "nope")
        mock_client.WriteScalar.side_effect = error
        with self.assertRaises(uploader_lib.ExperimentNotFoundError):
            sender.flush()

    def test_no_budget_for_base_request(self):
        mock_client = _create_mock_client()
        long_experiment_id = "A" * 12
        with self.assertRaises(RuntimeError) as cm:
            _create_scalar_request_sender(
                experiment_id=long_experiment_id,
                api=mock_client,
                max_request_size=12,
            )
        self.assertEqual(
            str(cm.exception), "Byte budget too small for base request"
        )

    def test_no_room_for_single_point(self):
        mock_client = _create_mock_client()
        event = event_pb2.Event(step=1, wall_time=123.456)
        event.summary.value.add(tag="foo", simple_value=1.0)
        long_run_name = "A" * 12
        sender = _create_scalar_request_sender(
            "123", mock_client, max_request_size=12
        )
        with self.assertRaises(RuntimeError) as cm:
            self._add_events(sender, long_run_name, [event])
        self.assertEqual(str(cm.exception), "add_event failed despite flush")

    def test_break_at_run_boundary(self):
        mock_client = _create_mock_client()
        # Choose run name sizes such that one run fits in a 1024 byte request,
        # but not two.
        long_run_1 = "A" * 768
        long_run_2 = "B" * 768
        event_1 = event_pb2.Event(step=1)
        event_1.summary.value.add(tag="foo", simple_value=1.0)
        event_2 = event_pb2.Event(step=2)
        event_2.summary.value.add(tag="bar", simple_value=-2.0)

        sender = _create_scalar_request_sender(
            "123",
            mock_client,
            # Set a limit to request size
            max_request_size=1024,
        )
        self._add_events(sender, long_run_1, _apply_compat([event_1]))
        self._add_events(sender, long_run_2, _apply_compat([event_2]))
        sender.flush()
        requests = [c[0][0] for c in mock_client.WriteScalar.call_args_list]

        for request in requests:
            _clear_wall_times(request)

        # Expect two RPC calls despite a single explicit call to flush().
        expected = [
            write_service_pb2.WriteScalarRequest(experiment_id="123"),
            write_service_pb2.WriteScalarRequest(experiment_id="123"),
        ]
        (
            expected[0]
            .runs.add(name=long_run_1)
            .tags.add(name="foo", metadata=test_util.scalar_metadata("foo"))
            .points.add(step=1, value=1.0)
        )
        (
            expected[1]
            .runs.add(name=long_run_2)
            .tags.add(name="bar", metadata=test_util.scalar_metadata("bar"))
            .points.add(step=2, value=-2.0)
        )
        self.assertEqual(requests, expected)

    def test_break_at_tag_boundary(self):
        mock_client = _create_mock_client()
        # Choose tag name sizes such that one tag fits in a 1024 byte requst,
        # but not two. Note that tag names appear in both `Tag.name` and the
        # summary metadata.
        long_tag_1 = "a" * 384
        long_tag_2 = "b" * 384
        event = event_pb2.Event(step=1)
        event.summary.value.add(tag=long_tag_1, simple_value=1.0)
        event.summary.value.add(tag=long_tag_2, simple_value=2.0)

        sender = _create_scalar_request_sender(
            "123",
            mock_client,
            # Set a limit to request size
            max_request_size=1024,
        )
        self._add_events(sender, "train", _apply_compat([event]))
        sender.flush()
        requests = [c[0][0] for c in mock_client.WriteScalar.call_args_list]
        for request in requests:
            _clear_wall_times(request)

        # Expect two RPC calls despite a single explicit call to flush().
        expected = [
            write_service_pb2.WriteScalarRequest(experiment_id="123"),
            write_service_pb2.WriteScalarRequest(experiment_id="123"),
        ]
        (
            expected[0]
            .runs.add(name="train")
            .tags.add(
                name=long_tag_1, metadata=test_util.scalar_metadata(long_tag_1)
            )
            .points.add(step=1, value=1.0)
        )
        (
            expected[1]
            .runs.add(name="train")
            .tags.add(
                name=long_tag_2, metadata=test_util.scalar_metadata(long_tag_2)
            )
            .points.add(step=1, value=2.0)
        )
        self.assertEqual(requests, expected)

    def test_break_at_scalar_point_boundary(self):
        mock_client = _create_mock_client()
        point_count = 2000  # comfortably saturates a single 1024-byte request
        events = []
        for step in range(point_count):
            summary = scalar_v2.scalar_pb("loss", -2.0 * step)
            if step > 0:
                summary.value[0].ClearField("metadata")
            events.append(event_pb2.Event(summary=summary, step=step))

        sender = _create_scalar_request_sender(
            "123",
            mock_client,
            # Set a limit to request size
            max_request_size=1024,
        )
        self._add_events(sender, "train", _apply_compat(events))
        sender.flush()
        requests = [c[0][0] for c in mock_client.WriteScalar.call_args_list]
        for request in requests:
            _clear_wall_times(request)

        self.assertGreater(len(requests), 1)
        self.assertLess(len(requests), point_count)
        # This is the observed number of requests when running the test. There
        # is no reasonable way to derive this value from just reading the code.
        # The number of requests does not have to be 33 to be correct but if it
        # changes it probably warrants some investigation or thought.
        self.assertEqual(33, len(requests))

        total_points_in_result = 0
        for request in requests:
            self.assertLen(request.runs, 1)
            run = request.runs[0]
            self.assertEqual(run.name, "train")
            self.assertLen(run.tags, 1)
            tag = run.tags[0]
            self.assertEqual(tag.name, "loss")
            for point in tag.points:
                self.assertEqual(point.step, total_points_in_result)
                self.assertEqual(point.value, -2.0 * point.step)
                total_points_in_result += 1
            self.assertLessEqual(request.ByteSize(), 1024)
        self.assertEqual(total_points_in_result, point_count)

    def test_prunes_tags_and_runs(self):
        mock_client = _create_mock_client()
        event_1 = event_pb2.Event(step=1)
        event_1.summary.value.add(tag="foo", simple_value=1.0)
        event_2 = event_pb2.Event(step=2)
        event_2.summary.value.add(tag="bar", simple_value=-2.0)

        add_point_call_count_box = [0]

        def mock_add_point(byte_budget_manager_self, point):
            # Simulate out-of-space error the first time that we try to store
            # the second point.
            add_point_call_count_box[0] += 1
            if add_point_call_count_box[0] == 2:
                raise uploader_lib._OutOfSpaceError()

        with mock.patch.object(
            uploader_lib._ByteBudgetManager, "add_point", mock_add_point,
        ):
            sender = _create_scalar_request_sender("123", mock_client)
            self._add_events(sender, "train", _apply_compat([event_1]))
            self._add_events(sender, "test", _apply_compat([event_2]))
            sender.flush()
        requests = [c[0][0] for c in mock_client.WriteScalar.call_args_list]
        for request in requests:
            _clear_wall_times(request)

        expected = [
            write_service_pb2.WriteScalarRequest(experiment_id="123"),
            write_service_pb2.WriteScalarRequest(experiment_id="123"),
        ]
        (
            expected[0]
            .runs.add(name="train")
            .tags.add(name="foo", metadata=test_util.scalar_metadata("foo"))
            .points.add(step=1, value=1.0)
        )
        (
            expected[1]
            .runs.add(name="test")
            .tags.add(name="bar", metadata=test_util.scalar_metadata("bar"))
            .points.add(step=2, value=-2.0)
        )
        self.assertEqual(expected, requests)

    def test_wall_time_precision(self):
        # Test a wall time that is exactly representable in float64 but has enough
        # digits to incur error if converted to nanoseconds the naive way (* 1e9).
        event1 = event_pb2.Event(step=1, wall_time=1567808404.765432119)
        event1.summary.value.add(tag="foo", simple_value=1.0)
        # Test a wall time where as a float64, the fractional part on its own will
        # introduce error if truncated to 9 decimal places instead of rounded.
        event2 = event_pb2.Event(step=2, wall_time=1.000000002)
        event2.summary.value.add(tag="foo", simple_value=2.0)
        run_proto = self._add_events_and_flush(_apply_compat([event1, event2]))
        self.assertEqual(
            test_util.timestamp_pb(1567808404765432119),
            run_proto.tags[0].points[0].wall_time,
        )
        self.assertEqual(
            test_util.timestamp_pb(1000000002),
            run_proto.tags[0].points[1].wall_time,
        )


class TensorBatchedRequestSenderTest(tf.test.TestCase):
    def _add_events(self, sender, run_name, events):
        for event in events:
            for value in event.summary.value:
                sender.add_event(run_name, event, value, value.metadata)

    def _add_events_and_flush(self, events, max_tensor_point_size=_USE_DEFAULT):
        mock_client = _create_mock_client()
        sender = _create_tensor_request_sender(
            experiment_id="123",
            api=mock_client,
            max_tensor_point_size=max_tensor_point_size,
        )
        self._add_events(sender, "", events)
        sender.flush()

        requests = [c[0][0] for c in mock_client.WriteTensor.call_args_list]
        self.assertLen(requests, 1)
        self.assertLen(requests[0].runs, 1)
        return requests[0].runs[0]

    def test_histogram_event(self):
        event = event_pb2.Event(
            step=1,
            wall_time=123.456,
            summary=histogram_v2.histogram_pb("foo", [1.0]),
        )

        run_proto = self._add_events_and_flush(_apply_compat([event]))
        expected_run_proto = write_service_pb2.WriteTensorRequest.Run()
        foo_tag = expected_run_proto.tags.add()
        foo_tag.name = "foo"
        foo_tag.metadata.plugin_data.plugin_name = "histograms"
        foo_tag.metadata.data_class = summary_pb2.DATA_CLASS_TENSOR
        foo_tag.points.add(
            step=1,
            wall_time=test_util.timestamp_pb(123456000000),
            value=tensor_pb2.TensorProto(dtype=types_pb2.DT_DOUBLE),
        )
        # Simplify the tensor value a bit before making assertions on it.
        # We care that it is copied to the request but we don't need it to be
        # an extensive test.
        run_proto.tags[0].points[0].value.ClearField("tensor_shape")
        run_proto.tags[0].points[0].value.ClearField("tensor_content")
        self.assertProtoEquals(run_proto, expected_run_proto)

    def test_histogram_event_with_empty_tensor_content_errors_out(self):
        event = event_pb2.Event(step=42)
        event.summary.value.add(
            tag="one",
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE,
                # Use empty tensor content to elicit an error.
                tensor_content=b"",
            ),
        )

        mock_client = _create_mock_client()
        sender = _create_tensor_request_sender("123", mock_client)
        with self.assertRaisesRegexp(
            ValueError,
            re.compile(
                r"failed to upload a tensor.*malformation.*tag.*\'one\'.*step.*42",
                re.DOTALL,
            ),
        ):
            self._add_events(sender, "run", _apply_compat([event]))

    def test_histogram_event_with_incorrect_tensor_shape_errors_out(self):
        event = event_pb2.Event(step=1337)
        tensor_proto = tensor_util.make_tensor_proto([1.0, 2.0])
        # Add an extraneous dimension to the tensor shape in order to
        # elicit an error.
        tensor_proto.tensor_shape.dim.append(
            tensor_shape_pb2.TensorShapeProto.Dim(size=2)
        )
        event.summary.value.add(tag="two", tensor=tensor_proto)

        mock_client = _create_mock_client()
        sender = _create_tensor_request_sender("123", mock_client)
        with self.assertRaisesRegexp(
            ValueError,
            re.compile(
                r"failed to upload a tensor.*malformation.*tag.*\'two\'.*step.*1337."
                r"*shape",
                re.DOTALL,
            ),
        ):
            self._add_events(sender, "run", _apply_compat([event]))

    def test_aggregation_by_tag(self):
        def make_event(step, wall_time, tag):
            event = event_pb2.Event(step=step, wall_time=wall_time)
            event.summary.value.add(
                tag=tag,
                tensor=tensor_pb2.TensorProto(
                    dtype=types_pb2.DT_DOUBLE, double_val=[1.0]
                ),
            )
            return event

        events = [
            make_event(1, 1.0, "one"),
            make_event(1, 2.0, "two"),
            make_event(2, 3.0, "one"),
            make_event(2, 4.0, "two"),
            make_event(1, 5.0, "one"),  # Should preserve duplicate step=1.
            make_event(1, 6.0, "three"),
        ]
        run_proto = self._add_events_and_flush(events)
        tag_data = {
            tag.name: [(p.step, p.wall_time.ToSeconds()) for p in tag.points]
            for tag in run_proto.tags
        }
        self.assertEqual(
            tag_data,
            {
                "one": [(1, 1.0), (2, 3.0), (1, 5.0)],
                "two": [(1, 2.0), (2, 4.0)],
                "three": [(1, 6.0)],
            },
        )

    def test_propagates_experiment_deletion(self):
        event = event_pb2.Event(step=1)
        event.summary.value.add(
            tag="one",
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[1.0]
            ),
        )

        mock_client = _create_mock_client()
        sender = _create_tensor_request_sender("123", mock_client)
        self._add_events(sender, "run", _apply_compat([event]))

        error = test_util.grpc_error(grpc.StatusCode.NOT_FOUND, "nope")
        mock_client.WriteTensor.side_effect = error
        with self.assertRaises(uploader_lib.ExperimentNotFoundError):
            sender.flush()

    def test_no_budget_for_base_request(self):
        mock_client = _create_mock_client()
        long_experiment_id = "A" * 12
        with self.assertRaises(RuntimeError) as cm:
            _create_tensor_request_sender(
                experiment_id=long_experiment_id,
                api=mock_client,
                max_request_size=12,
            )
        self.assertEqual(
            str(cm.exception), "Byte budget too small for base request"
        )

    def test_no_room_for_single_point(self):
        mock_client = _create_mock_client()
        event = event_pb2.Event(step=1)
        event.summary.value.add(
            tag="one",
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[1.0]
            ),
        )
        long_run_name = "A" * 12
        sender = _create_tensor_request_sender(
            "123", mock_client, max_request_size=12
        )
        with self.assertRaises(RuntimeError) as cm:
            self._add_events(sender, long_run_name, [event])
        self.assertEqual(str(cm.exception), "add_event failed despite flush")

    def test_break_at_run_boundary(self):
        mock_client = _create_mock_client()
        # Choose run name sizes such that one run fits in a 1024 byte request,
        # but not two.
        long_run_1 = "A" * 768
        long_run_2 = "B" * 768
        event_1 = event_pb2.Event(step=1)
        event_1.summary.value.add(
            tag="one",
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[1.0]
            ),
        )
        event_2 = event_pb2.Event(step=2)
        event_2.summary.value.add(
            tag="two",
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[2.0]
            ),
        )

        sender = _create_tensor_request_sender(
            "123",
            mock_client,
            # Set a limit to request size
            max_request_size=1024,
        )
        self._add_events(sender, long_run_1, _apply_compat([event_1]))
        self._add_events(sender, long_run_2, _apply_compat([event_2]))
        sender.flush()
        requests = [c[0][0] for c in mock_client.WriteTensor.call_args_list]

        # Expect two RPC calls despite a single explicit call to flush().
        self.assertEqual(2, len(requests))
        self.assertEqual(1, len(requests[0].runs))
        self.assertEqual(long_run_1, requests[0].runs[0].name)
        self.assertEqual(1, len(requests[1].runs))
        self.assertEqual(long_run_2, requests[1].runs[0].name)

    def test_break_at_tag_boundary(self):
        mock_client = _create_mock_client()
        # Choose tag name sizes such that one tag fits in a 1024 byte request,
        # but not two.
        long_tag_1 = "a" * 600
        long_tag_2 = "b" * 600
        event = event_pb2.Event(step=1, wall_time=1)
        event.summary.value.add(
            tag=long_tag_1,
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[1.0]
            ),
        )
        event.summary.value.add(
            tag=long_tag_2,
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[2.0]
            ),
        )

        sender = _create_tensor_request_sender(
            "123",
            mock_client,
            # Set a limit to request size
            max_request_size=1024,
        )
        self._add_events(sender, "train", _apply_compat([event]))
        sender.flush()
        requests = [c[0][0] for c in mock_client.WriteTensor.call_args_list]

        # Expect two RPC calls despite a single explicit call to flush().
        self.assertEqual(2, len(requests))
        # First RPC contains one tag.
        self.assertEqual(1, len(requests[0].runs))
        self.assertEqual("train", requests[0].runs[0].name)
        self.assertEqual(1, len(requests[0].runs[0].tags))
        self.assertEqual(long_tag_1, requests[0].runs[0].tags[0].name)
        # Second RPC contains the other tag.
        self.assertEqual(1, len(requests[1].runs))
        self.assertEqual("train", requests[1].runs[0].name)
        self.assertEqual(1, len(requests[1].runs[0].tags))
        self.assertEqual(long_tag_2, requests[1].runs[0].tags[0].name)

    def test_break_at_tensor_point_boundary(self):
        mock_client = _create_mock_client()
        point_count = 2000  # comfortably saturates a single 1024-byte request
        events = []
        for step in range(point_count):
            event = event_pb2.Event(step=step)
            tensor_proto = tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[1.0 * step, -1.0 * step]
            )
            tensor_proto.tensor_shape.dim.append(
                tensor_shape_pb2.TensorShapeProto.Dim(size=2)
            )
            event.summary.value.add(tag="histo", tensor=tensor_proto)
            events.append(event)

        sender = _create_tensor_request_sender(
            "123",
            mock_client,
            # Set a limit to request size
            max_request_size=1024,
        )
        self._add_events(sender, "train", _apply_compat(events))
        sender.flush()
        requests = [c[0][0] for c in mock_client.WriteTensor.call_args_list]

        self.assertGreater(len(requests), 1)
        self.assertLess(len(requests), point_count)
        self.assertEqual(72, len(requests))

        total_points_in_result = 0
        for request in requests:
            self.assertLen(request.runs, 1)
            run = request.runs[0]
            self.assertEqual(run.name, "train")
            self.assertLen(run.tags, 1)
            tag = run.tags[0]
            self.assertEqual(tag.name, "histo")
            for point in tag.points:
                self.assertEqual(point.step, total_points_in_result)
                self.assertEqual(
                    point.value.double_val,
                    [1.0 * point.step, -1.0 * point.step],
                )
                total_points_in_result += 1
            self.assertLessEqual(request.ByteSize(), 1024)
        self.assertEqual(total_points_in_result, point_count)

    def test_strip_large_tensors(self):
        # Generate test data with varying tensor point sizes. Use raw bytes.
        event_1 = event_pb2.Event(step=1)
        event_1.summary.value.add(
            tag="one",
            # This TensorProto has a byte size of 18.
            tensor=tensor_util.make_tensor_proto([1.0, 2.0]),
        )
        event_1.summary.value.add(
            tag="two",
            # This TensorProto has a byte size of 22.
            tensor=tensor_util.make_tensor_proto([1.0, 2.0, 3.0]),
        )
        # This TensorProto has a 12-byte tensor_content.
        event_2 = event_pb2.Event(step=2)
        event_2.summary.value.add(
            tag="one",
            # This TensorProto has a byte size of 18.
            tensor=tensor_util.make_tensor_proto([2.0, 4.0]),
        )
        event_2.summary.value.add(
            tag="two",
            # This TensorProto has a byte size of 26.
            tensor=tensor_util.make_tensor_proto([1.0, 2.0, 3.0, 4.0]),
        )

        run_proto = self._add_events_and_flush(
            _apply_compat([event_1, event_2]),
            # Set threshold that will filter out the tensor point with 26 bytes
            # of data and above. The additional byte is for proto overhead.
            max_tensor_point_size=24,
        )
        tag_data = {
            tag.name: [(p.step, p.value.tensor_content) for p in tag.points]
            for tag in run_proto.tags
        }
        # A single tensor point is filtered out.
        self.assertEqual(
            tag_data,
            {
                "one": [
                    (1, b"\x00\x00\x80?\x00\x00\x00@"),
                    (2, b"\x00\x00\x00@\x00\x00\x80@"),
                ],
                "two": [(1, b"\x00\x00\x80?\x00\x00\x00@\x00\x00@@")],
            },
        )

        run_proto_2 = self._add_events_and_flush(
            _apply_compat([event_1, event_2]),
            # Set threshold that will filter out the tensor points with 22 and 26
            # bytes of data and above. The additional byte is for proto overhead.
            max_tensor_point_size=20,
        )
        tag_data_2 = {
            tag.name: [(p.step, p.value.tensor_content) for p in tag.points]
            for tag in run_proto_2.tags
        }
        # All tensor points from the same tag are filtered out, and the tag is pruned.
        self.assertEqual(
            tag_data_2,
            {
                "one": [
                    (1, b"\x00\x00\x80?\x00\x00\x00@"),
                    (2, b"\x00\x00\x00@\x00\x00\x80@"),
                ],
            },
        )

    def test_prunes_tags_and_runs(self):
        mock_client = _create_mock_client()
        event_1 = event_pb2.Event(step=1)
        event_1.summary.value.add(
            tag="one",
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[1.0]
            ),
        )
        event_2 = event_pb2.Event(step=2)
        event_2.summary.value.add(
            tag="two",
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[2.0]
            ),
        )

        add_point_call_count_box = [0]

        def mock_add_point(byte_budget_manager_self, point):
            # Simulate out-of-space error the first time that we try to store
            # the second point.
            add_point_call_count_box[0] += 1
            if add_point_call_count_box[0] == 2:
                raise uploader_lib._OutOfSpaceError()

        with mock.patch.object(
            uploader_lib._ByteBudgetManager, "add_point", mock_add_point,
        ):
            sender = _create_tensor_request_sender("123", mock_client)
            self._add_events(sender, "train", _apply_compat([event_1]))
            self._add_events(sender, "test", _apply_compat([event_2]))
            sender.flush()
        requests = [c[0][0] for c in mock_client.WriteTensor.call_args_list]

        # Expect two RPC calls despite a single explicit call to flush().
        self.assertEqual(2, len(requests))
        # First RPC contains one tag.
        self.assertEqual(1, len(requests[0].runs))
        self.assertEqual("train", requests[0].runs[0].name)
        self.assertEqual(1, len(requests[0].runs[0].tags))
        self.assertEqual("one", requests[0].runs[0].tags[0].name)
        # Second RPC contains the other tag.
        self.assertEqual(1, len(requests[1].runs))
        self.assertEqual("test", requests[1].runs[0].name)
        self.assertEqual(1, len(requests[1].runs[0].tags))
        self.assertEqual("two", requests[1].runs[0].tags[0].name)

    def test_wall_time_precision(self):
        # Test a wall time that is exactly representable in float64 but has enough
        # digits to incur error if converted to nanoseconds the naive way (* 1e9).
        event_1 = event_pb2.Event(step=1, wall_time=1567808404.765432119)
        event_1.summary.value.add(
            tag="tag",
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[1.0]
            ),
        )
        # Test a wall time where as a float64, the fractional part on its own will
        # introduce error if truncated to 9 decimal places instead of rounded.
        event_2 = event_pb2.Event(step=2, wall_time=1.000000002)
        event_2.summary.value.add(
            tag="tag",
            tensor=tensor_pb2.TensorProto(
                dtype=types_pb2.DT_DOUBLE, double_val=[2.0]
            ),
        )
        run_proto = self._add_events_and_flush(
            _apply_compat([event_1, event_2])
        )
        self.assertEqual(
            test_util.timestamp_pb(1567808404765432119),
            run_proto.tags[0].points[0].wall_time,
        )
        self.assertEqual(
            test_util.timestamp_pb(1000000002),
            run_proto.tags[0].points[1].wall_time,
        )


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

        with self.assertRaises(uploader_lib.ExperimentNotFoundError):
            uploader_lib.delete_experiment(mock_client, "123")

    def test_unauthorized(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.PERMISSION_DENIED, "nope")
        mock_client.DeleteExperiment.side_effect = error

        with self.assertRaises(uploader_lib.PermissionDeniedError):
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

        with self.assertRaises(uploader_lib.ExperimentNotFoundError):
            uploader_lib.update_experiment_metadata(mock_client, "123", name="")

    def test_unauthorized(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(grpc.StatusCode.PERMISSION_DENIED, "nope")
        mock_client.UpdateExperiment.side_effect = error

        with self.assertRaises(uploader_lib.PermissionDeniedError):
            uploader_lib.update_experiment_metadata(mock_client, "123", name="")

    def test_invalid_argument(self):
        mock_client = _create_mock_client()
        error = test_util.grpc_error(
            grpc.StatusCode.INVALID_ARGUMENT, "too many"
        )
        mock_client.UpdateExperiment.side_effect = error

        with self.assertRaises(uploader_lib.InvalidArgumentError) as cm:
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


class UploadIntentTest(tf.test.TestCase):
    def testUploadIntentUnderDryRunOneShot(self):
        """Test the upload intent under the dry-run + one-shot mode."""
        mock_server_info = mock.MagicMock()
        mock_channel = mock.MagicMock()
        upload_limits = server_info_pb2.UploadLimits(
            max_scalar_request_size=128000,
            max_tensor_request_size=128000,
            max_tensor_point_size=11111,
            max_blob_request_size=128000,
            max_blob_size=128000,
        )
        mock_stdout_write = mock.MagicMock()
        with mock.patch.object(
            server_info_lib,
            "allowed_plugins",
            return_value=_SCALARS_HISTOGRAMS_AND_GRAPHS,
        ), mock.patch.object(
            server_info_lib, "upload_limits", return_value=upload_limits
        ), mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ), mock.patch.object(
            dry_run_stubs,
            "DryRunTensorBoardWriterStub",
            side_effect=dry_run_stubs.DryRunTensorBoardWriterStub,
        ) as mock_dry_run_stub:
            intent = uploader_subcommand.UploadIntent(
                self.get_temp_dir(), dry_run=True, one_shot=True
            )
            intent.execute(mock_server_info, mock_channel)
        self.assertEqual(mock_dry_run_stub.call_count, 1)
        self.assertEqual(
            mock_stdout_write.call_args_list[-1][0][0], "\nDone.\n"
        )

    def testUploadIntentDryRunNonOneShotInterrupted(self):
        mock_server_info = mock.MagicMock()
        mock_channel = mock.MagicMock()
        mock_stdout_write = mock.MagicMock()
        mock_uploader = mock.MagicMock()
        with mock.patch.object(
            mock_uploader, "start_uploading", side_effect=KeyboardInterrupt(),
        ), mock.patch.object(
            uploader_lib, "TensorBoardUploader", return_value=mock_uploader
        ), mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ):
            intent = uploader_subcommand.UploadIntent(
                self.get_temp_dir(), dry_run=True, one_shot=False
            )
            intent.execute(mock_server_info, mock_channel)
        self.assertEqual(
            mock_stdout_write.call_args_list[-1][0][0], "\nInterrupted.\n"
        )

    def testUploadIntentNonDryRunNonOneShotInterrupted(self):
        mock_server_info = mock.MagicMock()
        mock_channel = mock.MagicMock()
        mock_stdout_write = mock.MagicMock()
        mock_uploader = mock.MagicMock()
        with mock.patch.object(
            mock_uploader, "start_uploading", side_effect=KeyboardInterrupt(),
        ), mock.patch.object(
            uploader_lib, "TensorBoardUploader", return_value=mock_uploader
        ), mock.patch.object(
            sys.stdout, "write", mock_stdout_write
        ):
            intent = uploader_subcommand.UploadIntent(
                self.get_temp_dir(), dry_run=False, one_shot=False
            )
            intent.execute(mock_server_info, mock_channel)
        self.assertIn(
            "\nInterrupted. View your TensorBoard at ",
            mock_stdout_write.call_args_list[-1][0][0],
        )


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
