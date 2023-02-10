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
"""Classes and functions for handling the ListSessionGroups API call."""


import collections
import dataclasses
import operator
import re
from typing import Optional

from google.protobuf import struct_pb2

from tensorboard.data import provider
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import error
from tensorboard.plugins.hparams import metadata
from tensorboard.plugins.hparams import metrics


class Handler:
    """Handles a ListSessionGroups request."""

    def __init__(
        self, request_context, backend_context, experiment_id, request
    ):
        """Constructor.

        Args:
          request_context: A tensorboard.context.RequestContext.
          backend_context: A backend_context.Context instance.
          experiment_id: A string, as from `plugin_util.experiment_id`.
          request: A ListSessionGroupsRequest protobuf.
        """
        self._request_context = request_context
        self._backend_context = backend_context
        self._experiment_id = experiment_id
        self._request = request
        self._extractors = _create_extractors(request.col_params)
        self._filters = _create_filters(request.col_params, self._extractors)
        # Query for all Hparams summary metadata up front to minimize calls to
        # the underlying DataProvider.
        self._hparams_run_to_tag_to_content = backend_context.hparams_metadata(
            request_context, experiment_id
        )
        # Since an context.experiment() call may search through all the runs, we
        # cache it here.
        self._experiment = backend_context.experiment_from_metadata(
            request_context, experiment_id, self._hparams_run_to_tag_to_content
        )

    def run(self):
        """Handles the request specified on construction.

        Returns:
          A ListSessionGroupsResponse object.
        """
        session_groups = self._build_session_groups()
        session_groups = self._filter(session_groups)
        self._sort(session_groups)
        return self._create_response(session_groups)

    def _build_session_groups(self):
        """Returns a list of SessionGroups protobuffers from the summary
        data."""

        # Algorithm: We keep a dict 'groups_by_name' mapping a SessionGroup name
        # (str) to a SessionGroup protobuffer. We traverse the runs associated with
        # the plugin--each representing a single session. We form a Session
        # protobuffer from each run and add it to the relevant SessionGroup object
        # in the 'groups_by_name' dict. We create the SessionGroup object, if this
        # is the first session of that group we encounter.
        groups_by_name = {}
        # The TensorBoard runs with session start info are the
        # "sessions", which are not necessarily the runs that actually
        # contain metrics (may be in subdirectories).
        session_names = [
            run
            for (run, tags) in self._hparams_run_to_tag_to_content.items()
            if metadata.SESSION_START_INFO_TAG in tags
        ]
        metric_runs = set()
        metric_tags = set()
        for session_name in session_names:
            for metric in self._experiment.metric_infos:
                metric_name = metric.name
                (run, tag) = metrics.run_tag_from_session_and_metric(
                    session_name, metric_name
                )
                metric_runs.add(run)
                metric_tags.add(tag)
        all_metric_evals = self._backend_context.read_last_scalars(
            self._request_context,
            self._experiment_id,
            run_tag_filter=provider.RunTagFilter(
                runs=metric_runs, tags=metric_tags
            ),
        )
        for (
            session_name,
            tag_to_content,
        ) in self._hparams_run_to_tag_to_content.items():
            if metadata.SESSION_START_INFO_TAG not in tag_to_content:
                continue
            start_info = metadata.parse_session_start_info_plugin_data(
                tag_to_content[metadata.SESSION_START_INFO_TAG]
            )
            end_info = None
            if metadata.SESSION_END_INFO_TAG in tag_to_content:
                end_info = metadata.parse_session_end_info_plugin_data(
                    tag_to_content[metadata.SESSION_END_INFO_TAG]
                )
            session = self._build_session(
                session_name, start_info, end_info, all_metric_evals
            )
            if session.status in self._request.allowed_statuses:
                self._add_session(session, start_info, groups_by_name)

        # Compute the session group's aggregated metrics for each group.
        groups = groups_by_name.values()
        for group in groups:
            # We sort the sessions in a group so that the order is deterministic.
            group.sessions.sort(key=operator.attrgetter("name"))
            self._aggregate_metrics(group)
        return groups

    def _add_session(self, session, start_info, groups_by_name):
        """Adds a new Session protobuffer to the 'groups_by_name' dictionary.

        Called by _build_session_groups when we encounter a new session. Creates
        the Session protobuffer and adds it to the relevant group in the
        'groups_by_name' dict. Creates the session group if this is the first time
        we encounter it.

        Args:
          session: api_pb2.Session. The session to add.
          start_info: The SessionStartInfo protobuffer associated with the session.
          groups_by_name: A str to SessionGroup protobuffer dict. Representing the
            session groups and sessions found so far.
        """
        # If the group_name is empty, this session's group contains only
        # this session. Use the session name for the group name since session
        # names are unique.
        group_name = start_info.group_name or session.name
        if group_name in groups_by_name:
            groups_by_name[group_name].sessions.extend([session])
        else:
            # Create the group and add the session as the first one.
            group = api_pb2.SessionGroup(
                name=group_name,
                sessions=[session],
                monitor_url=start_info.monitor_url,
            )
            # Copy hparams from the first session (all sessions should have the same
            # hyperparameter values) into result.
            # There doesn't seem to be a way to initialize a protobuffer map in the
            # constructor.
            for (key, value) in start_info.hparams.items():
                group.hparams[key].CopyFrom(value)
            groups_by_name[group_name] = group

    def _build_session(self, name, start_info, end_info, all_metric_evals):
        """Builds a session object."""

        assert start_info is not None
        result = api_pb2.Session(
            name=name,
            start_time_secs=start_info.start_time_secs,
            model_uri=start_info.model_uri,
            metric_values=self._build_session_metric_values(
                name, all_metric_evals
            ),
            monitor_url=start_info.monitor_url,
        )
        if end_info is not None:
            result.status = end_info.status
            result.end_time_secs = end_info.end_time_secs
        return result

    def _build_session_metric_values(self, session_name, all_metric_evals):
        """Builds the session metric values."""

        # result is a list of api_pb2.MetricValue instances.
        result = []
        metric_infos = self._experiment.metric_infos
        for metric_info in metric_infos:
            metric_name = metric_info.name
            (run, tag) = metrics.run_tag_from_session_and_metric(
                session_name, metric_name
            )
            datum = all_metric_evals.get(run, {}).get(tag)
            if not datum:
                # It's ok if we don't find the metric in the session.
                # We skip it here. For filtering and sorting purposes its value is None.
                continue
            result.append(
                api_pb2.MetricValue(
                    name=metric_name,
                    wall_time_secs=datum.wall_time,
                    training_step=datum.step,
                    value=datum.value,
                )
            )
        return result

    def _aggregate_metrics(self, session_group):
        """Sets the metrics of the group based on aggregation_type."""

        if (
            self._request.aggregation_type == api_pb2.AGGREGATION_AVG
            or self._request.aggregation_type == api_pb2.AGGREGATION_UNSET
        ):
            _set_avg_session_metrics(session_group)
        elif self._request.aggregation_type == api_pb2.AGGREGATION_MEDIAN:
            _set_median_session_metrics(
                session_group, self._request.aggregation_metric
            )
        elif self._request.aggregation_type == api_pb2.AGGREGATION_MIN:
            _set_extremum_session_metrics(
                session_group, self._request.aggregation_metric, min
            )
        elif self._request.aggregation_type == api_pb2.AGGREGATION_MAX:
            _set_extremum_session_metrics(
                session_group, self._request.aggregation_metric, max
            )
        else:
            raise error.HParamsError(
                "Unknown aggregation_type in request: %s"
                % self._request.aggregation_type
            )

    def _filter(self, session_groups):
        return [sg for sg in session_groups if self._passes_all_filters(sg)]

    def _passes_all_filters(self, session_group):
        return all(filter_fn(session_group) for filter_fn in self._filters)

    def _sort(self, session_groups):
        """Sorts 'session_groups' in place according to _request.col_params."""

        # Sort by session_group name so we have a deterministic order.
        session_groups.sort(key=operator.attrgetter("name"))
        # Sort by lexicographical order of the _request.col_params whose order
        # is not ORDER_UNSPECIFIED. The first such column is the primary sorting
        # key, the second is the secondary sorting key, etc. To achieve that we
        # need to iterate on these columns in reverse order (thus the primary key
        # is the key used in the last sort).
        for col_param, extractor in reversed(
            list(zip(self._request.col_params, self._extractors))
        ):
            if col_param.order == api_pb2.ORDER_UNSPECIFIED:
                continue
            if col_param.order == api_pb2.ORDER_ASC:
                session_groups.sort(
                    key=_create_key_func(
                        extractor,
                        none_is_largest=not col_param.missing_values_first,
                    )
                )
            elif col_param.order == api_pb2.ORDER_DESC:
                session_groups.sort(
                    key=_create_key_func(
                        extractor,
                        none_is_largest=col_param.missing_values_first,
                    ),
                    reverse=True,
                )
            else:
                raise error.HParamsError(
                    "Unknown col_param.order given: %s" % col_param
                )

    def _create_response(self, session_groups):
        return api_pb2.ListSessionGroupsResponse(
            session_groups=session_groups[
                self._request.start_index : self._request.start_index
                + self._request.slice_size
            ],
            total_size=len(session_groups),
        )


