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
"""Tests for tensorboard.uploader.batching.scalar_batched_request_sender"""


import itertools
import os
import re
from unittest import mock

import grpc
import grpc_testing

import tensorflow as tf

from tensorboard import data_compat
from tensorboard import dataclass_compat
from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader.batching import byte_budget_manager
from tensorboard.uploader import test_util
from tensorboard.uploader import upload_tracker
from tensorboard.uploader import logdir_loader
from tensorboard.uploader import util
from tensorboard.uploader import uploader_errors
from tensorboard.uploader.batching import scalar_batched_request_sender
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.compat.proto import types_pb2
from tensorboard.plugins.scalar import summary_v2 as scalar_v2
from tensorboard.summary import v1 as summary_v1
from tensorboard.util import tensor_util


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


def _create_mock_client():
    # Create a stub instance (using a test channel) in order to derive a mock
    # from it with autospec enabled. Mocking TensorBoardWriterServiceStub itself
    # doesn't work with autospec because grpc constructs stubs via metaclassing.
    test_channel = grpc_testing.channel(
        service_descriptors=[], time=grpc_testing.strict_real_time()
    )
    stub = write_service_pb2_grpc.TensorBoardWriterServiceStub(test_channel)
    mock_client = mock.create_autospec(stub)
    return mock_client


# Sentinel for `_create_scalar_request_sender` helper, for arguments for which
# we want to supply a default other than the `None` used by the code under test.
_USE_DEFAULT = object()


def _create_scalar_request_sender(
    experiment_id=None,
    api=_USE_DEFAULT,
    max_request_size=_USE_DEFAULT,
    tracker=None,
):
    """Factory method for ScalarBatchedRequestSenders."""
    if api is _USE_DEFAULT:
        api = _create_mock_client()
    if max_request_size is _USE_DEFAULT:
        max_request_size = 128000
    return scalar_batched_request_sender.ScalarBatchedRequestSender(
        experiment_id=experiment_id,
        api=api,
        rpc_rate_limiter=util.RateLimiter(0),
        max_request_size=max_request_size,
        tracker=tracker or upload_tracker.UploadTracker(verbosity=0),
    )


def _clear_wall_times(request):
    """Clears the wall_time fields in a WriteScalarRequest to be
    deterministic."""
    for run in request.runs:
        for tag in run.tags:
            for point in tag.points:
                point.ClearField("wall_time")


class ScalarBatchedRequestSenderTest(tf.test.TestCase):
    def _add_events(self, sender, run_name, events):
        for event in events:
            for value in event.summary.value:
                sender.add_event(run_name, event, value, value.metadata)

    def _add_events_and_flush(self, events):
        mock_client = _create_mock_client()
        sender = _create_scalar_request_sender(
            experiment_id="123",
            api=mock_client,
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
        with self.assertRaises(uploader_errors.ExperimentNotFoundError):
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
        tracker = upload_tracker.UploadTracker(verbosity=0)
        sender = _create_scalar_request_sender(
            "123",
            mock_client,
            # Set a limit to request size
            max_request_size=1024,
            tracker=tracker,
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
        with self.subTest("Scalar report count correct."):
            self.assertEqual(tracker._stats.num_scalars, point_count)

    def test_prunes_tags_and_runs(self):
        mock_client = _create_mock_client()
        event_1 = event_pb2.Event(step=1)
        event_1.summary.value.add(tag="foo", simple_value=1.0)
        event_2 = event_pb2.Event(step=2)
        event_2.summary.value.add(tag="bar", simple_value=-2.0)

        add_point_call_count = 0

        def mock_add_point(byte_budget_manager_self, point):
            # Simulate out-of-space error the first time that we try to store
            # the second point.
            nonlocal add_point_call_count
            add_point_call_count += 1
            if add_point_call_count == 2:
                raise byte_budget_manager.OutOfSpaceError()

        with mock.patch.object(
            byte_budget_manager.ByteBudgetManager,
            "add_point",
            mock_add_point,
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


if __name__ == "__main__":
    tf.test.main()
