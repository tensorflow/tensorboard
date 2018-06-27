# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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

"""Classes and functions for handling the ListSessionGroups API call."""

# TODO(erez):Make the session group building simpler by building the session
# group directly on the first pass, rather than building a list of sessions and
# then grouping. This eliminates the need for _SessionInfoTuple.
# TODO(erez): Remove the filters and extractors class hierarchies and just
# use closures for these. This will elminate a lot of boilerplate code.

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import abc
import re

import six
from google.protobuf import struct_pb2

from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import error
from tensorboard.plugins.hparams import metrics
from tensorboard.plugins.hparams import metadata

class Handler(object):
  """Handles a ListSessionGroups request. """
  def __init__(self, context, request):
    """
    Args:
      context: A backend_context.Context instance.
      request: A ListSessionGroupsRequest protobuf.
    """
    self._context = context
    self._request = request
    self._extractors = Handler._create_extractors(request.col_params)
    self._filters = Handler._create_filters(
        request.col_params, self._extractors)

  def run(self):
    """Handles the request specified on construction.

    Returns:
      A ListSessionGroupsResponse object.

    """
    session_groups = self._get_session_groups()
    session_groups = self._filter(session_groups)
    self._sort(session_groups)
    return self._create_response(session_groups)

  @staticmethod
  def _create_extractors(col_params):
    """
    Args:
      col_params: List of ListSessionGroupsRequest.ColParam protobufs.
    Returns:
      A list of _SessionGroupPropExtractor instances. The ith element in the
      returned list extracts the column corresponding to the ith element of
      _request.col_params
    """
    result = []
    for col_param in col_params:
      result.append(_SessionGroupPropExtractor.create(col_param))
    return result

  @staticmethod
  def _create_filters(col_params, extractors):
    """
    Args:
      col_params: List of ListSessionGroupsRequest.ColParam protobufs.
      extractors: list of _SessionGroupPropExtractor instances. Each element
        should extract the column described by the corresponding element
        in col_params.
    Returns:
      A list of _SessionGroupFilter instances. Each corresponding to
      a single col_params.filter oneof field of _request
    """
    result = []
    for col_param, extractor in zip(col_params, extractors):
      a_filter = _SessionGroupFilter.create(col_param, extractor)
      if a_filter is not None:
        result.append(a_filter)
    return result

  # Used to store information about a session before translation to
  # a api_pb2.Session proto.
  _SessionInfoTuple = collections.namedtuple(
      'SessionInfoTuple',
      ['start_info', 'end_info'],
  )
  def _get_session_groups(self):
    session_infos_by_name = self._build_session_infos_by_name()
    sessions_by_group = self._build_sessions_by_group(session_infos_by_name)
    return [
        self._build_group_from_sessions(sessions, session_infos_by_name)
        for sessions in sessions_by_group.values()
    ]

  def _build_session_infos_by_name(self):
    run_to_tag_to_content = self._context.multiplexer.PluginRunToTagToContent(
        metadata.PLUGIN_NAME)
    result = {}
    for (run, tag_to_content) in six.iteritems(run_to_tag_to_content):
      if metadata.SESSION_START_INFO_TAG not in tag_to_content:
        continue
      start_info = metadata.parse_session_start_info_plugin_data(
          tag_to_content[metadata.SESSION_START_INFO_TAG])
      # end_info will be None if the corresponding tag doesn't exist.
      end_info = None
      if metadata.SESSION_END_INFO_TAG in tag_to_content:
        end_info = metadata.parse_session_end_info_plugin_data(
            tag_to_content[metadata.SESSION_END_INFO_TAG])
      result[run] = self._SessionInfoTuple(start_info=start_info,
                                           end_info=end_info)
    return result

  def _build_sessions_by_group(self, session_infos_by_name):
    # result is a group_name (string) --> list of api_pb2.Session instances.
    result = collections.defaultdict(list)
    for (name, infos_tuple) in six.iteritems(session_infos_by_name):
      session = self._build_session(name, infos_tuple)
      group_name = infos_tuple.start_info.group_name
      # If the group_name is empty, this session's group contains only
      # this session. Use the session name for the group name since session
      # names are unique.
      if group_name == "":
        group_name = name
      result[group_name].append(session)
    return result

  def _build_session(self, session_name, infos_tuple):
    assert isinstance(infos_tuple, self._SessionInfoTuple)
    assert infos_tuple.start_info is not None
    result = api_pb2.Session(
        name=session_name,
        start_time_secs=infos_tuple.start_info.start_time_secs,
        model_uri=infos_tuple.start_info.model_uri,
        metric_values=self._build_session_metric_values(session_name),
        monitor_url=infos_tuple.start_info.monitor_url)
    if infos_tuple.end_info is not None:
      result.status = infos_tuple.end_info.status
      result.end_time_secs = infos_tuple.end_info.end_time_secs
    return result

  def _build_session_metric_values(self, session_name):
    # result is a list of api_pb2.MetricValue instances.
    result = []
    metric_infos = self._context.experiment().metric_infos
    for metric_info in metric_infos:
      metric_name = metric_info.name
      try:
        metric_eval = metrics.last_metric_eval(
            self._context.multiplexer,
            session_name,
            metric_name)
      except KeyError:
        # It's ok if we don't find the metric in the session.
        # We skip it here. For filtering and sorting purposes its value is None.
        continue

      # metric_eval is a 3-tuple of the form [wall_time, step, value]
      result.append(api_pb2.MetricValue(name=metric_name,
                                        wall_time_secs=metric_eval[0],
                                        training_step=metric_eval[1],
                                        value=metric_eval[2]))
    return result

  def _build_group_from_sessions(self, sessions, session_infos_by_name):
    assert sessions  # Make sure sessions is non-empty
    # Sort sessions by name so the order is deterministic.
    sessions = sorted(sessions, key=lambda session: session.name)
    # TODO(erez): Do proper metric aggregation. For now we just take
    # the metric values from the first session.
    result = api_pb2.SessionGroup(
        name=session_infos_by_name[sessions[0].name].start_info.group_name,
        metric_values=sessions[0].metric_values,
        sessions=sessions,
        monitor_url=(
            session_infos_by_name[sessions[0].name].start_info.monitor_url
        ),
    )
    # Copy hparams from the first session (all sessions should have the same
    # hyperparameter values) into result.
    # There doesn't seem to be a way to initialize a protobuffer map in the
    # constructor.
    hparams = session_infos_by_name[sessions[0].name].start_info.hparams
    for (key, value) in six.iteritems(hparams):
      result.hparams[key].CopyFrom(value)
    return result

  def _filter(self, session_groups):
    return [sg for sg in session_groups if self._passes_all_filters(sg)]

  def _passes_all_filters(self, session_group):
    for f in self._filters:
      if not f.passes(session_group):
        return False
    return True

  def _sort(self, session_groups):
    """Sorts 'session_groups' in place according to _request.col_params"""
    def _create_key_func(extractor, none_is_largest):
      """Returns a key_func to be used in list.sort() that sorts session groups
      by the value extracted by extractor. None extracted values will either
      be considered largest or smallest as specified by the "none_is_largest"
      boolean parameter. """
      if none_is_largest:
        def key_func_none_is_largest(session_group):
          value = extractor.extract(session_group)
          return (value is None, value)
        return key_func_none_is_largest
      def key_func_none_is_smallest(session_group):
        value = extractor.extract(session_group)
        return (value is not None, value)
      return key_func_none_is_smallest

    # Sort by session_group name so we have a deterministic order.
    session_groups.sort(key=lambda session_group: session_group.name)
    # Sort by lexicographical order of the _request.col_params whose order
    # is not ORDER_UNSPECIFIED. The first such column is the primary sorting
    # key, the second is the secondary sorting key, etc. To achieve that we
    # need to iterate on these columns in reverse order (thus the primary key
    # is the key used in the last sort).
    for col_param, extractor in reversed(list(zip(self._request.col_params,
                                                  self._extractors))):
      if col_param.order == api_pb2.ORDER_UNSPECIFIED:
        continue
      if col_param.order == api_pb2.ORDER_ASC:
        session_groups.sort(
            key=_create_key_func(
                extractor,
                none_is_largest=not col_param.missing_values_first))
      elif col_param.order == api_pb2.ORDER_DESC:
        session_groups.sort(
            key=_create_key_func(
                extractor,
                none_is_largest=col_param.missing_values_first),
            reverse=True)
      else:
        raise error.HParamsError('Unknown col_param.order given: %s' %
                                 col_param)

  def _create_response(self, session_groups):
    return api_pb2.ListSessionGroupsResponse(
        session_groups=session_groups[
            self._request.start_index:
            self._request.start_index+self._request.slice_size],
        total_size=len(session_groups))


