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
"""Tests for tensorboard.uploader.batching.tensor_batched_request_sender"""


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


# Sentinel for `_create_tensor_request_sender` helper, for arguments for which
# we want to supply a default other than the `None` used by the code under test.
_USE_DEFAULT = object()


def _create_tensor_request_sender(
    experiment_id=None,
    api=_USE_DEFAULT,
    max_request_size=_USE_DEFAULT,
    max_tensor_point_size=_USE_DEFAULT,
    tracker=None,
):
    if api is _USE_DEFAULT:
        api = _create_mock_client()
    if max_request_size is _USE_DEFAULT:
        max_request_size = 128000
    if max_tensor_point_size is _USE_DEFAULT:
        max_tensor_point_size = 11111
    return tensor_batched_request_sender.TensorBatchedRequestSender(
        experiment_id=experiment_id,
        api=api,
        rpc_rate_limiter=util.RateLimiter(0),
        max_request_size=max_request_size,
        max_tensor_point_size=max_tensor_point_size,
        tracker=tracker or upload_tracker.UploadTracker(verbosity=0),
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
        with self.assertRaises(uploader_errors.ExperimentNotFoundError):
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

        tracker = upload_tracker.UploadTracker(verbosity=0)
        sender = _create_tensor_request_sender(
            "123",
            mock_client,
            # Set a limit to request size
            max_request_size=1024,
            tracker=tracker,
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
        with self.subTest("Tensor report count correct."):
            self.assertEqual(tracker._stats.num_tensors, point_count)

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


if __name__ == "__main__":
    tf.test.main()