def _create_key_func(extractor, none_is_largest):
    """Returns a key_func to be used in list.sort().

    Returns a key_func to be used in list.sort() that sorts session groups
    by the value extracted by extractor. 'None' extracted values will either
    be considered largest or smallest as specified by the "none_is_largest"
    boolean parameter.

    Args:
      extractor: An extractor function that extract the key from the session
        group.
      none_is_largest: bool. If true treats 'None's as largest; otherwise
        smallest.
    """
    if none_is_largest:

        def key_func_none_is_largest(session_group):
            value = extractor(session_group)
            return (value is None, value)

        return key_func_none_is_largest

    def key_func_none_is_smallest(session_group):
        value = extractor(session_group)
        return (value is not None, value)

    return key_func_none_is_smallest


# Extractors. An extractor is a function that extracts some property (a metric
# or a hyperparameter) from a SessionGroup instance.
def _create_extractors(col_params):
    """Creates extractors to extract properties corresponding to 'col_params'.

    Args:
      col_params: List of ListSessionGroupsRequest.ColParam protobufs.
    Returns:
      A list of extractor functions. The ith element in the
      returned list extracts the column corresponding to the ith element of
      _request.col_params
    """
    result = []
    for col_param in col_params:
        result.append(_create_extractor(col_param))
    return result