class _SessionGroupPropExtractor(object):
  """An abstract class representing a function that extracts some property
  from a SessionGroup instance."""

  __metaclass__ = abc.ABCMeta

  @staticmethod
  def create(col_param):
    if col_param.HasField("metric"):
      return _SessionGroupMetricExtractor(col_param.metric)
    elif col_param.HasField("hparam"):
      return _SessionGroupHParamExtractor(col_param.hparam)
    else:
      raise error.HParamsError(
          'Got ColParam with both "metric" and "hparam" fields unset: %s' %
          col_param)

  @abc.abstractmethod
  def extract(self, session_group):
    raise NotImplementedError("Abstract method called.")


class _SessionGroupMetricExtractor(_SessionGroupPropExtractor):
  """Extracts a metric value from a session group."""
  def __init__(self, metric_name):
    self._metric_name = metric_name

  def extract(self, session_group):
    # Note: We can speed this up by converting session_group.metric_values
    # to a dictionary on initialization, to avoid a linear search here every
    # time we extract(). We'll need to wrap SessionGroup proto in a python
    # object for that.
    for metric_value in session_group.metric_values:
      if (metric_value.name.tag == self._metric_name.tag and
          metric_value.name.group == self._metric_name.group):
        return metric_value.value
    return None


class _SessionGroupHParamExtractor(_SessionGroupPropExtractor):
  """Extracts an hyperparameter value from a session group."""
  def __init__(self, hparam_name):
    self._hparam_name = hparam_name

  def extract(self, session_group):
    if self._hparam_name in session_group.hparams:
      return _value_to_python(session_group.hparams[self._hparam_name])
    return None


