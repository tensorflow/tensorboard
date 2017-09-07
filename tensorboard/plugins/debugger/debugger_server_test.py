# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""Tests the debugger data server, which receives and writes debugger events."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json

import tensorflow as tf

# pylint: disable=ungrouped-imports, wrong-import-order
from google.protobuf import json_format
from tensorflow.core.debug import debugger_event_metadata_pb2

from tensorboard.plugins.debugger import constants
from tensorboard.plugins.debugger import debugger_server_lib
from tensorboard.plugins.debugger import numerics_alert
# pylint: enable=ungrouped-imports, wrong-import-order


class FakeEventsWriterManager(object):
  """An events writer manager that tracks events that would be written.

  During normal usage, the debugger data server would write events to disk.
  Unfortunately, this test cannot depend on TensorFlow's record reader due to
  GRPC library conflicts (b/35006065). Hence, we use a fake EventsWriter that
  keeps track of events that would be written to disk.
  """

  def __init__(self, events_output_list):
    """Constructs a fake events writer, which appends events to a list.

    Args:
      events_output_list: The list to append events that would be written to
        disk.
    """
    self.events_written = events_output_list

  def dispose(self):
    """Does nothing. This implementation creates no file."""

  def write_event(self, event):
    """Pretends to write an event to disk.

    Args:
      event: The event proto.
    """
    self.events_written.append(event)