def _create_extractor(col_param):
    if col_param.HasField("metric"):
        return _create_metric_extractor(col_param.metric)
    elif col_param.HasField("hparam"):
        return _create_hparam_extractor(col_param.hparam)
    else:
        raise error.HParamsError(
            'Got ColParam with both "metric" and "hparam" fields unset: %s'
            % col_param
        )


def _create_metric_extractor(metric_name):
    """Returns function that extracts a metric from a session group or a
    session.

    Args:
      metric_name: tensorboard.hparams.MetricName protobuffer. Identifies the
      metric to extract from the session group.
    Returns:
      A function that takes a tensorboard.hparams.SessionGroup or
      tensorborad.hparams.Session protobuffer and returns the value of the metric
      identified by 'metric_name' or None if the value doesn't exist.
    """

    def extractor_fn(session_or_group):
        metric_value = _find_metric_value(session_or_group, metric_name)
        return metric_value.value if metric_value else None

    return extractor_fn


def _find_metric_value(session_or_group, metric_name):
    """Returns the metric_value for a given metric in a session or session
    group.

    Args:
      session_or_group: A Session protobuffer or SessionGroup protobuffer.
      metric_name: A MetricName protobuffer. The metric to search for.
    Returns:
      A MetricValue protobuffer representing the value of the given metric or
      None if no such metric was found in session_or_group.
    """
    # Note: We can speed this up by converting the metric_values field
    # to a dictionary on initialization, to avoid a linear search here. We'll
    # need to wrap the SessionGroup and Session protos in a python object for
    # that.
    for metric_value in session_or_group.metric_values:
        if (
            metric_value.name.tag == metric_name.tag
            and metric_value.name.group == metric_name.group
        ):
            return metric_value


def _create_hparam_extractor(hparam_name):
    """Returns an extractor function that extracts an hparam from a session
    group.

    Args:
      hparam_name: str. Identies the hparam to extract from the session group.
    Returns:
      A function that takes a tensorboard.hparams.SessionGroup protobuffer and
      returns the value, as a native Python object, of the hparam identified by
      'hparam_name'.
    """

    def extractor_fn(session_group):
        if hparam_name in session_group.hparams:
            return _value_to_python(session_group.hparams[hparam_name])
        return None

    return extractor_fn


