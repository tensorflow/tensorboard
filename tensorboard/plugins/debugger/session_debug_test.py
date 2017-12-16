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
"""Tests end-to-end debugger data server behavior by starting TensorBoard.

This test launches an instance of TensorBoard as a subprocess. In turn,
TensorBoard (specifically its debugger plugin) starts a debugger data server.
The test then calls Session.run() using RunOptions pointing to the grpc:// debug
URL of the debugger data server. It then checks the correctness of the Event
proto file created by the debugger data server.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import functools
import glob
import os
import shutil
import tempfile
import threading
import time

import numpy as np
import portpicker  # pylint: disable=import-error
import tensorflow as tf  # pylint: disable=wrong-import-order
from tensorflow.python import debug as tf_debug  # pylint: disable=wrong-import-order

from tensorboard.plugins.debugger import constants
from tensorboard.plugins.debugger import debugger_server_lib


class SessionDebugTestBase(tf.test.TestCase):

  def setUp(self):
    self._debugger_data_server_grpc_port = portpicker.pick_unused_port()
    self._debug_url = (
        "grpc://localhost:%d" % self._debugger_data_server_grpc_port)
    self._logdir = tempfile.mkdtemp(prefix="tensorboard_dds_")

    self._debug_data_server = debugger_server_lib.DebuggerDataServer(
        self._debugger_data_server_grpc_port, self._logdir, always_flush=True)
    self._server_thread = threading.Thread(
        target=self._debug_data_server.start_the_debugger_data_receiving_server)
    self._server_thread.start()

    self.assertTrue(self._poll_server_till_success(50, 0.2))

  def tearDown(self):
    self._debug_data_server.stop_server()
    self._server_thread.join()

    if os.path.isdir(self._logdir):
      shutil.rmtree(self._logdir)

    tf.reset_default_graph()

  def _poll_server_till_success(self, max_tries, poll_interval_seconds):
    for _ in range(max_tries):
      try:
        with tf.Session() as sess:
          a_init_val = np.array([42.0])
          a_init = tf.constant(a_init_val, shape=[1], name="a_init")
          a = tf.Variable(a_init, name="a")

          run_options = tf.RunOptions(output_partition_graphs=True)
          tf_debug.watch_graph(run_options,
                               sess.graph,
                               debug_ops=["DebugNumericSummary"],
                               debug_urls=[self._debug_url])

          sess.run(a.initializer, options=run_options)
          return True
      except tf.errors.FailedPreconditionError:
        time.sleep(poll_interval_seconds)

    return False

  def _compute_health_pill(self, x):
    x_clean = x[np.where(
        np.logical_and(
            np.logical_not(np.isnan(x)), np.logical_not(np.isinf(x))))]
    if np.size(x_clean):
      x_min = np.min(x_clean)
      x_max = np.max(x_clean)
      x_mean = np.mean(x_clean)
      x_var = np.var(x_clean)
    else:
      x_min = np.inf
      x_max = -np.inf
      x_mean = np.nan
      x_var = np.nan

    return np.array([
        1.0,  # Assume is initialized.
        np.size(x),
        np.sum(np.isnan(x)),
        np.sum(x == -np.inf),
        np.sum(np.logical_and(x < 0.0, x != -np.inf)),
        np.sum(x == 0.0),
        np.sum(np.logical_and(x > 0.0, x != np.inf)),
        np.sum(x == np.inf),
        x_min,
        x_max,
        x_mean,
        x_var,
        float(tf.as_dtype(x.dtype).as_datatype_enum),
        float(len(x.shape)),
    ] + list(x.shape))

  def _check_health_pills_in_events_file(self,
                                         events_file_path,
                                         debug_key_to_tensors):
    reader = tf.python_io.tf_record_iterator(events_file_path)
    event_read = tf.Event()

    # The first event in the file should contain the events version, which is
    # important because without it, TensorBoard may purge health pill events.
    event_read.ParseFromString(next(reader))
    self.assertEqual("brain.Event:2", event_read.file_version)

    health_pills = {}
    while True:
      next_event = next(reader, None)
      if not next_event:
        break
      event_read.ParseFromString(next_event)
      values = event_read.summary.value
      if values:
        if (values[0].metadata.plugin_data.plugin_name ==
            constants.DEBUGGER_PLUGIN_NAME):
          debug_key = values[0].node_name
          if debug_key not in health_pills:
            health_pills[debug_key] = [
                tf_debug.load_tensor_from_event(event_read)]
          else:
            health_pills[debug_key].append(
                tf_debug.load_tensor_from_event(event_read))

    for debug_key in debug_key_to_tensors:
      tensors = debug_key_to_tensors[debug_key]
      for i, tensor in enumerate(tensors):
        self.assertAllClose(
            self._compute_health_pill(tensor),
            health_pills[debug_key][i])

  def testRunSimpleNetworkoWithInfAndNaNWorks(self):
    with tf.Session() as sess:
      x_init_val = np.array([[2.0], [-1.0]])
      y_init_val = np.array([[0.0], [-0.25]])
      z_init_val = np.array([[0.0, 3.0], [-1.0, 0.0]])

      x_init = tf.constant(x_init_val, shape=[2, 1], name="x_init")
      x = tf.Variable(x_init, name="x")
      y_init = tf.constant(y_init_val, shape=[2, 1])
      y = tf.Variable(y_init, name="y")
      z_init = tf.constant(z_init_val, shape=[2, 2])
      z = tf.Variable(z_init, name="z")

      u = tf.div(x, y, name="u")  # Produces an Inf.
      v = tf.matmul(z, u, name="v")  # Produces NaN and Inf.

      sess.run(x.initializer)
      sess.run(y.initializer)
      sess.run(z.initializer)

      run_options = tf.RunOptions(output_partition_graphs=True)
      tf_debug.watch_graph(run_options,
                           sess.graph,
                           debug_ops=["DebugNumericSummary"],
                           debug_urls=[self._debug_url])

      result = sess.run(v, options=run_options)
      self.assertTrue(np.isnan(result[0, 0]))
      self.assertEqual(-np.inf, result[1, 0])

    # Debugger data is stored within a special directory within logdir.
    event_files = glob.glob(
        os.path.join(self._logdir, constants.DEBUGGER_DATA_DIRECTORY_NAME,
                     "events.debugger*"))
    self.assertEqual(1, len(event_files))

    self._check_health_pills_in_events_file(event_files[0], {
        "x:0:DebugNumericSummary": [x_init_val],
        "y:0:DebugNumericSummary": [y_init_val],
        "z:0:DebugNumericSummary": [z_init_val],
        "u:0:DebugNumericSummary": [x_init_val / y_init_val],
        "v:0:DebugNumericSummary": [
            np.matmul(z_init_val, x_init_val / y_init_val)
        ],
    })

    report = self._debug_data_server.numerics_alert_report()
    self.assertEqual(2, len(report))
    self.assertTrue(report[0].device_name.lower().endswith("cpu:0"))
    self.assertEqual("u:0", report[0].tensor_name)
    self.assertGreater(report[0].first_timestamp, 0)
    self.assertEqual(0, report[0].nan_event_count)
    self.assertEqual(0, report[0].neg_inf_event_count)
    self.assertEqual(1, report[0].pos_inf_event_count)
    self.assertTrue(report[1].device_name.lower().endswith("cpu:0"))
    self.assertEqual("u:0", report[0].tensor_name)
    self.assertGreaterEqual(report[1].first_timestamp,
                            report[0].first_timestamp)
    self.assertEqual(1, report[1].nan_event_count)
    self.assertEqual(1, report[1].neg_inf_event_count)
    self.assertEqual(0, report[1].pos_inf_event_count)

  def testMultipleInt32ValuesOverMultipleRunsAreRecorded(self):
    with tf.Session() as sess:
      x_init_val = np.array([10], dtype=np.int32)
      x_init = tf.constant(x_init_val, shape=[1], name="x_init")
      x = tf.Variable(x_init, name="x")

      x_inc_val = np.array([2], dtype=np.int32)
      x_inc = tf.constant(x_inc_val, name="x_inc")
      inc_x = tf.assign_add(x, x_inc, name="inc_x")

      sess.run(x.initializer)

      run_options = tf.RunOptions(output_partition_graphs=True)
      tf_debug.watch_graph(run_options,
                           sess.graph,
                           debug_ops=["DebugNumericSummary"],
                           debug_urls=[self._debug_url])

      # Increase three times.
      for _ in range(3):
        sess.run(inc_x, options=run_options)

    # Debugger data is stored within a special directory within logdir.
    event_files = glob.glob(
        os.path.join(self._logdir, constants.DEBUGGER_DATA_DIRECTORY_NAME,
                     "events.debugger*"))
    self.assertEqual(1, len(event_files))

    self._check_health_pills_in_events_file(
        event_files[0],
        {
            "x_inc:0:DebugNumericSummary": [x_inc_val] * 3,
            "x:0:DebugNumericSummary": [
                x_init_val,
                x_init_val + x_inc_val,
                x_init_val + 2 * x_inc_val],
        })

  def testConcurrentNumericsAlertsAreRegisteredCorrectly(self):
    num_threads = 3
    num_runs_per_thread = 2
    total_num_runs = num_threads * num_runs_per_thread

    # Before any Session runs, the report ought to be empty.
    self.assertEqual([], self._debug_data_server.numerics_alert_report())

    with tf.Session() as sess:
      x_init_val = np.array([[2.0], [-1.0]])
      y_init_val = np.array([[0.0], [-0.25]])
      z_init_val = np.array([[0.0, 3.0], [-1.0, 0.0]])

      x_init = tf.constant(x_init_val, shape=[2, 1], name="x_init")
      x = tf.Variable(x_init, name="x")
      y_init = tf.constant(y_init_val, shape=[2, 1])
      y = tf.Variable(y_init, name="y")
      z_init = tf.constant(z_init_val, shape=[2, 2])
      z = tf.Variable(z_init, name="z")

      u = tf.div(x, y, name="u")  # Produces an Inf.
      v = tf.matmul(z, u, name="v")  # Produces NaN and Inf.

      sess.run(x.initializer)
      sess.run(y.initializer)
      sess.run(z.initializer)

      run_options_list = []
      for i in range(num_threads):
        run_options = tf.RunOptions(output_partition_graphs=True)
        # Use different grpc:// URL paths so that each thread opens a separate
        # gRPC stream to the debug data server, simulating multi-worker setting.
        tf_debug.watch_graph(run_options,
                             sess.graph,
                             debug_ops=["DebugNumericSummary"],
                             debug_urls=[self._debug_url + "/thread%d" % i])
        run_options_list.append(run_options)

      def run_v(thread_id):
        for _ in range(num_runs_per_thread):
          sess.run(v, options=run_options_list[thread_id])

      run_threads = []
      for thread_id in range(num_threads):
        thread = threading.Thread(target=functools.partial(run_v, thread_id))
        thread.start()
        run_threads.append(thread)

      for thread in run_threads:
        thread.join()

    report = self._debug_data_server.numerics_alert_report()
    self.assertEqual(2, len(report))
    self.assertTrue(report[0].device_name.lower().endswith("cpu:0"))
    self.assertEqual("u:0", report[0].tensor_name)
    self.assertGreater(report[0].first_timestamp, 0)
    self.assertEqual(0, report[0].nan_event_count)
    self.assertEqual(0, report[0].neg_inf_event_count)
    self.assertEqual(total_num_runs, report[0].pos_inf_event_count)
    self.assertTrue(report[1].device_name.lower().endswith("cpu:0"))
    self.assertEqual("u:0", report[0].tensor_name)
    self.assertGreaterEqual(report[1].first_timestamp,
                            report[0].first_timestamp)
    self.assertEqual(total_num_runs, report[1].nan_event_count)
    self.assertEqual(total_num_runs, report[1].neg_inf_event_count)
    self.assertEqual(0, report[1].pos_inf_event_count)


if __name__ == "__main__":
  tf.test.main()
