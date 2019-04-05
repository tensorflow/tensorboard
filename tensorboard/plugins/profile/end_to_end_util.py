# -*- coding: utf-8 -*-
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

"""Utilities for the end-to-end tool in the profiling plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import six


def _attribute(event_name):
  """Returns the attribute name from the event name."""

  return 'profile/' + event_name


class SessionTimeBreakDown(object):
  """Breakdown of the execution time within a session."""

  def __init__(self, session_name):
    self._session_name = session_name
    # All times are in milliseconds.
    self._session_begin_time = None
    self._init_system_begin_time = None
    self._init_system_end_time = None
    self._model_fn_begin_time = None
    self._setup_infeed_begin_time = None
    self._setup_infeed_end_time = None
    self._model_fn_end_time = None
    self._session_end_time = None

  def begin_and_end_times_set(self):
    return (self._session_begin_time is not None
            and self._session_end_time is not None)

  def all_times_set(self):
    return (self._session_begin_time is not None and
            self._session_end_time is not None and
            self._init_system_begin_time is not None and
            self._init_system_end_time is not None and
            self._model_fn_begin_time is not None and
            self._model_fn_end_time is not None and
            self._setup_infeed_begin_time is not None and
            self._setup_infeed_end_time is not None)

  def event_assigned(self, event):
    if not self.begin_and_end_times_set():
      return False
    if event.timestamp < self._session_begin_time:
      return False
    if event.timestamp > self._session_end_time:
      return False
    if event.attribute == _attribute('init_system_begin'):
      self._init_system_begin_time = event.timestamp
      return True
    if event.attribute == _attribute('init_system_end'):
      self._init_system_end_time = event.timestamp
      return True
    if event.attribute == _attribute('model_fn_begin'):
      self._model_fn_begin_time = event.timestamp
      return True
    if event.attribute == _attribute('model_fn_end'):
      self._model_fn_end_time = event.timestamp
      return True
    if event.attribute == _attribute('setup_infeed_begin'):
      self._setup_infeed_begin_time = event.timestamp
      return True
    if event.attribute == _attribute('setup_infeed_end'):
      self._setup_infeed_end_time = event.timestamp
      return True
    return False

  @property
  def name(self):
    return self._session_name

  @property
  def session_begin_time(self):
    return self._session_begin_time

  @session_begin_time.setter
  def session_begin_time(self, t):
    self._session_begin_time = t

  @property
  def session_end_time(self):
    return self._session_end_time

  @session_end_time.setter
  def session_end_time(self, t):
    self._session_end_time = t

  def session_duration(self):
    if self.begin_and_end_times_set():
      return max(self._session_end_time - self._session_begin_time, 0)
    return 0

  def gap_session_begin_init_system_begin(self):
    if (self._session_begin_time is not None and
        self._init_system_begin_time is not None):
      return max(self._init_system_begin_time - self._session_begin_time, 0)
    return 0

  def init_system_duration(self):
    if (self._init_system_begin_time is not None and
        self._init_system_end_time is not None):
      return max(self._init_system_end_time - self._init_system_begin_time, 0)
    return 0

  def gap_init_system_end_model_fn_begin(self):
    if (self._init_system_end_time is not None and
        self._model_fn_begin_time is not None):
      return max(self._model_fn_begin_time - self._init_system_end_time, 0)
    return 0

  def setup_infeed_duration(self):
    if (self._setup_infeed_begin_time is not None and
        self._setup_infeed_end_time is not None):
      return max(self._setup_infeed_end_time - self._setup_infeed_begin_time, 0)
    return 0

  def model_fn_duration(self):
    if (self._model_fn_begin_time is not None and
        self._model_fn_end_time is not None):
      model_fn_entire_duration = (self._model_fn_end_time -
                                  self._model_fn_begin_time)
      return max(model_fn_entire_duration - self.setup_infeed_duration(), 0)
    return 0


def _fill_session_begin_end_times(session_times, events):
  """Fills the begin and end times in session_times from events."""

  for e in events:
    if e.attribute == _attribute('train_begin'):
      session_times['train'].session_begin_time = e.timestamp
    if e.attribute == _attribute('train_end'):
      session_times['train'].session_end_time = e.timestamp
    if e.attribute == _attribute('eval_begin'):
      session_times['eval'].session_begin_time = e.timestamp
    if e.attribute == _attribute('eval_end'):
      session_times['eval'].session_end_time = e.timestamp
    if e.attribute == _attribute('predict_begin'):
      session_times['predict'].session_begin_time = e.timestamp
    if e.attribute == _attribute('predict_end'):
      session_times['predict'].session_end_time = e.timestamp

  for _, sess in six.iteritems(session_times):
    if not sess.begin_and_end_times_set():
      print(
        'Either or both the begin and end time'
        ' of session "%s" is not set'%sess.name
      )
    if sess.session_begin_time > sess.session_end_time:
      print(
        'Session begin time (%d) is bigger than session'
        ' end time (%d) for session "%s"'%(
            sess.session_begin_time, sess.session_end_time, sess.name)
      )


def _assign_events_to_sessions(session_times, events):
  """Assigns events to the corresponding sessions."""

  for e in events:
    if e.attribute in set([_attribute('train_begin'),
                           _attribute('train_end'),
                           _attribute('eval_begin'),
                           _attribute('eval_end'),
                           _attribute('predict_begin'),
                           _attribute('predict_end')]):
      continue
    assigned = False
    for _, sess in six.iteritems(session_times):
      if sess.event_assigned(e):
        assigned = True
        break
    if not assigned:
      print('Event "%s" is not assigned to any session'%e.attribute)

  for _, sess in six.iteritems(session_times):
    if not sess.all_times_set():
      print('Not all the times in session "%s" are set'%sess.name)


class EndToEndBreakDown(object):
  """End-to-end breakdown of the run time of a TF job."""

  def __init__(self, events):
    session_times = {}
    session_times['train'] = SessionTimeBreakDown('train')
    session_times['eval'] = SessionTimeBreakDown('eval')
    session_times['predict'] = SessionTimeBreakDown('predict')

    _fill_session_begin_end_times(session_times, events)
    _assign_events_to_sessions(session_times, events)

    # All times are in milliseconds.
    self._gap_train_begin_init_system_begin = 0
    self._init_system_duration = 0
    self._gap_init_system_end_model_fn_begin = 0
    self._setup_infeed_duration = 0
    self._model_fn_duration = 0
    self._train_duration = 0
    self._gap_eval_begin_last_session_end = 0
    self._eval_duration = 0
    self._gap_predict_begin_last_session_end = 0
    self._predict_duration = 0
    self._compute(session_times['train'],
                  session_times['eval'],
                  session_times['predict'])

  def _compute(self, train_sess, eval_sess, predict_sess):
    """Calculates the breakdown given the three session-timings."""

    if train_sess.session_duration() != 0:
      # Has train session.
      self._gap_train_begin_init_system_begin = (
          train_sess.gap_session_begin_init_system_begin())
      self._init_system_duration = train_sess.init_system_duration()
      self._gap_init_system_end_model_fn_begin = (
          train_sess.gap_init_system_end_model_fn_begin())
      self._setup_infeed_duration = train_sess.setup_infeed_duration()
      self._model_fn_duration = train_sess.model_fn_duration()
      self._train_duration = train_sess.session_duration()

    if eval_sess.session_duration() != 0:
      # Has eval session.
      if train_sess.session_duration() == 0:
        # No train session.
        self._eval_duration = eval_sess.session_duration()
      else:
        # Has train session.
        if train_sess.session_end_time < eval_sess.session_begin_time:
          # No overlap between the train and eval sessions.
          self._gap_eval_begin_last_session_end = (
              eval_sess.session_begin_time - train_sess.session_end_time)
          self._eval_duration = eval_sess.session_duration()
        else:
          # eval_sess begins before the end of train_sess
          self._gap_eval_begin_last_session_end = 0
          if eval_sess.session_end_time <= train_sess.session_end_time:
            # eval_sess is totally overlapped with the train_sess.
            # So, treat the eval session as "free".
            self._eval_duration = 0
          else:
            # Part of the eval duration that is not overlapped with train.
            self._eval_duration = (eval_sess.session_end_time
                                   - train_sess.session_end_time)

    if predict_sess.session_duration() != 0:
      # Has predict session.
      last_sess = None
      if eval_sess.session_duration() != 0:
        last_sess = eval_sess
      elif train_sess.session_duration() != 0:
        last_sess = train_sess
      if last_sess is None:
        # no session before the predict session.
        self._predict_duration = predict_sess.session_duration()
      else:
        # predict session has a session run before it.
        if last_sess.session_end_time < predict_sess.session_begin_time:
          # No overlap between the last and eval sessions.
          self._gap_predict_begin_last_session_end = (
              predict_sess.session_begin_time
              - last_sess.session_end_time)
          self._predict_duration = predict_sess.session_duration()
        else:
          # predict_sess begins before the end of last_sess
          self._gap_predict_begin_last_session_end = 0
          if predict_sess.session_end_time <= last_sess.session_end_time:
            # predict_sess is totally overlapped with the last_sess.
            # So, treat predict_sess as free.
            self._predict_duration = 0
          else:
            # Part of the predict duration that is not overlapped
            # with the last sess.
            self._predict_duration = (predict_sess.session_end_time
                                      - last_sess.session_end_time)

  def output(self):
    """Generates output for plotting a stacked bar chart in Google Charts"""

    return [
        ["Category",
         "beginning to init-system's start",
         "init-system",
         "init-system's end to model-fn's start",
         "model-fn",
         "setup-infeed",
         "training",
         "training's end to eval's start",
         "eval",
         "eval's end to predict's start",
         "predict",
         {"role": "annotation"},
        ],
        ["",
         self._gap_train_begin_init_system_begin,
         self._init_system_duration,
         self._gap_init_system_end_model_fn_begin,
         self._model_fn_duration,
         self._setup_infeed_duration,
         self._train_duration,
         self._gap_eval_begin_last_session_end,
         self._eval_duration,
         self._gap_predict_begin_last_session_end,
         self._predict_duration,
         "",
        ]
    ]
