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

import collections
import os

import grpc
import grpc_testing

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import

import tensorflow as tf

from tensorboard.uploader.proto import experiment_pb2
from tensorboard.uploader.proto import scalar_pb2
from tensorboard.uploader.proto import write_service_pb2
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader import test_util
from tensorboard.uploader import uploader as uploader_lib
from tensorboard.uploader import logdir_loader
from tensorboard.uploader import util
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins.histogram import summary_v2 as histogram_v2
from tensorboard.plugins.scalar import metadata as scalars_metadata
from tensorboard.plugins.scalar import summary_v2 as scalar_v2
from tensorboard.summary import v1 as summary_v1
from tensorboard.util import test_util as tb_test_util


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
    return mock_client


_SCALARS_ONLY = frozenset((scalars_metadata.PLUGIN_NAME,))


# Sentinel for `_create_*` helpers, for arguments for which we want to
# supply a default other than the `None` used by the code under test.
_USE_DEFAULT = object()


def _create_uploader(
    writer_client=_USE_DEFAULT,
    logdir=None,
    allowed_plugins=_USE_DEFAULT,
    logdir_poll_rate_limiter=_USE_DEFAULT,
    rpc_rate_limiter=_USE_DEFAULT,
    name=None,
    description=None,
):
    if writer_client is _USE_DEFAULT:
        writer_client = _create_mock_client()
    if allowed_plugins is _USE_DEFAULT:
        allowed_plugins = _SCALARS_ONLY
    if logdir_poll_rate_limiter is _USE_DEFAULT:
        logdir_poll_rate_limiter = util.RateLimiter(0)
    if rpc_rate_limiter is _USE_DEFAULT:
        rpc_rate_limiter = util.RateLimiter(0)
    return uploader_lib.TensorBoardUploader(
        writer_client,
        logdir,
        allowed_plugins=allowed_plugins,
        logdir_poll_rate_limiter=logdir_poll_rate_limiter,
        rpc_rate_limiter=rpc_rate_limiter,
        name=name,
        description=description,
    )


