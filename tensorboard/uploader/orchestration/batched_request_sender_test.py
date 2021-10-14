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
"""Tests for tensorboard.uploader.orchestration.batched_request_sender"""


import itertools
import os
import re
from unittest import mock

import grpc
import grpc_testing

import tensorflow as tf

from tensorboard import data_compat
from tensorboard import dataclass_compat
from tensorboard.compat.proto import tensor_shape_pb2
from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader.orchestration import byte_budget_manager
from tensorboard.uploader.orchestration import batched_request_sender
from tensorboard.uploader.orchestration import scalar_batched_request_sender
from tensorboard.uploader.orchestration import tensor_batched_request_sender
from tensorboard.uploader import test_util
from tensorboard.uploader import upload_tracker
from tensorboard.uploader import logdir_loader
from tensorboard.uploader import util
from tensorboard.uploader import uploader_errors
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.compat.proto import tensor_pb2
from tensorboard.compat.proto import types_pb2
from tensorboard.plugins.histogram import summary_v2 as histogram_v2
from tensorboard.summary import v1 as summary_v1
from tensorboard.util import tensor_util
from tensorboard.plugins.scalar import summary_v2 as scalar_v2
from tensorboard.plugins.scalar import metadata as scalars_metadata
from tensorboard.plugins.histogram import metadata as histograms_metadata
from tensorboard.plugins.graph import metadata as graphs_metadata
from tensorboard.uploader.proto import server_info_pb2


def _apply_compat(events):
    # Applies data compatibility migrations to migrate legacy events to their
    # modern equivalents.
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

# By default allow at least one plugin for each upload type: Scalar, Tensor, and
# Blobs.
_SCALARS_HISTOGRAMS_AND_GRAPHS = frozenset(
    (
        scalars_metadata.PLUGIN_NAME,
        histograms_metadata.PLUGIN_NAME,
        graphs_metadata.PLUGIN_NAME,
    )
)


# Sentinel for `_create_scalar_request_sender` helper, for arguments for which
# we want to supply a default other than the `None` used by the code under test.
_USE_DEFAULT = object()


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

    return batched_request_sender.BatchedRequestSender(
        experiment_id=experiment_id,
        api=api,
        allowed_plugins=allowed_plugins,
        upload_limits=upload_limits,
        rpc_rate_limiter=rpc_rate_limiter,
        tensor_rpc_rate_limiter=tensor_rpc_rate_limiter,
        blob_rpc_rate_limiter=blob_rpc_rate_limiter,
        tracker=upload_tracker.UploadTracker(verbosity=0),
    )


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


if __name__ == "__main__":
    tf.test.main()