class _SessionGroupFilter(object):
  """An abstract class representing a filter of a SessionGroup instance based
  on an extracted value of the instance.
  For a given instance the 'passes' method (below) returns true if the instance
  passes the filter or false otherwise.
  The include_missing_values parameter in the constructor specifies
  whether the None value is considered passing the filter or not.
  """
  __metaclass__ = abc.ABCMeta

  @staticmethod
  def create(col_param, extractor):
    include_missing_values = not col_param.exclude_missing_values
    if col_param.HasField("filter_regexp"):
      return _SessionGroupRegexFilter(
          col_param.filter_regexp, extractor, include_missing_values)
    elif col_param.HasField("filter_interval"):
      return _SessionGroupIntervalFilter(
          col_param.filter_interval, extractor, include_missing_values)
    elif col_param.HasField("filter_discrete"):
      return _SessionGroupDiscreteSetFilter(
          _list_value_to_python_list(col_param.filter_discrete),
          extractor,
          include_missing_values)
    else:
      return None

  def __init__(self, extractor, include_missing_values):
    self._extractor = extractor
    self._include_missing_values = include_missing_values

  def passes(self, session_group):
    value = self._extractor.extract(session_group)
    if value is None:
      return self._include_missing_values
    # Filter out SessionGroup instances with missing values.
    return self._value_passes(value)

  @abc.abstractmethod
  def _value_passes(self, value):
    raise NotImplementedError("Abstract method called.")


def _value_to_python(value):
  """Converts a google.protobuf.Value to a native Python object."""
  assert isinstance(value, struct_pb2.Value)
  field = value.WhichOneof("kind")
  if field == "number_value":
    return value.number_value
  elif field == "string_value":
    return value.string_value
  elif field == "bool_value":
    return value.bool_value
  else:
    raise ValueError("Unknown struct_pb2.Value oneof field set: %s" % field)


def _list_value_to_python_list(list_value):
  """Converts a google.protobuf.ListValue to a python list."""
  assert isinstance(list_value, struct_pb2.ListValue)
  return [_value_to_python(value) for value in list_value.values]


# WARNING: This class uses python PCRE-compatible regex which have exponential-
# time inputs, which is a security vulnerability (an attacker can make the
# server use a large amount of CPU).
# TODO(erez): Replace the regexp routines with a polynomial implementation.
class _SessionGroupRegexFilter(_SessionGroupFilter):
  def __init__(self, regex, extractor, include_missing_values):
    super(_SessionGroupRegexFilter, self).__init__(extractor,
                                                   include_missing_values)
    try:
      self._regex = re.compile(regex)
    except re.error as e:
      raise error.HParamsError('Error parsing regexp: %s. Error: %s' %
                               (regex, e))

  def _value_passes(self, value):
    if not isinstance(value, six.string_types):
      raise error.HParamsError(
          'Cannot use a regexp filter for a value of type %s. Value: %s' %
          (type(value), value))
    return self._regex.search(value) is not None


class _SessionGroupIntervalFilter(_SessionGroupFilter):
  def __init__(self, interval, extractor, include_missing_values):
    super(_SessionGroupIntervalFilter, self).__init__(extractor,
                                                      include_missing_values)
    assert isinstance(interval, api_pb2.Interval)
    self._interval = interval

  def _value_passes(self, value):
    if (not isinstance(value, six.integer_types) and
        not isinstance(value, float)):
      raise error.HParamsError(
          'Cannot use an interval filter for a value of type: %s, Value: %s' %
          (type(value), value))
    return (self._interval.min_value <= value and
            value <= self._interval.max_value)


class _SessionGroupDiscreteSetFilter(_SessionGroupFilter):
  def __init__(self, discrete_set, extractor, include_missing_values):
    (super(_SessionGroupDiscreteSetFilter, self)
     .__init__(extractor, include_missing_values))
    self._discrete_set = set(discrete_set)

  def _value_passes(self, value):
    return value in self._discrete_set
