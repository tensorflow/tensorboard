"""Classes and functions for handling the ListSessionGroups API call.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections
import abc
import re
import sets

import six
from google.protobuf import timestamp_pb2
from google.protobuf import struct_pb2
import tensorflow as tf

from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import backend_context
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
    self._extractors = self._create_extractors()
    self._filters = self._create_filters()

  def run(self):
    """Handles the request specified on construction.

    Returns:
      A ListSessionGroupsResponse object.

    """
    session_groups = self._get_session_groups()
    session_groups = self._filter(session_groups)
    self._sort(session_groups)
    return self._create_response(session_groups)

  def _create_extractors(self):
    """
    Returns:
      A list of _SessionGroupPropExtractor instances. The ith element in the
      returned list extracts the column corresponding to the ith element of
      _request.col_params
    """
    result = []
    for col_param in self._request.col_params:
      result.append(_SessionGroupPropExtractor.create(col_param))
    return result

  def _create_filters(self):
    """
    Returns:
      A list of _SessionGroupFilter instances. Each corresponding to
      a single col_params.filter oneof field of _request
    """
    result = []
    for col_param, extractor in zip(self._request.col_params, self._extractors):
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
    run_to_tag_to_content = self._context.multiplexer().PluginRunToTagToContent(
        metadata.PLUGIN_NAME)
    result={}
    for (run, tag_to_content) in six.iteritems(run_to_tag_to_content):
      if metadata.SESSION_START_INFO_TAG not in tag_to_content:
        continue
      start_info=metadata.parse_plugin_data_as(
          tag_to_content[metadata.SESSION_START_INFO_TAG],
          metadata.DATA_TYPE_SESSION_START_INFO)
      # end_info will be None if the corresponding tag doesn't exist.
      end_info = None
      if metadata.SESSION_END_INFO_TAG in tag_to_content:
        end_info = metadata.parse_plugin_data_as(
            tag_to_content[metadata.SESSION_END_INFO_TAG],
            metadata.DATA_TYPE_SESSION_END_INFO)
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
    assert type(infos_tuple) is self._SessionInfoTuple
    assert infos_tuple.start_info is not None
    result = api_pb2.Session(
        name=session_name,
        start_time_secs=infos_tuple.start_info.start_time_secs,
        model_uri=infos_tuple.start_info.checkpoint_uri,
        metric_values=self._build_session_metric_values(session_name),
        monitor_url=infos_tuple.start_info.monitor_url)
    if infos_tuple.end_info is not None:
      result.status = infos_tuple.end_info.status
      result.end_time_secs = infos_tuple.end_info.end_time_secs
    return result

  def _build_session_metric_values(self, session_name):
    # result is a list of api_pb2.MetricValue instances.
    result=[]
    metric_infos = self._context.experiment().metric_infos
    for metric_info in metric_infos:
      metric_name = metric_info.name
      try:
        metric_evals = metrics.list_metric_evals(
            self._context.multiplexer(),
            session_name,
            metric_name)
      except KeyError as e:
        # It's ok if we don't find the metric in the session.
        # We skip it here for filtering and sorting purposes its value is _NULL
        continue
      # metric_evals[i] is a 3-tuple of the form [wall_time, step, value]
      result.append(api_pb2.MetricValue(name=metric_name,
                                        wall_time_secs=metric_evals[-1][0],
                                        training_step=metric_evals[-1][1],
                                        value=metric_evals[-1][2]))
    return result

  def _build_group_from_sessions(self, sessions, session_infos_by_name):
    assert len(sessions) > 0
    # TODO(erez): Do proper metric aggregation. For now we just take
    # the metric values from the first session.
    result = api_pb2.SessionGroup(
        name=session_infos_by_name[sessions[0].name].start_info.group_name,
        metric_values=sessions[0].metric_values,
        # Sort sessions by name so the order is deterministic.
        sessions=sorted(sessions, key=lambda session : session.name),
        monitor_url=(
            session_infos_by_name[sessions[0].name].start_info.monitor_url
        )
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
    return filter(
        lambda sg : self._passes_all_filters(sg),
        session_groups)

  def _passes_all_filters(self, session_group):
    for f in self._filters:
      if not f.passes(session_group):
        return False
    return True

  def _sort(self, session_groups):
    """Sorts 'session_groups' in place according to _request.col_params"""
    # Sort by session_group name so we have a deterministic order.
    session_groups.sort(key=lambda session_group : session_group.name)
    # Sort by lexicographical order of the _request.col_params whose order
    # is not ORDER_UNSPECIFIED. The first such column is the primary sorting
    # key, the second is the secondary sorting key, etc. To achieve that we
    # need to iterate on these columns in reverse order (thus the primary key
    # is the key used in the last sort).
    for col_param, extractor in reversed(zip(self._request.col_params,
                                             self._extractors)):
      if col_param.order == api_pb2.ORDER_UNSPECIFIED:
        continue
      key_func = lambda sg : extractor.extract(sg)
      if col_param.order == api_pb2.ORDER_ASC:
        session_groups.sort(key=key_func)
      elif col_param.order == api_pb2.ORDER_DESC:
        session_groups.sort(key=key_func, reverse=True)
      else:
        raise error.HParamsError('Unknown col_param.order given: %s' %
                                 col_param)

  def _create_response(self, session_groups):
    num_session_groups = len(session_groups)
    (page_start, page_end, next_page_token) = Handler._compute_pagination_info(
        num_session_groups, self._request.page_token, self._request.page_size)
    return api_pb2.ListSessionGroupsResponse(
        session_groups=session_groups[page_start : page_end],
        next_page_token=next_page_token,
        total_size=num_session_groups)

  @staticmethod
  def _compute_pagination_info(num_session_groups, page_token, page_size):
    if page_token == "":
      page_start = 0
    else:
      page_start = Handler._parse_page_token(page_token)
    if page_size <= 0:
      page_end = num_session_groups - page_start
    else:
      page_end = page_start + page_size
    if page_end >= num_session_groups:
      next_page_token = ""
    else:
      next_page_token = plugin_data_pb2.PageToken(start=page_end)
    return (page_start, page_end, next_page_token)

  @staticmethod
  def _parse_page_token(page_token):
    assert type(page_token) is str
    page_token_proto = plugin_data_pb2.PageToken.FromString(page_token)
    return page_token_proto.start


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

class _Null(object):
  """A singleton class representing a not-available hyperparameter or metric
  value. Similar to None, but we define it here to make explicit its ordering
  in relation to any other object.
  The _Null instance compares larger than any other object that doesn't
  override a comparison with _Null (so SessiongGroups with missing values should
  appear last in the response if the list is sorted in ascending order).
  """
  # TODO(erez): Figure out a better way to handle missing values. Consider
  # adding a user option for filtering these out of the response.
  def __cmp__(self, other):
    if self is other:
      return 0
    return 1

_NULL = _Null()

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
    return _NULL

  @staticmethod
  def _create(col_param):
    assert col_param.HasMetric()
    return _SessionGroupMetricExtractor(col_param.metric)


class _SessionGroupHParamExtractor(_SessionGroupPropExtractor):
  """Extracts an hyperparameter value from a session group."""
  def __init__(self, hparam_name):
    self._hparam_name = hparam_name

  def extract(self, session_group):
    if self._hparam_name in session_group.hparams:
      return _value_to_python(session_group.hparams[self._hparam_name])
    return _NULL


class _SessionGroupFilter(object):
  """An abstract class representing a filter of a SessionGroup instance based
  on an extracted value of the instance.
  For a given instance the 'passes' method (below) returns true if the instance
  passes the filter or false otherwise."""
  __metaclass__ = abc.ABCMeta

  @staticmethod
  def create(col_param, extractor):
    if col_param.HasField("regexp"):
      return _SessionGroupRegexFilter(col_param.regexp, extractor)
    elif col_param.HasField("interval"):
      return _SessionGroupIntervalFilter(col_param.interval, extractor)
    elif col_param.HasField("discrete_set"):
      return _SessionGroupDiscreteSetFilter(
          _list_value_to_python_list(col_param.discrete_set), extractor)
    else:
      return None

  def __init__(self, extractor):
    self._extractor = extractor

  def passes(self, session_group):
    value = self._extractor.extract(session_group)
    # Filter out SessionGroup instances with missing values.
    return (value is not _NULL) and self._value_passes(value)

  @abc.abstractmethod
  def _value_passes(self, value):
    raise NotImplementedError("Abstract method called.")


def _value_to_python(value):
  """Converts a google.protobuf.Value to a native Python object."""
  assert type(value) is struct_pb2.Value
  field=value.WhichOneof("kind")
  if field == 'number_value':
    return value.number_value
  elif field == 'string_value':
    return value.string_value
  elif field == 'bool_value':
    return value.bool_value


def _list_value_to_python_list(list_value):
  """Converts a google.protobuf.ListValue to a python list."""
  assert type(list_value) is struct_pb2.ListValue
  return [_value_to_python(value) for value in list_value.values]


class _SessionGroupRegexFilter(_SessionGroupFilter):
  def __init__(self, regex, extractor):
    super(_SessionGroupRegexFilter, self).__init__(extractor)
    try:
      self._regex = re.compile(regex)
    except re.error as e:
      raise error.HParamsError('Error parsing regexp: %s. Error: %s',
                              regex, e)

  def _value_passes(self, value):
    if not isinstance(value, str) and not isinstance(value, unicode):
      raise error.HParamsError(
          'Cannot use a regexp filter for a value of type %s. Value: %s' %
          (type(value), value))
    return self._regex.search(value) is not None


class _SessionGroupIntervalFilter(_SessionGroupFilter):
  def __init__(self, interval, extractor):
    super(_SessionGroupIntervalFilter, self).__init__(extractor)
    assert isinstance(interval, api_pb2.Interval)
    self._interval = interval

  def _value_passes(self, value):
    if (not isinstance(value, int) and
        not isinstance(value, float) and
        not isinstance(value, long)):
      raise error.HParamsError(
          'Cannot use an interval filter for a value of type: %s, Value: %s' %
          (type(value), value))
    return (self._interval.min_value <= value and
            value <= self._interval.max_value)


class _SessionGroupDiscreteSetFilter(_SessionGroupFilter):
  def __init__(self, discrete_set, extractor):
    super(_SessionGroupDiscreteSetFilter, self).__init__(extractor)
    self._discrete_set = sets.Set(discrete_set)

  def _value_passes(self, value):
    return value in self._discrete_set