# Filters. A filter is a boolean function that takes a session group and returns
# True if it should be included in the result. Currently, Filters are functions
# of a single column value extracted from the session group with a given
# extractor specified in the construction of the filter.
def _create_filters(col_params, extractors):
    """Creates filters for the given col_params.

    Args:
      col_params: List of ListSessionGroupsRequest.ColParam protobufs.
      extractors: list of extractor functions of the same length as col_params.
        Each element should extract the column described by the corresponding
        element of col_params.
    Returns:
      A list of filter functions. Each corresponding to a single
      col_params.filter oneof field of _request
    """
    result = []
    for col_param, extractor in zip(col_params, extractors):
        a_filter = _create_filter(col_param, extractor)
        if a_filter:
            result.append(a_filter)
    return result


def _create_filter(col_param, extractor):
    """Creates a filter for the given col_param and extractor.

    Args:
      col_param: A tensorboard.hparams.ColParams object identifying the column
        and describing the filter to apply.
      extractor: A function that extract the column value identified by
        'col_param' from a tensorboard.hparams.SessionGroup protobuffer.
    Returns:
      A boolean function taking a tensorboard.hparams.SessionGroup protobuffer
      returning True if the session group passes the filter described by
      'col_param'. If col_param does not specify a filter (i.e. any session
      group passes) returns None.
    """
    include_missing_values = not col_param.exclude_missing_values
    if col_param.HasField("filter_regexp"):
        value_filter_fn = _create_regexp_filter(col_param.filter_regexp)
    elif col_param.HasField("filter_interval"):
        value_filter_fn = _create_interval_filter(col_param.filter_interval)
    elif col_param.HasField("filter_discrete"):
        value_filter_fn = _create_discrete_set_filter(col_param.filter_discrete)
    elif include_missing_values:
        # No 'filter' field and include_missing_values is True.
        # Thus, the resulting filter always returns True, so to optimize for this
        # common case we do not include it in the list of filters to check.
        return None
    else:
        value_filter_fn = lambda _: True

    def filter_fn(session_group):
        value = extractor(session_group)
        if value is None:
            return include_missing_values
        return value_filter_fn(value)

    return filter_fn


def _create_regexp_filter(regex):
    """Returns a boolean function that filters strings based on a regular exp.

    Args:
      regex: A string describing the regexp to use.
    Returns:
      A function taking a string and returns True if any of its substrings
      matches regex.
    """
    # Warning: Note that python's regex library allows inputs that take
    # exponential time. Time-limiting it is difficult. When we move to
    # a true multi-tenant tensorboard server, the regexp implementation here
    # would need to be replaced by something more secure.
    compiled_regex = re.compile(regex)

    def filter_fn(value):
        if not isinstance(value, str):
            raise error.HParamsError(
                "Cannot use a regexp filter for a value of type %s. Value: %s"
                % (type(value), value)
            )
        return re.search(compiled_regex, value) is not None

    return filter_fn


def _create_interval_filter(interval):
    """Returns a function that checkes whether a number belongs to an interval.

    Args:
      interval: A tensorboard.hparams.Interval protobuf describing the interval.
    Returns:
      A function taking a number (float or int) that returns True if the number
      belongs to (the closed) 'interval'.
    """

    def filter_fn(value):
        if not isinstance(value, (int, float)):
            raise error.HParamsError(
                "Cannot use an interval filter for a value of type: %s, Value: %s"
                % (type(value), value)
            )
        return interval.min_value <= value and value <= interval.max_value

    return filter_fn


def _create_discrete_set_filter(discrete_set):
    """Returns a function that checks whether a value belongs to a set.

    Args:
      discrete_set: A list of objects representing the set.
    Returns:
      A function taking an object and returns True if its in the set. Membership
      is tested using the Python 'in' operator (thus, equality of distinct
      objects is computed using the '==' operator).
    """

    def filter_fn(value):
        return value in discrete_set

    return filter_fn


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


@dataclasses.dataclass(frozen=True)
class _MetricIdentifier:
    """An identifier for a metric.

    As protobuffers are mutable we can't use MetricName directly as a dict's key.
    Instead, we represent MetricName protocol buffer as an immutable dataclass.

    Attributes:
      group: Metric group corresponding to the dataset on which the model was
        evaluated.
      tag: String tag associated with the metric.
    """

    group: str
    tag: str


class _MetricStats:
    """A simple class to hold metric stats used in calculating metric averages.

    Used in _set_avg_session_metrics(). See the comments in that function
    for more details.

    Attributes:
      total: int. The sum of the metric measurements seen so far.
      count: int. The number of largest-step measuremens seen so far.
      total_step: int. The sum of the steps at which the measurements were taken
      total_wall_time_secs: float. The sum of the wall_time_secs at
          which the measurements were taken.
    """

    # We use slots here to catch typos in attributes earlier. Note that this makes
    # this class incompatible with 'pickle'.
    __slots__ = [
        "total",
        "count",
        "total_step",
        "total_wall_time_secs",
    ]

    def __init__(self):
        self.total = 0
        self.count = 0
        self.total_step = 0
        self.total_wall_time_secs = 0.0


