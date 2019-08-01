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

"""The TensorBoard plugin for performance profiling."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os
import threading

import six
import tensorflow as tf
from werkzeug import wrappers

from tensorflow.python.eager import profiler_client
from tensorboard.backend import http_util
from tensorboard.backend.event_processing import plugin_asset_util
from tensorboard.plugins import base_plugin
from tensorboard.plugins.profile import trace_events_json
from tensorboard.plugins.profile import trace_events_pb2
from tensorboard.util import tb_logging

logger = tb_logging.get_logger()

# The prefix of routes provided by this plugin.
PLUGIN_NAME = 'profile'

# HTTP routes
DATA_ROUTE = '/data'
TOOLS_ROUTE = '/tools'
HOSTS_ROUTE = '/hosts'
CAPTURE_ROUTE = '/capture_profile'

# Available profiling tools -> file name of the tool data.
_FILE_NAME = 'TOOL_FILE_NAME'
TOOLS = {
    'trace_viewer': 'trace',
    'trace_viewer@': 'tracetable',  #streaming traceviewer
    'op_profile': 'op_profile.json',
    'input_pipeline_analyzer': 'input_pipeline.json',
    'overview_page': 'overview_page.json',
    'memory_viewer': 'memory_viewer.json',
    'pod_viewer': 'pod_viewer.json',
    'google_chart_demo': 'google_chart_demo.json',
}

# Tools that consume raw data.
_RAW_DATA_TOOLS = frozenset(['input_pipeline_analyzer',
                             'op_profile',
                             'overview_page',
                             'memory_viewer',
                             'pod_viewer',
                             'google_chart_demo',])

def process_raw_trace(raw_trace):
  """Processes raw trace data and returns the UI data."""
  trace = trace_events_pb2.Trace()
  trace.ParseFromString(raw_trace)
  return ''.join(trace_events_json.TraceEventsJsonStream(trace))

def get_worker_list(cluster_resolver):
  """Parses TPU workers list from the cluster resolver."""
  cluster_spec = cluster_resolver.cluster_spec()
  task_indices = cluster_spec.task_indices('worker')
  worker_list = [
      cluster_spec.task_address('worker', i).split(':')[0] for i in task_indices
  ]
  return ','.join(worker_list)

class ProfilePlugin(base_plugin.TBPlugin):
  """Profile Plugin for TensorBoard."""

  plugin_name = PLUGIN_NAME

  def __init__(self, context):
    """Constructs a profiler plugin for TensorBoard.

    This plugin adds handlers for performance-related frontends.

    Args:
      context: A base_plugin.TBContext instance.
    """
    self.logdir = context.logdir
    self.multiplexer = context.multiplexer
    self.plugin_logdir = plugin_asset_util.PluginDirectory(
        self.logdir, PLUGIN_NAME)
    self.stub = None
    self.master_tpu_unsecure_channel = context.flags.master_tpu_unsecure_channel

    # Whether the plugin is active. This is an expensive computation, so we
    # compute this asynchronously and cache positive results indefinitely.
    self._is_active = False
    # Lock to ensure at most one thread computes _is_active at a time.
    self._is_active_lock = threading.Lock()

  def is_active(self):
    """Whether this plugin is active and has any profile data to show.

    Detecting profile data is expensive, so this process runs asynchronously
    and the value reported by this method is the cached value and may be stale.

    Returns:
      Whether any run has profile data.
    """
    # If we are already active, we remain active and don't recompute this.
    # Otherwise, try to acquire the lock without blocking; if we get it and
    # we're still not active, launch a thread to check if we're active and
    # release the lock once the computation is finished. Either way, this
    # thread returns the current cached value to avoid blocking.
    if not self._is_active and self._is_active_lock.acquire(False):
      if self._is_active:
        self._is_active_lock.release()
      else:
        def compute_is_active():
          self._is_active = any(self.generate_run_to_tools())
          self._is_active_lock.release()
        new_thread = threading.Thread(
            target=compute_is_active,
            name='ProfilePluginIsActiveThread')
        new_thread.start()
    return self._is_active

  def frontend_metadata(self):
    # TODO(#2338): Keep this in sync with the `registerDashboard` call
    # on the frontend until that call is removed.
    return super(ProfilePlugin, self).frontend_metadata()._replace(
        element_name='tf-profile-dashboard',
        disable_reload=True,
    )

  def start_grpc_stub_if_necessary(self):
    # We will enable streaming trace viewer on two conditions:
    # 1. user specify the flags master_tpu_unsecure_channel to the ip address of
    #    as "master" TPU. grpc will be used to fetch streaming trace data.
    # 2. the logdir is on google cloud storage.
    if self.master_tpu_unsecure_channel and self.logdir.startswith('gs://'):
      if self.stub is None:
        import grpc
        from tensorflow.python.tpu.profiler import profiler_analysis_pb2_grpc # pylint: disable=line-too-long
        # Workaround the grpc's 4MB message limitation.
        gigabyte = 1024 * 1024 * 1024
        options = [('grpc.max_message_length', gigabyte),
                   ('grpc.max_send_message_length', gigabyte),
                   ('grpc.max_receive_message_length', gigabyte)]
        tpu_profiler_port = self.master_tpu_unsecure_channel + ':8466'
        channel = grpc.insecure_channel(tpu_profiler_port, options)
        self.stub = profiler_analysis_pb2_grpc.ProfileAnalysisStub(channel)

  def _run_dir(self, run):
    """Helper that maps a frontend run name to a profile "run" directory.

    The frontend run name consists of the TensorBoard run name (aka the relative
    path from the logdir root to the directory containing the data) path-joined
    to the Profile plugin's "run" concept (which is a subdirectory of the
    plugins/profile directory representing an individual run of the tool), with
    the special case that TensorBoard run is the logdir root (which is the run
    named '.') then only the Profile plugin "run" name is used, for backwards
    compatibility.

    To convert back to the actual run directory, we apply the following
    transformation:
    - If the run name doesn't contain '/', prepend './'
    - Split on the rightmost instance of '/'
    - Assume the left side is a TensorBoard run name and map it to a directory
      path using EventMultiplexer.RunPaths(), then map that to the profile
      plugin directory via PluginDirectory()
    - Assume the right side is a Profile plugin "run" and path-join it to
      the preceding path to get the final directory

    Args:
      run: the frontend run name, as described above, e.g. train/run1.

    Returns:
      The resolved directory path, e.g. /logdir/train/plugins/profile/run1.
    """
    run = run.rstrip('/')
    if '/' not in run:
      run = './' + run
    tb_run_name, _, profile_run_name = run.rpartition('/')
    tb_run_directory = self.multiplexer.RunPaths().get(tb_run_name)
    if tb_run_directory is None:
      # Check if logdir is a directory to handle case where it's actually a
      # multipart directory spec, which this plugin does not support.
      if tb_run_name == '.' and tf.io.gfile.isdir(self.logdir):
        tb_run_directory = self.logdir
      else:
        raise RuntimeError("No matching run directory for run %s" % run)
    plugin_directory = plugin_asset_util.PluginDirectory(
        tb_run_directory, PLUGIN_NAME)
    return os.path.join(plugin_directory, profile_run_name)

  def generate_run_to_tools(self):
    """Generator for pairs of "run name" and a list of tools for that run.

    The "run name" here is a "frontend run name" - see _run_dir() for the
    definition of a "frontend run name" and how it maps to a directory of
    profile data for a specific profile "run". The profile plugin concept of
    "run" is different from the normal TensorBoard run; each run in this case
    represents a single instance of profile data collection, more similar to a
    "step" of data in typical TensorBoard semantics. These runs reside in
    subdirectories of the plugins/profile directory within any regular
    TensorBoard run directory (defined as a subdirectory of the logdir that
    contains at least one tfevents file) or within the logdir root directory
    itself (even if it contains no tfevents file and would thus not be
    considered a normal TensorBoard run, for backwards compatibility).

    Within those "profile run directories", there are files in the directory
    that correspond to different profiling tools. The file that contains profile
    for a specific tool "x" will have a suffix name TOOLS["x"].

    Example:
      logs/
        plugins/
          profile/
            run1/
              hostA.trace
        train/
          events.out.tfevents.foo
          plugins/
            profile/
              run1/
                hostA.trace
                hostB.trace
              run2/
                hostA.trace
        validation/
          events.out.tfevents.foo
          plugins/
            profile/
              run1/
                hostA.trace

    Yields:
      A sequence of tuples mapping "frontend run names" to lists of tool names
      available for those runs. For the above example, this would be:

          ("run1", ["trace_viewer"])
          ("train/run1", ["trace_viewer"])
          ("train/run2", ["trace_viewer"])
          ("validation/run1", ["trace_viewer"])
    """
    self.start_grpc_stub_if_necessary()

    plugin_assets = self.multiplexer.PluginAssets(PLUGIN_NAME)
    tb_run_names_to_dirs = self.multiplexer.RunPaths()

    # Ensure that we also check the root logdir, even if it isn't a recognized
    # TensorBoard run (i.e. has no tfevents file directly under it), to remain
    # backwards compatible with previously profile plugin behavior. Note that we
    # check if logdir is a directory to handle case where it's actually a
    # multipart directory spec, which this plugin does not support.
    if '.' not in plugin_assets and tf.io.gfile.isdir(self.logdir):
      tb_run_names_to_dirs['.'] = self.logdir
      plugin_assets['.'] = plugin_asset_util.ListAssets(
          self.logdir, PLUGIN_NAME)

    for tb_run_name, profile_runs in six.iteritems(plugin_assets):
      tb_run_dir = tb_run_names_to_dirs[tb_run_name]
      tb_plugin_dir = plugin_asset_util.PluginDirectory(
          tb_run_dir, PLUGIN_NAME)
      for profile_run in profile_runs:
        # Remove trailing slash; some filesystem implementations emit this.
        profile_run = profile_run.rstrip('/')
        if tb_run_name == '.':
          frontend_run = profile_run
        else:
          frontend_run = '/'.join([tb_run_name, profile_run])
        profile_run_dir = os.path.join(tb_plugin_dir, profile_run)
        if tf.io.gfile.isdir(profile_run_dir):
          yield frontend_run, self._get_active_tools(profile_run_dir)

  def _get_active_tools(self, profile_run_dir):
    tools = []
    for tool in TOOLS:
      tool_pattern = '*' + TOOLS[tool]
      path = os.path.join(profile_run_dir, tool_pattern)
      try:
        files = tf.io.gfile.glob(path)
        if len(files) >= 1:
          tools.append(tool)
      except tf.errors.OpError as e:
        logger.warn("Cannot read asset directory: %s, OpError %s",
                    profile_run_dir, e)
    if 'trace_viewer@' in tools:
      # streaming trace viewer always override normal trace viewer.
      # the trailing '@' is to inform tf-profile-dashboard.html and
      # tf-trace-viewer.html that stream trace viewer should be used.
      removed_tool = 'trace_viewer@' if self.stub is None else 'trace_viewer'
      if removed_tool in tools:
        tools.remove(removed_tool)
    tools.sort()
    op = 'overview_page'
    if op in tools:
      # keep overview page at the top of the list
      tools.remove(op)
      tools.insert(0, op)
    return tools

  @wrappers.Request.application
  def tools_route(self, request):
    run_to_tools = dict(self.generate_run_to_tools())
    return http_util.Respond(request, run_to_tools, 'application/json')

  def host_impl(self, run, tool):
    """Returns available hosts for the run and tool in the log directory.

    In the plugin log directory, each directory contains profile data for a
    single run (identified by the directory name), and files in the run
    directory contains data for different tools and hosts. The file that
    contains profile for a specific tool "x" will have a prefix name TOOLS["x"].

    Example:
      log/
        run1/
          plugins/
            profile/
              host1.trace
              host2.trace
        run2/
          plugins/
            profile/
              host1.trace
              host2.trace

    Returns:
      A list of host names e.g.
        {"host1", "host2", "host3"} for the example.
    """
    hosts = {}
    run_dir = self._run_dir(run)
    if not run_dir:
      logger.warn("Cannot find asset directory for: %s", run)
      return hosts
    tool_pattern = '*' + TOOLS[tool]
    try:
      files = tf.io.gfile.glob(os.path.join(run_dir, tool_pattern))
      hosts = [os.path.basename(f).replace(TOOLS[tool], '') for f in files]
    except tf.errors.OpError as e:
      logger.warn("Cannot read asset directory: %s, OpError %s",
                      run_dir, e)
    return hosts


  @wrappers.Request.application
  def hosts_route(self, request):
    run = request.args.get('run')
    tool = request.args.get('tag')
    hosts = self.host_impl(run, tool)
    return http_util.Respond(request, hosts, 'application/json')

  def data_impl(self, request):
    """Retrieves and processes the tool data for a run and a host.

    Args:
      request: XMLHttpRequest

    Returns:
      A string that can be served to the frontend tool or None if tool,
        run or host is invalid.
    """
    run = request.args.get('run')
    tool = request.args.get('tag')
    host = request.args.get('host')
    run_dir = self._run_dir(run)
    # Profile plugin "run" is the last component of run dir.
    profile_run = os.path.basename(run_dir)

    if tool not in TOOLS:
      return None

    self.start_grpc_stub_if_necessary()
    if tool == 'trace_viewer@' and self.stub is not None:
      from tensorflow.core.profiler import profiler_analysis_pb2
      grpc_request = profiler_analysis_pb2.ProfileSessionDataRequest()
      grpc_request.repository_root = os.path.dirname(run_dir)
      grpc_request.session_id = profile_run
      grpc_request.tool_name = 'trace_viewer'
      # Remove the trailing dot if present
      grpc_request.host_name = host.rstrip('.')

      grpc_request.parameters['resolution'] = request.args.get('resolution')
      if request.args.get('start_time_ms') is not None:
        grpc_request.parameters['start_time_ms'] = request.args.get(
            'start_time_ms')
      if request.args.get('end_time_ms') is not None:
        grpc_request.parameters['end_time_ms'] = request.args.get('end_time_ms')
      grpc_response = self.stub.GetSessionToolData(grpc_request)
      return grpc_response.output

    if tool not in TOOLS:
      return None
    tool_name = str(host) + TOOLS[tool]
    asset_path = os.path.join(run_dir, tool_name)
    raw_data = None
    try:
      with tf.io.gfile.GFile(asset_path, 'rb') as f:
        raw_data = f.read()
    except tf.errors.NotFoundError:
      logger.warn('Asset path %s not found', asset_path)
    except tf.errors.OpError as e:
      logger.warn("Couldn't read asset path: %s, OpError %s", asset_path, e)

    if raw_data is None:
      return None
    if tool == 'trace_viewer':
      return process_raw_trace(raw_data)
    if tool in _RAW_DATA_TOOLS:
      return raw_data
    return None

  @wrappers.Request.application
  def data_route(self, request):
    # params
    #   request: XMLHTTPRequest.
    data = self.data_impl(request)
    if data is None:
      return http_util.Respond(request, '404 Not Found', 'text/plain', code=404)
    return http_util.Respond(request, data, 'application/json')

  @wrappers.Request.application
  def capture_route(self, request):
    service_addr = request.args.get('service_addr')
    duration = int(request.args.get('duration', '1000'))
    is_tpu_name = request.args.get('is_tpu_name') == 'true'
    worker_list = request.args.get('worker_list')
    include_dataset_ops = request.args.get('include_dataset_ops') == 'true'
    num_tracing_attempts = int(request.args.get('num_retry', '0')) + 1

    if is_tpu_name:
      try:
        tpu_cluster_resolver = (
            tf.distribute.cluster_resolver.TPUClusterResolver(service_addr))
        master_grpc_addr = tpu_cluster_resolver.get_master()
      except (ImportError, RuntimeError) as err:
        return http_util.Respond(request, {'error': err.message},
                                 'application/json', code=200)
      except (ValueError, TypeError):
        return http_util.Respond(request,
            {'error': 'no TPUs with the specified names exist.'},
             'application/json', code=200)
      if not worker_list:
        worker_list = get_worker_list(tpu_cluster_resolver)
      # TPU cluster resolver always returns port 8470. Replace it with 8466
      # on which profiler service is running.
      master_ip = master_grpc_addr.replace('grpc://', '').replace(':8470', '')
      service_addr = master_ip + ':8466'
      # Set the master TPU for streaming trace viewer.
      self.master_tpu_unsecure_channel = master_ip
    try:
      profiler_client.start_tracing(service_addr, self.logdir, duration,
          worker_list, include_dataset_ops, num_tracing_attempts)
      return http_util.Respond(
          request, {'result': 'Capture profile successfully. Please refresh.'},
          'application/json')
    except tf.errors.UnavailableError:
      return http_util.Respond(request, {'error': 'empty trace result.'},
                                         'application/json', code=200)

  def get_plugin_apps(self):
    return {
        TOOLS_ROUTE: self.tools_route,
        HOSTS_ROUTE: self.hosts_route,
        DATA_ROUTE: self.data_route,
        CAPTURE_ROUTE: self.capture_route,
    }
