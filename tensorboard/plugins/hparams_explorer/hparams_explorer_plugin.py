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
"""The TensorBoard Scalars plugin.

See `http_api.md` in this directory for specifications of the routes for this
plugin.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import csv

import six
from six import StringIO
from werkzeug import wrappers

import tensorflow as tf
from tensorboard import plugin_util
from tensorboard.backend import http_util
from tensorboard.plugins import base_plugin
from tensorboard.plugins.hparams_explorer import plugin_metadata
from tensorboard.plugins.hparams_explorer import metadata_pb2
from tensorboard.plugins.hparams_explorer import metadata_utils


class HParamsExplorerError(Exception):
  """Class to store erros raised by the HParamsExplorer.
  all errors raised during the handling of a request must be catched and
  logged by the corresponding route handler.
  """
  pass


class HParamsExplorerPlugin(base_plugin.TBPlugin):
  """Scalars Plugin for TensorBoard."""

  plugin_name = plugin_metadata.PLUGIN_NAME

  def __init__(self, context):
    """Instantiates HParamsExplorer plugin via TensorBoard core.

    Args:
      context: A base_plugin.TBContext instance.
    """
    self._multiplexer = context.multiplexer

  def get_plugin_apps(self):
    return {
        '/hparam_infos': self.hparam_infos_route,
    }

  def is_active(self):
    """The hparams explorer plugin is active iff there is a tag with
    the hparams explorer plugin name as its plugin name."""
    if not self._multiplexer:
      return False
    return bool(self._multiplexer.PluginRunToTagToContent(
        plugin_metadata.PLUGIN_NAME))

  def hparam_infos_impl(self):
    # Collect the hyperparameter types and names from the
    # ExperimentMetadata.config_type protobuf message
    exp_metadata = self._get_exp_metadata()
    hparam_infos=[]
    for (hparam_name, hparam_type) in six.iteritems(
        exp_metadata.config_type.param_defs):
      hparam_info = {"name" : hparam_name}
      hparam_info["type"] = hparam_type
      hparam_info["values"] = set([])
      hparam_infos.append(hparam_info)

    # Fill in the 'values' field for each hparam_info object by
    # iterating on all sessions.
    session_metadatas = self._list_session_metadatas()
    for session_metadata in session_metadatas:
      for hparam_info in hparam_infos:
        if hparam_info["name"] in session_metadata.config.param_values:
          param_value = (session_metadata.config.
                         param_values[hparam_info["name"]])
          value = metadata_utils.param_value_from_proto(param_value)
          if value is None:
            raise HParamsExplorerError(
                'Found no set value for hparam %s in session_metadata: %s'
                % (hparam_info['name'], session_metadata))
          hparam_info["values"].add(str(value))

    # Convert each hparam_info.values field from a set to a list since
    # serializing sets to JSON is not supported by the json.dumps() method
    # (by default).
    for hparam_info in hparam_infos:
      hparam_info["values"] = list(hparam_info["values"])

    return hparam_infos

  def _get_exp_metadata(self):
    """Searches for the ExperimentMetadata message in the run-tags data."""
    mapping = self._multiplexer.PluginRunToTagToContent(
        plugin_metadata.PLUGIN_NAME)
    for (run, tag_to_content) in six.iteritems(mapping):
      if "experiment_metadata" in tag_to_content:
        return self._get_protobuf_in_tag(
            run, "experiment_metadata", metadata_pb2.ExperimentMetadata)

    raise HParamsExplorerError('Could not find a run containing an'
                               'experiment_metadata tag.')

  #TODO(erez): Currently the method below just searches for all the tags
  #named "session_metadata". Make it more robust by considering the structure
  #of the assoicated runs and experiment run.
  def _list_session_metadatas(self):
    result=[]
    mapping = self._multiplexer.PluginRunToTagToContent(
        plugin_metadata.PLUGIN_NAME)
    for (run, tag_to_content) in six.iteritems(mapping):
      if "session_metadata" in tag_to_content:
        result.append(self._get_protobuf_in_tag(
            run, "session_metadata", metadata_pb2.SessionMetadata))
    return result

  def _get_protobuf_in_tag(self, run, tag, protobuf_type):
    tensor_events = self._multiplexer.Tensors(run, tag)
    if len(tensor_events) != 1:
      raise HParamsExplorerError(
          'Number of tensor events in tag "%s" for run "%s" is %s and it'
          ' should be 1.' % (tag, run, len(tensor_events)))
    serialized_proto = tf.make_ndarray(tensor_events[0].tensor_proto).item()
    return getattr(protobuf_type, "FromString")(serialized_proto)

  @wrappers.Request.application
  def hparam_infos_route(self, request):
    try:
      hparam_infos = self.hparam_infos_impl()
      return http_util.Respond(request, hparam_infos, 'application/json')
    except HParamsExplorerError as error:
      # TODO(erez): Log instead of print.
      print("Got error: %s" % error)
      return http_util.Respond(request, content='', content_type='', code=500)