class DebuggerDataServerTest(tf.test.TestCase):

  def setUp(self):
    self.events_written = []

    events_writer_manager = FakeEventsWriterManager(self.events_written)
    self.stream_handler = debugger_server_lib.DebuggerDataStreamHandler(
        events_writer_manager=events_writer_manager)
    self.stream_handler.on_core_metadata_event(tf.Event())

  def tearDown(self):
    tf.test.mock.patch.stopall()

  def _create_event_with_float_tensor(self, node_name, output_slot, debug_op,
                                      list_of_values):
    """Creates event with float64 (double) tensors.

    Args:
      node_name: The string name of the op. This lacks both the output slot as
        well as the name of the debug op.
      output_slot: The number that is the output slot.
      debug_op: The name of the debug op to use.
      list_of_values: A python list of values within the tensor.
    Returns:
      A `tf.Event` with a summary containing that node name and a float64
      tensor with those values.
    """
    event = tf.Event()
    value = event.summary.value.add(
        tag=node_name,
        node_name="%s:%d:%s" % (node_name, output_slot, debug_op),
        tensor=tf.make_tensor_proto(
            list_of_values, dtype=tf.float64, shape=[len(list_of_values)]))
    plugin_content = debugger_event_metadata_pb2.DebuggerEventMetadata(
        device="/job:localhost/replica:0/task:0/cpu:0", output_slot=output_slot)
    value.metadata.plugin_data.plugin_name = constants.DEBUGGER_PLUGIN_NAME
    value.metadata.plugin_data.content = tf.compat.as_bytes(
        json_format.MessageToJson(
            plugin_content, including_default_value_fields=True))
    return event

  def _verify_event_lists_have_same_tensor_values(self, expected, gotten):
    """Checks that two lists of events have the same tensor values.

    Args:
      expected: The expected list of events.
      gotten: The list of events we actually got.
    """
    self.assertEqual(len(expected), len(gotten))

    # Compare the events one at a time.
    for expected_event, gotten_event in zip(expected, gotten):
      self.assertEqual(expected_event.summary.value[0].node_name,
                       gotten_event.summary.value[0].node_name)
      self.assertAllClose(
          tf.make_ndarray(expected_event.summary.value[0].tensor),
          tf.make_ndarray(gotten_event.summary.value[0].tensor))
      self.assertEqual(expected_event.summary.value[0].tag,
                       gotten_event.summary.value[0].tag)

  def testOnValueEventWritesHealthPill(self):
    """Tests that the stream handler writes health pills in order."""
    # The debugger stream handler receives 2 health pill events.
    received_events = [
        self._create_event_with_float_tensor(
            "MatMul", 0, "DebugNumericSummary", list(range(1, 15))),
        self._create_event_with_float_tensor(
            "add", 0, "DebugNumericSummary", [x * x for x in range(1, 15)]),
        self._create_event_with_float_tensor(
            "MatMul", 0, "DebugNumericSummary", [x + 42 for x in range(1, 15)]),
    ]

    for event in received_events:
      self.stream_handler.on_value_event(event)

    # Verify that the stream handler wrote them to disk in order.
    self._verify_event_lists_have_same_tensor_values(received_events,
                                                     self.events_written)

  def testOnValueEventIgnoresIrrelevantOps(self):
    """Tests that non-DebugNumericSummary ops are ignored."""
    # Receive a DebugNumericSummary event.
    numeric_summary_event = self._create_event_with_float_tensor(
        "MatMul", 42, "DebugNumericSummary", list(range(1, 15)))
    self.stream_handler.on_value_event(numeric_summary_event)

    # Receive a non-DebugNumericSummary event.
    self.stream_handler.on_value_event(
        self._create_event_with_float_tensor("add", 0, "DebugIdentity",
                                             list(range(1, 15))))

    # The stream handler should have only written the DebugNumericSummary event
    # to disk.
    self._verify_event_lists_have_same_tensor_values([numeric_summary_event],
                                                     self.events_written)

  def testCorrectStepIsWritten(self):
    events_written = []
    metadata_event = tf.Event()
    metadata_event.log_message.message = json.dumps({"session_run_index": 42})
    stream_handler = debugger_server_lib.DebuggerDataStreamHandler(
        events_writer_manager=FakeEventsWriterManager(events_written))
    stream_handler.on_core_metadata_event(metadata_event)

    # The server receives 2 events. It should assign both the correct step.
    stream_handler.on_value_event(
        self._create_event_with_float_tensor("MatMul", 0, "DebugNumericSummary",
                                             list(range(1, 15))))
    stream_handler.on_value_event(
        self._create_event_with_float_tensor("Add", 0, "DebugNumericSummary",
                                             list(range(2, 16))))
    self.assertEqual(42, events_written[0].step)
    self.assertEqual(42, events_written[1].step)

  def testSentinelStepValueAssignedWhenExecutorStepCountKeyIsMissing(self):
    events_written = []
    metadata_event = tf.Event()
    metadata_event.log_message.message = json.dumps({})
    stream_handler = debugger_server_lib.DebuggerDataStreamHandler(
        events_writer_manager=FakeEventsWriterManager(events_written))
    stream_handler.on_core_metadata_event(metadata_event)
    health_pill_event = self._create_event_with_float_tensor(
        "MatMul", 0, "DebugNumericSummary", list(range(1, 15)))
    stream_handler.on_value_event(health_pill_event)
    self.assertGreater(events_written[0].step, 0)

  def testSentinelStepValueAssignedWhenMetadataJsonIsInvalid(self):
    events_written = []
    metadata_event = tf.Event()
    metadata_event.log_message.message = "some invalid JSON string"
    stream_handler = debugger_server_lib.DebuggerDataStreamHandler(
        events_writer_manager=FakeEventsWriterManager(events_written))
    stream_handler.on_core_metadata_event(metadata_event)
    health_pill_event = self._create_event_with_float_tensor(
        "MatMul", 0, "DebugNumericSummary", list(range(1, 15)))
    stream_handler.on_value_event(health_pill_event)
    self.assertGreater(events_written[0].step, 0)

  def testAlertingEventCallback(self):
    numerics_alert_callback = tf.test.mock.Mock()
    stream_handler = debugger_server_lib.DebuggerDataStreamHandler(
        events_writer_manager=FakeEventsWriterManager(
            self.events_written),
        numerics_alert_callback=numerics_alert_callback)
    stream_handler.on_core_metadata_event(tf.Event())

    # The stream handler receives 1 good event and 1 with an NaN value.
    stream_handler.on_value_event(
        self._create_event_with_float_tensor("Add", 0, "DebugNumericSummary",
                                             [0] * 14))
    stream_handler.on_value_event(
        self._create_event_with_float_tensor("Add", 0, "DebugNumericSummary", [
            0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ]))

    # The second event should have triggered the callback.
    numerics_alert_callback.assert_called_once_with(
        numerics_alert.NumericsAlert("/job:localhost/replica:0/task:0/cpu:0",
                                     "Add:0", 0, 1, 0, 0))

    # The stream handler receives an event with a -Inf value.
    numerics_alert_callback.reset_mock()
    stream_handler.on_value_event(
        self._create_event_with_float_tensor("Add", 0, "DebugNumericSummary", [
            0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ]))
    numerics_alert_callback.assert_called_once_with(
        numerics_alert.NumericsAlert("/job:localhost/replica:0/task:0/cpu:0",
                                     "Add:0", 0, 0, 1, 0))

    # The stream handler receives an event with a +Inf value.
    numerics_alert_callback.reset_mock()
    stream_handler.on_value_event(
        self._create_event_with_float_tensor("Add", 0, "DebugNumericSummary", [
            0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0
        ]))
    numerics_alert_callback.assert_called_once_with(
        numerics_alert.NumericsAlert("/job:localhost/replica:0/task:0/cpu:0",
                                     "Add:0", 0, 0, 0, 1))

    # The stream handler receives an event without any pathetic values.
    numerics_alert_callback.reset_mock()
    stream_handler.on_value_event(
        self._create_event_with_float_tensor("Add", 0, "DebugNumericSummary", [
            0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0
        ]))
    # assert_not_called is not available in Python 3.4.
    self.assertFalse(numerics_alert_callback.called)


if __name__ == "__main__":
  tf.test.main()