def _create_request_sender(
    experiment_id=None,
    api=None,
    allowed_plugins=_USE_DEFAULT,
    rpc_rate_limiter=_USE_DEFAULT,
):
    if api is _USE_DEFAULT:
        api = _create_mock_client()
    if allowed_plugins is _USE_DEFAULT:
        allowed_plugins = _SCALARS_ONLY
    if rpc_rate_limiter is _USE_DEFAULT:
        rpc_rate_limiter = util.RateLimiter(0)
    return uploader_lib._BatchedRequestSender(
        experiment_id=experiment_id,
        api=api,
        allowed_plugins=allowed_plugins,
        rpc_rate_limiter=rpc_rate_limiter,
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

    # Send each Event below in a separate WriteScalarRequest
    @mock.patch.object(uploader_lib, "_MAX_REQUEST_LENGTH_BYTES", 100)
    def test_start_uploading(self):
        mock_client = _create_mock_client()
        mock_rate_limiter = mock.create_autospec(util.RateLimiter)
        uploader = _create_uploader(
            mock_client, "/logs/foo", rpc_rate_limiter=mock_rate_limiter
        )
        uploader.create_experiment()

        def scalar_event(tag, value):
            return event_pb2.Event(summary=scalar_v2.scalar_pb(tag, value))

        mock_logdir_loader = mock.create_autospec(logdir_loader.LogdirLoader)
        mock_logdir_loader.get_run_events.side_effect = [
            {
                "run 1": [scalar_event("1.1", 5.0), scalar_event("1.2", 5.0)],
                "run 2": [scalar_event("2.1", 5.0), scalar_event("2.2", 5.0)],
            },
            {
                "run 3": [scalar_event("3.1", 5.0), scalar_event("3.2", 5.0)],
                "run 4": [scalar_event("4.1", 5.0), scalar_event("4.2", 5.0)],
                "run 5": [scalar_event("5.1", 5.0), scalar_event("5.2", 5.0)],
            },
            AbortUploadError,
        ]

        with mock.patch.object(
            uploader, "_logdir_loader", mock_logdir_loader
        ), self.assertRaises(AbortUploadError):
            uploader.start_uploading()
        self.assertEqual(4 + 6, mock_client.WriteScalar.call_count)
        self.assertEqual(4 + 6, mock_rate_limiter.tick.call_count)

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

    def test_upload_propagates_experiment_deletion(self):
        logdir = self.get_temp_dir()
        with tb_test_util.FileWriter(logdir) as writer:
            writer.add_test_summary("foo")
        mock_client = _create_mock_client()
        uploader = _create_uploader(mock_client, logdir)
        uploader.create_experiment()
        error = test_util.grpc_error(grpc.StatusCode.NOT_FOUND, "nope")
        mock_client.WriteScalar.side_effect = error
        with self.assertRaises(uploader_lib.ExperimentNotFoundError):
            uploader._upload_once()

    def test_upload_preserves_wall_time(self):
        logdir = self.get_temp_dir()
        with tb_test_util.FileWriter(logdir) as writer:
            # Add a raw event so we can specify the wall_time value deterministically.
            writer.add_event(
                event_pb2.Event(
                    step=1,
                    wall_time=123.123123123,
                    summary=scalar_v2.scalar_pb("foo", 5.0),
                )
            )
        mock_client = _create_mock_client()
        uploader = _create_uploader(mock_client, logdir)
        uploader.create_experiment()
        uploader._upload_once()
        mock_client.WriteScalar.assert_called_once()
        request = mock_client.WriteScalar.call_args[0][0]
        # Just check the wall_time value; everything else is covered in the full
        # logdir test below.
        self.assertEqual(
            123123123123,
            request.runs[0].tags[0].points[0].wall_time.ToNanoseconds(),
        )

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


class BatchedRequestSenderTest(tf.test.TestCase):
    def _populate_run_from_events(
        self, run_proto, events, allowed_plugins=_USE_DEFAULT
    ):
        mock_client = _create_mock_client()
        builder = _create_request_sender(
            experiment_id="123",
            api=mock_client,
            allowed_plugins=allowed_plugins,
        )
        builder.send_requests({"": events})
        requests = [c[0][0] for c in mock_client.WriteScalar.call_args_list]
        if requests:
            self.assertLen(requests, 1)
            self.assertLen(requests[0].runs, 1)
            run_proto.MergeFrom(requests[0].runs[0])

    def test_empty_events(self):
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, [])
        self.assertProtoEquals(
            run_proto, write_service_pb2.WriteScalarRequest.Run()
        )

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
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, events)
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

    def test_skips_non_scalar_events(self):
        events = [
            event_pb2.Event(file_version="brain.Event:2"),
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar1", 5.0)),
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar2", 5.0)),
            event_pb2.Event(
                summary=histogram_v2.histogram_pb("histogram", [5.0])
            ),
        ]
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, events)
        tag_counts = {tag.name: len(tag.points) for tag in run_proto.tags}
        self.assertEqual(tag_counts, {"scalar1": 1, "scalar2": 1})

    def test_skips_scalar_events_in_non_scalar_time_series(self):
        events = [
            event_pb2.Event(file_version="brain.Event:2"),
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar1", 5.0)),
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar2", 5.0)),
            event_pb2.Event(
                summary=histogram_v2.histogram_pb("histogram", [5.0])
            ),
            event_pb2.Event(summary=scalar_v2.scalar_pb("histogram", 5.0)),
        ]
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, events)
        tag_counts = {tag.name: len(tag.points) for tag in run_proto.tags}
        self.assertEqual(tag_counts, {"scalar1": 1, "scalar2": 1})

    def test_skips_non_scalar_events_in_scalar_time_series(self):
        events = [
            event_pb2.Event(file_version="brain.Event:2"),
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar1", 5.0)),
            event_pb2.Event(summary=scalar_v2.scalar_pb("scalar2", 5.0)),
            event_pb2.Event(
                summary=histogram_v2.histogram_pb("scalar2", [5.0])
            ),
        ]
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, events)
        tag_counts = {tag.name: len(tag.points) for tag in run_proto.tags}
        self.assertEqual(tag_counts, {"scalar1": 1, "scalar2": 1})

    def test_skips_events_from_disallowed_plugins(self):
        event = event_pb2.Event(
            step=1, wall_time=123.456, summary=scalar_v2.scalar_pb("foo", 5.0)
        )
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(
            run_proto, [event], allowed_plugins=frozenset("not-scalars")
        )
        expected_run_proto = write_service_pb2.WriteScalarRequest.Run()
        self.assertProtoEquals(run_proto, expected_run_proto)

    def test_remembers_first_metadata_in_scalar_time_series(self):
        scalar_1 = event_pb2.Event(summary=scalar_v2.scalar_pb("loss", 4.0))
        scalar_2 = event_pb2.Event(summary=scalar_v2.scalar_pb("loss", 3.0))
        scalar_2.summary.value[0].ClearField("metadata")
        events = [
            event_pb2.Event(file_version="brain.Event:2"),
            scalar_1,
            scalar_2,
        ]
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, events)
        tag_counts = {tag.name: len(tag.points) for tag in run_proto.tags}
        self.assertEqual(tag_counts, {"loss": 2})

    def test_v1_summary_single_value(self):
        event = event_pb2.Event(step=1, wall_time=123.456)
        event.summary.value.add(tag="foo", simple_value=5.0)
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, [event])
        expected_run_proto = write_service_pb2.WriteScalarRequest.Run()
        foo_tag = expected_run_proto.tags.add()
        foo_tag.name = "foo"
        foo_tag.metadata.display_name = "foo"
        foo_tag.metadata.plugin_data.plugin_name = "scalars"
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=5.0
        )
        self.assertProtoEquals(run_proto, expected_run_proto)

    def test_v1_summary_multiple_value(self):
        event = event_pb2.Event(step=1, wall_time=123.456)
        event.summary.value.add(tag="foo", simple_value=1.0)
        event.summary.value.add(tag="foo", simple_value=2.0)
        event.summary.value.add(tag="foo", simple_value=3.0)
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, [event])
        expected_run_proto = write_service_pb2.WriteScalarRequest.Run()
        foo_tag = expected_run_proto.tags.add()
        foo_tag.name = "foo"
        foo_tag.metadata.display_name = "foo"
        foo_tag.metadata.plugin_data.plugin_name = "scalars"
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=1.0
        )
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=2.0
        )
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=3.0
        )
        self.assertProtoEquals(run_proto, expected_run_proto)

    def test_v1_summary_tb_summary(self):
        tf_summary = summary_v1.scalar_pb("foo", 5.0)
        tb_summary = summary_pb2.Summary.FromString(
            tf_summary.SerializeToString()
        )
        event = event_pb2.Event(step=1, wall_time=123.456, summary=tb_summary)
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, [event])
        expected_run_proto = write_service_pb2.WriteScalarRequest.Run()
        foo_tag = expected_run_proto.tags.add()
        foo_tag.name = "foo/scalar_summary"
        foo_tag.metadata.display_name = "foo"
        foo_tag.metadata.plugin_data.plugin_name = "scalars"
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=5.0
        )
        self.assertProtoEquals(run_proto, expected_run_proto)

    def test_v2_summary(self):
        event = event_pb2.Event(
            step=1, wall_time=123.456, summary=scalar_v2.scalar_pb("foo", 5.0)
        )
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, [event])
        expected_run_proto = write_service_pb2.WriteScalarRequest.Run()
        foo_tag = expected_run_proto.tags.add()
        foo_tag.name = "foo"
        foo_tag.metadata.plugin_data.plugin_name = "scalars"
        foo_tag.points.add(
            step=1, wall_time=test_util.timestamp_pb(123456000000), value=5.0
        )
        self.assertProtoEquals(run_proto, expected_run_proto)

    def test_no_budget_for_experiment_id(self):
        mock_client = _create_mock_client()
        event = event_pb2.Event(step=1, wall_time=123.456)
        event.summary.value.add(tag="foo", simple_value=1.0)
        run_to_events = {"run_name": [event]}
        long_experiment_id = "A" * uploader_lib._MAX_REQUEST_LENGTH_BYTES
        mock_client = _create_mock_client()
        with self.assertRaises(RuntimeError) as cm:
            builder = _create_request_sender(long_experiment_id, mock_client)
            builder.send_requests(run_to_events)
        self.assertEqual(
            str(cm.exception), "Byte budget too small for experiment ID"
        )

    def test_no_room_for_single_point(self):
        mock_client = _create_mock_client()
        event = event_pb2.Event(step=1, wall_time=123.456)
        event.summary.value.add(tag="foo", simple_value=1.0)
        long_run_name = "A" * uploader_lib._MAX_REQUEST_LENGTH_BYTES
        run_to_events = {long_run_name: [event]}
        with self.assertRaises(RuntimeError) as cm:
            builder = _create_request_sender("123", mock_client)
            builder.send_requests(run_to_events)
        self.assertEqual(str(cm.exception), "add_event failed despite flush")

    @mock.patch.object(uploader_lib, "_MAX_REQUEST_LENGTH_BYTES", 1024)
    def test_break_at_run_boundary(self):
        mock_client = _create_mock_client()
        # Choose run name sizes such that one run fits, but not two.
        long_run_1 = "A" * 768
        long_run_2 = "B" * 768
        event_1 = event_pb2.Event(step=1)
        event_1.summary.value.add(tag="foo", simple_value=1.0)
        event_2 = event_pb2.Event(step=2)
        event_2.summary.value.add(tag="bar", simple_value=-2.0)
        run_to_events = collections.OrderedDict(
            [(long_run_1, [event_1]), (long_run_2, [event_2])]
        )

        builder = _create_request_sender("123", mock_client)
        builder.send_requests(run_to_events)
        requests = [c[0][0] for c in mock_client.WriteScalar.call_args_list]

        for request in requests:
            _clear_wall_times(request)

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

    @mock.patch.object(uploader_lib, "_MAX_REQUEST_LENGTH_BYTES", 1024)
    def test_break_at_tag_boundary(self):
        mock_client = _create_mock_client()
        # Choose tag name sizes such that one tag fits, but not two. Note
        # that tag names appear in both `Tag.name` and the summary metadata.
        long_tag_1 = "a" * 384
        long_tag_2 = "b" * 384
        event = event_pb2.Event(step=1)
        event.summary.value.add(tag=long_tag_1, simple_value=1.0)
        event.summary.value.add(tag=long_tag_2, simple_value=2.0)
        run_to_events = {"train": [event]}

        builder = _create_request_sender("123", mock_client)
        builder.send_requests(run_to_events)
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

    @mock.patch.object(uploader_lib, "_MAX_REQUEST_LENGTH_BYTES", 1024)
    def test_break_at_scalar_point_boundary(self):
        mock_client = _create_mock_client()
        point_count = 2000  # comfortably saturates a single 1024-byte request
        events = []
        for step in range(point_count):
            summary = scalar_v2.scalar_pb("loss", -2.0 * step)
            if step > 0:
                summary.value[0].ClearField("metadata")
            events.append(event_pb2.Event(summary=summary, step=step))
        run_to_events = {"train": events}

        builder = _create_request_sender("123", mock_client)
        builder.send_requests(run_to_events)
        requests = [c[0][0] for c in mock_client.WriteScalar.call_args_list]
        for request in requests:
            _clear_wall_times(request)

        self.assertGreater(len(requests), 1)
        self.assertLess(len(requests), point_count)

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
            self.assertLessEqual(
                request.ByteSize(), uploader_lib._MAX_REQUEST_LENGTH_BYTES
            )
        self.assertEqual(total_points_in_result, point_count)

    def test_prunes_tags_and_runs(self):
        mock_client = _create_mock_client()
        event_1 = event_pb2.Event(step=1)
        event_1.summary.value.add(tag="foo", simple_value=1.0)
        event_2 = event_pb2.Event(step=2)
        event_2.summary.value.add(tag="bar", simple_value=-2.0)
        run_to_events = collections.OrderedDict(
            [("train", [event_1]), ("test", [event_2])]
        )

        real_create_point = (
            uploader_lib._ScalarBatchedRequestSender._create_point
        )

        create_point_call_count_box = [0]

        def mock_create_point(uploader_self, *args, **kwargs):
            # Simulate out-of-space error the first time that we try to store
            # the second point.
            create_point_call_count_box[0] += 1
            if create_point_call_count_box[0] == 2:
                raise uploader_lib._OutOfSpaceError()
            return real_create_point(uploader_self, *args, **kwargs)

        with mock.patch.object(
            uploader_lib._ScalarBatchedRequestSender,
            "_create_point",
            mock_create_point,
        ):
            builder = _create_request_sender("123", mock_client)
            builder.send_requests(run_to_events)
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
        # digits to incur error if converted to nanonseconds the naive way (* 1e9).
        event1 = event_pb2.Event(step=1, wall_time=1567808404.765432119)
        event1.summary.value.add(tag="foo", simple_value=1.0)
        # Test a wall time where as a float64, the fractional part on its own will
        # introduce error if truncated to 9 decimal places instead of rounded.
        event2 = event_pb2.Event(step=2, wall_time=1.000000002)
        event2.summary.value.add(tag="foo", simple_value=2.0)
        run_proto = write_service_pb2.WriteScalarRequest.Run()
        self._populate_run_from_events(run_proto, [event1, event2])
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


def _clear_wall_times(request):
    """Clears the wall_time fields in a WriteScalarRequest to be
    deterministic."""
    for run in request.runs:
        for tag in run.tags:
            for point in tag.points:
                point.ClearField("wall_time")


if __name__ == "__main__":
    tf.test.main()
