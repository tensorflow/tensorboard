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
from tensorboard.plugins import base_plugin
from tensorboard.plugins.profile import profile_plugin
from tensorboard.plugins.profile import trace_events_pb2


class FakeFlags(object):
  def __init__(
      self,
      logdir,
      master_tpu_unsecure_channel=''):
    self.logdir = logdir
    self.master_tpu_unsecure_channel = master_tpu_unsecure_channel


class ProfilePluginTest(tf.test.TestCase):

  def setUp(self):
    # Populate the log directory with runs and traces.
    self.logdir = self.get_temp_dir()
    plugin_logdir = plugin_asset_util.PluginDirectory(
        self.logdir, profile_plugin.ProfilePlugin.plugin_name)
    os.makedirs(plugin_logdir)
    self.run_to_tools = {
        'foo': ['trace_viewer'],
        'bar': ['unsupported'],
        'baz': ['trace_viewer'],
        'empty': [],
    }
    self.run_to_hosts = {
        'foo': ['host0', 'host1'],
        'bar': ['host1'],
        'baz': ['host2'],
        'empty': [],
    }
    for run in self.run_to_tools:
      run_dir = os.path.join(plugin_logdir, run)
      os.mkdir(run_dir)
      for tool in self.run_to_tools[run]:
        if tool not in profile_plugin.TOOLS:
          continue
        for host in self.run_to_hosts[run]:
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

    # The profiler plugin does not use the multiplexer, so we do not bother to
    # construct a meaningful one right now. In fact, the profiler plugin does
    # not use this context object in general. Its constructor has to accept it
    # though, and it may use the context in the future.
    context = base_plugin.TBContext(
        logdir=self.logdir,
        multiplexer=None,
        flags=FakeFlags(self.logdir))
    self.plugin = profile_plugin.ProfilePlugin(context)
    self.apps = self.plugin.get_plugin_apps()

  def testRuns(self):
    runs = self.plugin.index_impl()
    self.assertItemsEqual(runs.keys(), self.run_to_tools.keys())
    self.assertItemsEqual(runs['foo'], self.run_to_tools['foo'])
    self.assertItemsEqual(runs['bar'], [])
    self.assertItemsEqual(runs['empty'], [])

  def makeRequest(self, run, tag, host):
    req = Request({})
    req.args = {'run': run, 'tag': tag, 'host': host,}
    return req

  def testHosts(self):
    hosts = self.plugin.host_impl('foo', 'trace_viewer')
    self.assertItemsEqual(['host0', 'host1'], sorted(hosts))

  def testData(self):
    trace = json.loads(self.plugin.data_impl(
        self.makeRequest('foo', 'trace_viewer', 'host0')))
    self.assertEqual(trace,
                     dict(
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
                                 args=dict(sort_index=0)), {}
                         ]))

    # Invalid tool/run.
    self.assertEqual(None, self.plugin.data_impl(
        self.makeRequest('foo', 'nonono', 'host0')))
    self.assertEqual(None, self.plugin.data_impl(
        self.makeRequest('foo', 'trace_viewer', '')))
    self.assertEqual(None, self.plugin.data_impl(
        self.makeRequest('bar', 'unsupported', 'host1')))
    self.assertEqual(None, self.plugin.data_impl(
        self.makeRequest('empty', 'trace_viewer', '')))

  def testActive(self):
    self.assertTrue(self.plugin.is_active())


if __name__ == '__main__':
  tf.test.main()
