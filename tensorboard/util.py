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

"""TensorBoard helper routine module.

This module is a trove of succinct generic helper routines that don't
pull in any heavyweight dependencies aside from TensorFlow.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import locale
import logging
import os
import re
import sys
import threading
import time

import numpy as np
import six
import tensorflow as tf


def setup_logging(streams=(sys.stderr,)):
  """Configures Python logging the way the TensorBoard team likes it.

  This should be called exactly once at the beginning of main().

  Args:
    streams: An iterable of open files. Logs are written to each.

  :type streams: tuple[file]
  """
  # NOTE: Adding a level parameter to this method would be a bad idea
  #       because Python and ABSL disagree on the level numbers.
  locale.setlocale(locale.LC_ALL, '')
  tf.logging.set_verbosity(tf.logging.WARN)
  # TODO(jart): Make the default TensorFlow logger behavior great again.
  logging.currentframe = _hack_the_main_frame
  handlers = [LogHandler(s) for s in streams]
  formatter = LogFormatter()
  for handler in handlers:
    handler.setFormatter(formatter)
  tensorflow_logger = logging.getLogger('tensorflow')
  tensorflow_logger.handlers = handlers
  tensorboard_logger = logging.getLogger('tensorboard')
  tensorboard_logger.handlers = handlers
  werkzeug_logger = logging.getLogger('werkzeug')
  werkzeug_logger.setLevel(logging.WARNING)
  werkzeug_logger.handlers = handlers


def closeable(class_):
  """Makes a class with a close method able to be a context manager.

  This decorator is a great way to avoid having to choose between the
  boilerplate of __enter__ and __exit__ methods, versus the boilerplate
  of using contextlib.closing on every with statement.

  Args:
    class_: The class being decorated.

  Raises:
    ValueError: If class didn't have a close method, or already
        implements __enter__ or __exit__.
  """
  if 'close' not in class_.__dict__:
    # coffee is for closers
    raise ValueError('Class does not define a close() method: %s' % class_)
  if '__enter__' in class_.__dict__ or '__exit__' in class_.__dict__:
    raise ValueError('Class already defines __enter__ or __exit__: ' + class_)
  class_.__enter__ = lambda self: self
  class_.__exit__ = lambda self, t, v, b: self.close() and None
  return class_


def close_all(resources):
  """Safely closes multiple resources.

  The close method on all resources is guaranteed to be called. If
  multiple close methods throw exceptions, then the first will be
  raised and the rest will be logged.

  Args:
    resources: An iterable of object instances whose classes implement
        the close method.

  Raises:
    Exception: To rethrow the last exception raised by a close method.
  """
  exc_info = None
  for resource in resources:
    try:
      resource.close()
    except Exception as e:  # pylint: disable=broad-except
      if exc_info is not None:
        tf.logging.error('Suppressing close(%s) failure: %s', resource, e,
                         exc_info=exc_info)
      exc_info = sys.exc_info()
  if exc_info is not None:
    six.reraise(*exc_info)


def guarded_by(field):
  """Indicates method should be called from within a lock.

  This decorator is purely for documentation purposes. It has the same
  semantics as Java's @GuardedBy annotation.

  Args:
    field: The string name of the lock field, e.g. "_lock".
  """
  del field
  return lambda method: method


class Retrier(object):
  """Helper class for retrying things with exponential back-off."""

  DELAY = 0.1

  def __init__(self, is_transient, max_attempts=8, sleep=time.sleep):
    """Creates new instance.

    :type is_transient: (Exception) -> bool
    :type max_attempts: int
    :type sleep: (float) -> None
    """
    self._is_transient = is_transient
    self._max_attempts = max_attempts
    self._sleep = sleep

  def run(self, callback):
    """Invokes callback, retrying on transient exceptions.

    After the first failure, we wait 100ms, and then double with each
    subsequent failed attempt. The default max attempts is 8 which
    equates to about thirty seconds of sleeping total.

    :type callback: () -> T
    :rtype: T
    """
    failures = 0
    while True:
      try:
        return callback()
      except Exception as e:  # pylint: disable=broad-except
        failures += 1
        if failures == self._max_attempts or not self._is_transient(e):
          raise
        tf.logging.warn('Retrying on transient %s', e)
        self._sleep(2 ** (failures - 1) * Retrier.DELAY)


class LogFormatter(logging.Formatter):
  """Google style log formatter.

  The format is in essence the following:

      [DIWEF]mmdd hh:mm:ss.uuuuuu thread_name file:line] msg

  This class is meant to be used with LogHandler.
  """

  DATE_FORMAT = '%m%d %H:%M:%S'
  LOG_FORMAT = ('%(levelname)s%(asctime)s %(threadName)s '
                '%(filename)s:%(lineno)d] %(message)s')

  LEVEL_NAMES = {
      logging.FATAL: 'F',
      logging.ERROR: 'E',
      logging.WARN: 'W',
      logging.INFO: 'I',
      logging.DEBUG: 'D',
  }

  def __init__(self):
    """Creates new instance."""
    super(LogFormatter, self).__init__(LogFormatter.LOG_FORMAT,
                                       LogFormatter.DATE_FORMAT)

  def format(self, record):
    """Formats the log record.

    :type record: logging.LogRecord
    :rtype: str
    """
    record.levelname = LogFormatter.LEVEL_NAMES[record.levelno]
    return super(LogFormatter, self).format(record)

  def formatTime(self, record, datefmt=None):
    """Return creation time of the specified LogRecord as formatted text.

    This override adds microseconds.

    :type record: logging.LogRecord
    :rtype: str
    """
    return (super(LogFormatter, self).formatTime(record, datefmt) +
            '.%06d' % (record.created * 1e6 % 1e6))


class Ansi(object):
  """ANSI terminal codes container."""

  ESCAPE = '\x1b['
  ESCAPE_PATTERN = re.compile(re.escape(ESCAPE) + r'\??(?:\d+)(?:;\d+)*[mlh]')
  RESET = ESCAPE + '0m'
  BOLD = ESCAPE + '1m'
  FLIP = ESCAPE + '7m'
  RED = ESCAPE + '31m'
  YELLOW = ESCAPE + '33m'
  MAGENTA = ESCAPE + '35m'
  CURSOR_HIDE = ESCAPE + '?25l'
  CURSOR_SHOW = ESCAPE + '?25h'


class LogHandler(logging.StreamHandler):
  """Log handler that supports ANSI colors and ephemeral records.

  Colors are applied on a line-by-line basis to non-INFO records. The
  goal is to help the user visually distinguish meaningful information,
  even when logging is verbose.

  This handler will also strip ANSI color codes from emitted log
  records automatically when the output stream is not a terminal.

  Ephemeral log records are only emitted to a teletype emulator, only
  display on the final row, and get overwritten as soon as another
  ephemeral record is outputted. Ephemeral records are also sticky. If
  a normal record is written then the previous ephemeral record is
  restored right beneath it. When an ephemeral record with an empty
  message is emitted, then the last ephemeral record turns into a
  normal record and is allowed to spool.

  This class is thread safe.
  """

  EPHEMERAL = '.ephemeral'  # Name suffix for ephemeral loggers.

  COLORS = {
      logging.FATAL: Ansi.BOLD + Ansi.RED,
      logging.ERROR: Ansi.RED,
      logging.WARN: Ansi.YELLOW,
      logging.INFO: '',
      logging.DEBUG: Ansi.MAGENTA,
  }

  def __init__(self, stream, type_='detect'):
    """Creates new instance.

    Args:
      stream: A file-like object.
      type_: If "detect", will call stream.isatty() and perform system
          checks to determine if it's safe to output ANSI terminal
          codes. If type is "ansi" then this forces the use of ANSI
          terminal codes.

    Raises:
      ValueError: If type is not "detect" or "ansi".
    """
    if type_ not in ('detect', 'ansi'):
      raise ValueError('type should be detect or ansi')
    super(LogHandler, self).__init__(stream)
    self._stream = stream
    self._disable_flush = False
    self._is_tty = (type_ == 'ansi' or
                    (hasattr(stream, 'isatty') and
                     stream.isatty() and
                     os.name != 'nt'))
    self._ephemeral = ''

  def emit(self, record):
    """Emits a log record.

    :type record: logging.LogRecord
    """
    self.acquire()
    try:
      is_ephemeral = record.name.endswith(LogHandler.EPHEMERAL)
      color = LogHandler.COLORS.get(record.levelno)
      if is_ephemeral:
        if self._is_tty:
          ephemeral = record.getMessage()
          if ephemeral:
            if color:
              ephemeral = color + ephemeral + Ansi.RESET
            self._clear_line()
            self._stream.write(ephemeral)
          else:
            if self._ephemeral:
              self._stream.write('\n')
          self._ephemeral = ephemeral
      else:
        self._clear_line()
        if self._is_tty and color:
          self._stream.write(color)
        self._disable_flush = True  # prevent double flush
        super(LogHandler, self).emit(record)
        self._disable_flush = False
        if self._is_tty and color:
          self._stream.write(Ansi.RESET)
        if self._ephemeral:
          self._stream.write(self._ephemeral)
      self.flush()
    finally:
      self._disable_flush = False
      self.release()

  def format(self, record):
    """Turns a log record into a string.

    :type record: logging.LogRecord
    :rtype: str
    """
    message = super(LogHandler, self).format(record)
    if not self._is_tty:
      message = Ansi.ESCAPE_PATTERN.sub('', message)
    return message

  def flush(self):
    """Flushes output stream."""
    self.acquire()
    try:
      if not self._disable_flush:
        super(LogHandler, self).flush()
    finally:
      self.release()

  def _clear_line(self):
    if self._is_tty and self._ephemeral:
      # We're counting columns in the terminal, not bytes. So we don't
      # want to take UTF-8 or color codes into consideration.
      text = Ansi.ESCAPE_PATTERN.sub('', tf.compat.as_text(self._ephemeral))
      self._stream.write('\r' + ' ' * len(text) + '\r')


def _hack_the_main_frame():
  """Returns caller frame and skips over tf_logging.

  This works around a bug in TensorFlow's open source logging module
  where the Python logging module attributes log entries to the
  delegate functions in tf_logging.py.
  """
  if hasattr(sys, '_getframe'):
    frame = sys._getframe(3)
  else:
    try:
      raise Exception
    except Exception:  # pylint: disable=broad-except
      frame = sys.exc_info()[2].tb_frame.f_back
  if (frame is not None and
      hasattr(frame.f_back, 'f_code') and
      'tf_logging.py' in frame.f_back.f_code.co_filename):
    return frame.f_back
  return frame


class PersistentOpEvaluator(object):
  """Evaluate a fixed TensorFlow graph repeatedly, safely, efficiently.

  Extend this class to create a particular kind of op evaluator, like an
  image encoder. In `initialize_graph`, create an appropriate TensorFlow
  graph with placeholder inputs. In `run`, evaluate this graph and
  return its result. This class will manage a singleton graph and
  session to preserve memory usage, and will ensure that this graph and
  session do not interfere with other concurrent sessions.

  A subclass of this class offers a threadsafe, highly parallel Python
  entry point for evaluating a particular TensorFlow graph.

  Example usage:

      class FluxCapacitanceEvaluator(PersistentOpEvaluator):
        \"\"\"Compute the flux capacitance required for a system.

        Arguments:
          x: Available power input, as a `float`, in jigawatts.

        Returns:
          A `float`, in nanofarads.
        \"\"\"

        def initialize_graph(self):
          self._placeholder = tf.placeholder(some_dtype)
          self._op = some_op(self._placeholder)

        def run(self, x):
          return self._op.eval(feed_dict: {self._placeholder: x})

      evaluate_flux_capacitance = FluxCapacitanceEvaluator()

      for x in xs:
        evaluate_flux_capacitance(x)
  """

  def __init__(self):
    super(PersistentOpEvaluator, self).__init__()
    self._session = None
    self._initialization_lock = threading.Lock()

  def _lazily_initialize(self):
    """Initialize the graph and session, if this has not yet been done."""
    with self._initialization_lock:
      if self._session:
        return
      graph = tf.Graph()
      with graph.as_default():
        self.initialize_graph()
      # Don't reserve GPU because libpng can't run on GPU.
      config = tf.ConfigProto(device_count={'GPU': 0})
      self._session = tf.Session(graph=graph, config=config)

  def initialize_graph(self):
    """Create the TensorFlow graph needed to compute this operation.

    This should write ops to the default graph and return `None`.
    """
    raise NotImplementedError('Subclasses must implement "initialize_graph".')

  def run(self, *args, **kwargs):
    """Evaluate the ops with the given input.

    When this function is called, the default session will have the
    graph defined by a previous call to `initialize_graph`. This
    function should evaluate any ops necessary to compute the result of
    the query for the given *args and **kwargs, likely returning the
    result of a call to `some_op.eval(...)`.
    """
    raise NotImplementedError('Subclasses must implement "run".')

  def __call__(self, *args, **kwargs):
    self._lazily_initialize()
    with self._session.as_default():
      return self.run(*args, **kwargs)


class _TensorFlowPngEncoder(PersistentOpEvaluator):
  """Encode an image to PNG.

  This function is thread-safe, and has high performance when run in
  parallel. See `encode_png_benchmark.py` for details.

  Arguments:
    image: A numpy array of shape `[height, width, channels]`, where
      `channels` is 1, 3, or 4, and of dtype uint8.

  Returns:
    A bytestring with PNG-encoded data.
  """

  def __init__(self):
    super(_TensorFlowPngEncoder, self).__init__()
    self._image_placeholder = None
    self._encode_op = None

  def initialize_graph(self):
    self._image_placeholder = tf.placeholder(
        dtype=tf.uint8, name='image_to_encode')
    self._encode_op = tf.image.encode_png(self._image_placeholder)

  def run(self, image):  # pylint: disable=arguments-differ
    if not isinstance(image, np.ndarray):
      raise ValueError("'image' must be a numpy array: %r" % image)
    if image.dtype != np.uint8:
      raise ValueError("'image' dtype must be uint8, but is %r" % image.dtype)
    return self._encode_op.eval(feed_dict={self._image_placeholder: image})


encode_png = _TensorFlowPngEncoder()


class _TensorFlowWavEncoder(PersistentOpEvaluator):
  """Encode an audio clip to WAV.

  This function is thread-safe and exhibits good parallel performance.

  Arguments:
    audio: A numpy array of shape `[samples, channels]`.
    samples_per_second: A positive `int`, in Hz.

  Returns:
    A bytestring with WAV-encoded data.
  """

  def __init__(self):
    super(_TensorFlowWavEncoder, self).__init__()
    self._audio_placeholder = None
    self._samples_per_second_placeholder = None
    self._encode_op = None

  def initialize_graph(self):
    self._audio_placeholder = tf.placeholder(
        dtype=tf.float32, name='image_to_encode')
    self._samples_per_second_placeholder = tf.placeholder(
        dtype=tf.int32, name='samples_per_second')
    self._encode_op = tf.contrib.ffmpeg.encode_audio(
        self._audio_placeholder,
        file_format='wav',
        samples_per_second=self._samples_per_second_placeholder)

  def run(self, audio, samples_per_second):  # pylint: disable=arguments-differ
    if not isinstance(audio, np.ndarray):
      raise ValueError("'audio' must be a numpy array: %r" % audio)
    if not isinstance(samples_per_second, int):
      raise ValueError("'samples_per_second' must be an int: %r"
                       % samples_per_second)
    feed_dict = {
        self._audio_placeholder: audio,
        self._samples_per_second_placeholder: samples_per_second,
    }
    return self._encode_op.eval(feed_dict=feed_dict)


encode_wav = _TensorFlowWavEncoder()
