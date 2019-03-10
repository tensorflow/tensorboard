# -*- coding: utf-8 -*-
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
"""Tests for the Profile plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import os
import tensorflow as tf
from werkzeug import Request

from tensorboard.backend.event_processing import plugin_asset_util
from tensorboard.backend.event_processing import plugin_event_multiplexer as event_multiplexer  # pylint: disable=line-too-long
from tensorboard.plugins import base_plugin
from tensorboard.plugins.profile import profile_plugin
from tensorboard.plugins.profile import trace_events_pb2


tf.compat.v1.enable_eager_execution()


class FakeFlags(object):
  def __init__(
      self,
      logdir,
      master_tpu_unsecure_channel=''):
    self.logdir = logdir
    self.master_tpu_unsecure_channel = master_tpu_unsecure_channel


RUN_TO_TOOLS = {
    'foo': ['trace_viewer'],
    'bar': ['unsupported'],
    'baz': ['trace_viewer'],
    'empty': [],
}


RUN_TO_HOSTS = {
    'foo': ['host0', 'host1'],
    'bar': ['host1'],
    'baz': ['host2'],
    'empty': [],
}


EXPECTED_TRACE_DATA = dict(
    displayTimeUnit='ns',
    metadata={'highres-ticks': True},
    traceEvents=[
        dict(
            ph='M',
            pid=0,
            name='process_name',
            args=dict(name='foo')),
        dict(
            ph='M',
            pid=0,
            name='process_sort_index',
            args=dict(sort_index=0)),
        dict(),
    ],
)


# Suffix for the empty eventfile to write. Should be kept in sync with TF
# profiler kProfileEmptySuffix constant defined in:
#   tensorflow/core/profiler/rpc/client/capture_profile.cc.
EVENT_FILE_SUFFIX = '.profile-empty'


def generate_testdata(logdir):
  plugin_logdir = plugin_asset_util.PluginDirectory(
      logdir, profile_plugin.ProfilePlugin.plugin_name)
  os.makedirs(plugin_logdir)
  for run in RUN_TO_TOOLS:
    run_dir = os.path.join(plugin_logdir, run)
    os.mkdir(run_dir)
    for tool in RUN_TO_TOOLS[run]:
      if tool not in profile_plugin.TOOLS:
        continue
      for host in RUN_TO_HOSTS[run]:
        file_name = host + profile_plugin.TOOLS[tool]
        tool_file = os.path.join(run_dir, file_name)
        if tool == 'trace_viewer':
          trace = trace_events_pb2.Trace()
          trace.devices[0].name = run
          data = trace.SerializeToString()
        else:
          data = tool
        with open(tool_file, 'wb') as f:
          f.write(data)
  with open(os.path.join(plugin_logdir, 'noise'), 'w') as f:
    f.write('Not a dir, not a run.')


def write_empty_event_file(logdir):
  w = tf.compat.v2.summary.create_file_writer(
      logdir, filename_suffix=EVENT_FILE_SUFFIX)
  w.close()


class ProfilePluginTest(tf.test.TestCase):

  def setUp(self):
    self.logdir = self.get_temp_dir()
    self.multiplexer = event_multiplexer.EventMultiplexer()
    self.multiplexer.AddRunsFromDirectory(self.logdir)
    context = base_plugin.TBContext(
        logdir=self.logdir,
        multiplexer=self.multiplexer,
        flags=FakeFlags(self.logdir))
    self.plugin = profile_plugin.ProfilePlugin(context)
    self.apps = self.plugin.get_plugin_apps()

  def testRuns_logdirWithoutEventFile(self):
    generate_testdata(self.logdir)
    self.multiplexer.Reload()
    runs = dict(self.plugin.generate_run_to_tools())
    self.assertItemsEqual(runs.keys(), RUN_TO_TOOLS.keys())
    self.assertItemsEqual(runs['foo'], RUN_TO_TOOLS['foo'])
    self.assertItemsEqual(runs['bar'], [])
    self.assertItemsEqual(runs['empty'], [])

  def testRuns_logdirWithEventFIle(self):
    write_empty_event_file(self.logdir)
    generate_testdata(self.logdir)
    self.multiplexer.Reload()
    runs = dict(self.plugin.generate_run_to_tools())
    self.assertItemsEqual(runs.keys(), RUN_TO_TOOLS.keys())

  def testRuns_withSubdirectories(self):
    subdir_a = os.path.join(self.logdir, 'a')
    subdir_b = os.path.join(self.logdir, 'b')
    subdir_b_c = os.path.join(subdir_b, 'c')
    generate_testdata(self.logdir)
    generate_testdata(subdir_a)
    generate_testdata(subdir_b)
    generate_testdata(subdir_b_c)
    write_empty_event_file(self.logdir)
    write_empty_event_file(subdir_a)
    # Skip writing an event file for subdir_b
    write_empty_event_file(subdir_b_c)
    self.multiplexer.AddRunsFromDirectory(self.logdir)
    self.multiplexer.Reload()
    runs = dict(self.plugin.generate_run_to_tools())
    # Expect runs for the logdir root, 'a', and 'b/c' but not for 'b'
    # because it doesn't contain a tfevents file.
    expected = list(RUN_TO_TOOLS.keys())
    expected.extend('a/' + run for run in RUN_TO_TOOLS.keys())
    expected.extend('b/c/' + run for run in RUN_TO_TOOLS.keys())
    self.assertItemsEqual(runs.keys(), expected)

  def makeRequest(self, run, tag, host):
    req = Request({})
    req.args = {'run': run, 'tag': tag, 'host': host,}
    return req

  def testHosts(self):
    generate_testdata(self.logdir)
    subdir_a = os.path.join(self.logdir, 'a')
    generate_testdata(subdir_a)
    write_empty_event_file(subdir_a)
    self.multiplexer.AddRunsFromDirectory(self.logdir)
    self.multiplexer.Reload()
    hosts = self.plugin.host_impl('foo', 'trace_viewer')
    self.assertItemsEqual(['host0', 'host1'], sorted(hosts))
    hosts_a = self.plugin.host_impl('a/foo', 'trace_viewer')
    self.assertItemsEqual(['host0', 'host1'], sorted(hosts_a))

  def testData(self):
    generate_testdata(self.logdir)
    subdir_a = os.path.join(self.logdir, 'a')
    generate_testdata(subdir_a)
    write_empty_event_file(subdir_a)
    self.multiplexer.AddRunsFromDirectory(self.logdir)
    self.multiplexer.Reload()
    trace = json.loads(self.plugin.data_impl(
        self.makeRequest('foo', 'trace_viewer', 'host0')))
    self.assertEqual(trace, EXPECTED_TRACE_DATA)
    trace_a = json.loads(self.plugin.data_impl(
        self.makeRequest('a/foo', 'trace_viewer', 'host0')))
    self.assertEqual(trace_a, EXPECTED_TRACE_DATA)

    # Invalid tool/run.
    self.assertEqual(None, self.plugin.data_impl(
        self.makeRequest('foo', 'nonono', 'host0')))
    self.assertEqual(None, self.plugin.data_impl(
        self.makeRequest('foo', 'trace_viewer', '')))
    self.assertEqual(None, self.plugin.data_impl(
        self.makeRequest('bar', 'unsupported', 'host1')))
    self.assertEqual(None, self.plugin.data_impl(
        self.makeRequest('empty', 'trace_viewer', '')))
    self.assertEqual(None, self.plugin.data_impl(
        self.makeRequest('a', 'trace_viewer', '')))

  def testActive(self):
    def wait_for_thread():
      with self.plugin._is_active_lock:
        pass
    # Launch thread to check if active.
    self.plugin.is_active()
    wait_for_thread()
    # Should be false since there's no data yet.
    self.assertFalse(self.plugin.is_active())
    wait_for_thread()
    generate_testdata(self.logdir)
    self.multiplexer.Reload()
    # Launch a new thread to check if active.
    self.plugin.is_active()
    wait_for_thread()
    # Now that there's data, this should be active.
    self.assertTrue(self.plugin.is_active())

  def testActive_subdirectoryOnly(self):
    def wait_for_thread():
      with self.plugin._is_active_lock:
        pass
    # Launch thread to check if active.
    self.plugin.is_active()
    wait_for_thread()
    # Should be false since there's no data yet.
    self.assertFalse(self.plugin.is_active())
    wait_for_thread()
    subdir_a = os.path.join(self.logdir, 'a')
    generate_testdata(subdir_a)
    write_empty_event_file(subdir_a)
    self.multiplexer.AddRunsFromDirectory(self.logdir)
    self.multiplexer.Reload()
    # Launch a new thread to check if active.
    self.plugin.is_active()
    wait_for_thread()
    # Now that there's data, this should be active.
    self.assertTrue(self.plugin.is_active())


if __name__ == '__main__':
  tf.test.main()