def _set_avg_session_metrics(session_group):
    """Sets the metrics for the group to be the average of its sessions.

    The resulting session group metrics consist of the union of metrics across
    the group's sessions. The value of each session group metric is the average
    of that metric values across the sessions in the group. The 'step' and
    'wall_time_secs' fields of the resulting MetricValue field in the session
    group are populated with the corresponding averages (truncated for 'step')
    as well.

    Args:
      session_group: A SessionGroup protobuffer.
    """
    assert session_group.sessions, "SessionGroup cannot be empty."
    # Algorithm: Iterate over all (session, metric) pairs and maintain a
    # dict from _MetricIdentifier to _MetricStats objects.
    # Then use the final dict state to compute the average for each metric.
    metric_stats = collections.defaultdict(_MetricStats)
    for session in session_group.sessions:
        for metric_value in session.metric_values:
            metric_name = _MetricIdentifier(
                group=metric_value.name.group, tag=metric_value.name.tag
            )
            stats = metric_stats[metric_name]
            stats.total += metric_value.value
            stats.count += 1
            stats.total_step += metric_value.training_step
            stats.total_wall_time_secs += metric_value.wall_time_secs

    del session_group.metric_values[:]
    for (metric_name, stats) in metric_stats.items():
        session_group.metric_values.add(
            name=api_pb2.MetricName(
                group=metric_name.group, tag=metric_name.tag
            ),
            value=float(stats.total) / float(stats.count),
            training_step=stats.total_step // stats.count,
            wall_time_secs=stats.total_wall_time_secs / stats.count,
        )


@dataclasses.dataclass(frozen=True)
class _Measurement:
    """Holds a session's metric value.

    Attributes:
      metric_value: Metric value of the session.
      session_index: Index of the session in its group.
    """

    metric_value: Optional[api_pb2.MetricValue]
    session_index: int


def _set_median_session_metrics(session_group, aggregation_metric):
    """Sets the metrics for session_group to those of its "median session".

    The median session is the session in session_group with the median value
    of the metric given by 'aggregation_metric'. The median is taken over the
    subset of sessions in the group whose 'aggregation_metric' was measured
    at the largest training step among the sessions in the group.

    Args:
      session_group: A SessionGroup protobuffer.
      aggregation_metric: A MetricName protobuffer.
    """
    measurements = sorted(
        _measurements(session_group, aggregation_metric),
        key=operator.attrgetter("metric_value.value"),
    )
    median_session = measurements[(len(measurements) - 1) // 2].session_index
    del session_group.metric_values[:]
    session_group.metric_values.MergeFrom(
        session_group.sessions[median_session].metric_values
    )


def _set_extremum_session_metrics(
    session_group, aggregation_metric, extremum_fn
):
    """Sets the metrics for session_group to those of its "extremum session".

    The extremum session is the session in session_group with the extremum value
    of the metric given by 'aggregation_metric'. The extremum is taken over the
    subset of sessions in the group whose 'aggregation_metric' was measured
    at the largest training step among the sessions in the group.

    Args:
      session_group: A SessionGroup protobuffer.
      aggregation_metric: A MetricName protobuffer.
      extremum_fn: callable. Must be either 'min' or 'max'. Determines the type of
        extremum to compute.
    """
    measurements = _measurements(session_group, aggregation_metric)
    ext_session = extremum_fn(
        measurements, key=operator.attrgetter("metric_value.value")
    ).session_index
    del session_group.metric_values[:]
    session_group.metric_values.MergeFrom(
        session_group.sessions[ext_session].metric_values
    )


def _measurements(session_group, metric_name):
    """A generator for the values of the metric across the sessions in the
    group.

    Args:
      session_group: A SessionGroup protobuffer.
      metric_name: A MetricName protobuffer.
    Yields:
      The next metric value wrapped in a _Measurement instance.
    """
    for session_index, session in enumerate(session_group.sessions):
        metric_value = _find_metric_value(session, metric_name)
        if not metric_value:
            continue
        yield _Measurement(metric_value, session_index)
