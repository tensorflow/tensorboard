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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import functools
import logging
import time

import six
import numpy as np
import tensorflow as tf

from tensorboard import test_util
from tensorboard import util


class LogFormatterTest(tf.test.TestCase):

  def __init__(self, *args, **kwargs):
    super(LogFormatterTest, self).__init__(*args, **kwargs)
    self.clock = test_util.FakeClock()
    self.stubs = tf.test.StubOutForTesting()
    self.formatter = util.LogFormatter()
    self.formatter.converter = time.gmtime

  def setUp(self):
    super(LogFormatterTest, self).setUp()
    self.clock.set_time(1.0)
    self.stubs.Set(time, 'time', self.clock)

  def tearDown(self):
    self.stubs.CleanUp()
    super(LogFormatterTest, self).tearDown()

  def testTimeZero(self):
    self.clock.set_time(0.0)
    record = make_record(logging.INFO, 'hello %s', 'world')
    self.assertEqual(
        'I0101 00:00:00.000000 %s util_test.py:23] hello world' % (
            record.threadName),
        self.formatter.format(record))

  def testTimeNonZero_padsZeroWithNoFloatMathError(self):
    self.clock.set_time(1.0 * 31 * 24 * 60 * 60 +
                        2.0 * 24 * 60 * 60 +
                        4.0 * 60 * 60 +
                        5.0 * 60 +
                        6.0 +
                        1e-6)
    record = make_record(logging.WARNING, '%d %d', 123, 456)
    self.assertEqual(
        'W0203 04:05:06.000001 %s util_test.py:23] 123 456' % (
            record.threadName),
        self.formatter.format(record))


class LogHandlerTest(tf.test.TestCase):

  def testLogToNonTerminal_doesNothingFancy(self):
    stream = six.StringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('BOO! %(message)s'))
    handler.emit(make_record(logging.INFO, 'hi'))
    self.assertEqual('BOO! hi\n', stream.getvalue())

  def testLogInfoToTerminal_doesNothingFancy(self):
    stream = TerminalStringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('BOO! %(message)s'))
    handler.emit(make_record(logging.INFO, 'hi'))
    self.assertEqual('BOO! hi\n', stream.getvalue())

  def testLogErrorToTerminal_isRed(self):
    stream = TerminalStringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('BOO! %(message)s'))
    handler.emit(make_record(logging.ERROR, 'hi'))
    self.assertEqual(util.Ansi.RED + 'BOO! hi\n' + util.Ansi.RESET,
                     stream.getvalue())

  def testLogEphemeral_doesntCallFormatterOrInsertLineFeed(self):
    stream = TerminalStringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('BOO! %(message)s'))
    handler.emit(make_ephemeral_record(logging.INFO, 'hi'))
    self.assertEqual('hi', stream.getvalue())

  def testEmitEmptyEphemeral_closesEphemeralState(self):
    stream = TerminalStringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('BOO! %(message)s'))
    handler.emit(make_ephemeral_record(logging.INFO, 'hi'))
    handler.emit(make_ephemeral_record(logging.INFO, ''))
    self.assertEqual('hi\n', stream.getvalue())

  def testCloseEphemeralWithNoEphemeralState_doesNothing(self):
    stream = TerminalStringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('BOO! %(message)s'))
    handler.emit(make_ephemeral_record(logging.INFO, ''))
    self.assertEqual('', stream.getvalue())

  def testLogEphemeralTwice_overwritesPreviousLine(self):
    stream = TerminalStringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('BOO! %(message)s'))
    handler.emit(make_ephemeral_record(logging.INFO, 'hi'))
    handler.emit(make_ephemeral_record(logging.INFO, 'hi'))
    self.assertEqual('hi\r  \rhi', stream.getvalue())

  def testLogEphemeralAndNormal_ressurectsEphemeralRecord(self):
    stream = TerminalStringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('BOO! %(message)s'))
    handler.emit(make_ephemeral_record(logging.INFO, 'hi'))
    handler.emit(make_record(logging.INFO, 'yo'))
    self.assertEqual('hi\r  \rBOO! yo\nhi', stream.getvalue())

  def testCloseEphemeralAndLogNormal_doesntRessurect(self):
    stream = TerminalStringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('BOO! %(message)s'))
    handler.emit(make_ephemeral_record(logging.INFO, 'hi'))
    handler.emit(make_ephemeral_record(logging.INFO, ''))
    handler.emit(make_record(logging.INFO, 'yo'))
    self.assertEqual('hi\nBOO! yo\n', stream.getvalue())

  def testLogAnsiCodesWhenNotLoggingToATerminal_stripsAnsiCodes(self):
    stream = six.StringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('%(message)s'))
    handler.emit(make_record(logging.INFO, util.Ansi.RED + 'hi'))
    self.assertEqual('hi\n', stream.getvalue())

  def testLogAnsiCodesWhenLoggingToATerminal_keepsAnsiCodes(self):
    stream = TerminalStringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('%(message)s'))
    handler.emit(make_record(logging.INFO, util.Ansi.RED + 'hi'))
    self.assertEqual(util.Ansi.RED + 'hi\n', stream.getvalue())

  def testLogEphemeralOnNonTerminal_doesNothing(self):
    stream = six.StringIO()
    handler = util.LogHandler(stream)
    handler.setFormatter(logging.Formatter('%(message)s'))
    handler.emit(make_ephemeral_record(logging.INFO, 'hi'))
    self.assertEqual('', stream.getvalue())


class RetrierTest(test_util.TestCase):

  def __init__(self, *args, **kwargs):
    super(RetrierTest, self).__init__(*args, **kwargs)
    self.clock = test_util.FakeClock()
    self.sleep = test_util.FakeSleep(self.clock)
    self.Retrier = functools.partial(util.Retrier, sleep=self.sleep)

  def testOneMaxAttempt_justDelegates(self):
    retrier = self.Retrier(max_attempts=1, is_transient=lambda e: True)
    self.assertIsNone(retrier.run(lambda: None))
    self.assertEqual('hello', retrier.run(lambda: 'hello'))
    with self.assertRaises(ValueError):
      retrier.run(FailThenSucceed(raises=[ValueError]))
    self.assertEqual(0.0, self.clock.get_time())

  def testThreeFailures_hasExponentialDelayAndRecovers(self):
    retrier = self.Retrier(max_attempts=4, is_transient=lambda e: True)
    callback = FailThenSucceed(raises=[Exception, Exception, Exception],
                               returns=['hi'])
    self.assertEqual('hi', retrier.run(callback))
    self.assertEqual((1 + 2 + 4) * util.Retrier.DELAY, self.clock.get_time())

  def testNotATransientError_doesntRetry(self):
    retrier = self.Retrier(is_transient=lambda e: isinstance(e, IOError))
    with self.assertRaises(ValueError):
      retrier.run(FailThenSucceed(raises=[ValueError]))
    self.assertEqual(0.0, self.clock.get_time())
    self.assertTrue(retrier.run(FailThenSucceed(raises=[IOError])))
    self.assertEqual(util.Retrier.DELAY, self.clock.get_time())


class FailThenSucceed(object):
  def __init__(self, raises=(Exception,), returns=(True,)):
    self._raises = list(raises)
    self._returns = list(returns)

  def __call__(self):
    if self._raises:
      raise self._raises.pop(0)
    return self._returns.pop(0)


def make_record(level, msg, *args):
  record = logging.LogRecord(
      name='tensorflow',
      level=level,
      pathname=__file__,
      lineno=23,
      msg=msg,
      args=args,
      exc_info=None)
  return record


def make_ephemeral_record(level, msg, *args):
  record = make_record(level, msg, *args)
  record.name = 'tensorflow' + util.LogHandler.EPHEMERAL
  return record


def TerminalStringIO():
  stream = six.StringIO()
  stream.isatty = lambda: True
  return stream


class PersistentOpEvaluatorTest(tf.test.TestCase):

  def setUp(self):
    super(PersistentOpEvaluatorTest, self).setUp()

    patch = tf.test.mock.patch('tensorflow.Session', wraps=tf.Session)
    patch.start()
    self.addCleanup(patch.stop)

    class Squarer(util.PersistentOpEvaluator):

      def __init__(self):
        super(Squarer, self).__init__()
        self._input = None
        self._squarer = None

      def initialize_graph(self):
        self._input = tf.placeholder(tf.int32)
        self._squarer = tf.square(self._input)

      def run(self, xs):  # pylint: disable=arguments-differ
        return self._squarer.eval(feed_dict={self._input: xs})

    self._square = Squarer()

  def test_preserves_existing_session(self):
    with tf.Session() as sess:
      op = tf.reduce_sum([2, 2])
      self.assertIs(sess, tf.get_default_session())

      result = self._square(123)
      self.assertEqual(123 * 123, result)

      self.assertIs(sess, tf.get_default_session())
      number_of_lights = sess.run(op)
      self.assertEqual(number_of_lights, 4)

  def test_lazily_initializes_sessions(self):
    self.assertEqual(tf.Session.call_count, 0)

  def test_reuses_sessions(self):
    self._square(123)
    self.assertEqual(tf.Session.call_count, 1)
    self._square(234)
    self.assertEqual(tf.Session.call_count, 1)


class TensorFlowPngEncoderTest(tf.test.TestCase):

  def setUp(self):
    super(TensorFlowPngEncoderTest, self).setUp()
    self._encode = util._TensorFlowPngEncoder()
    self._rgb = np.arange(12 * 34 * 3).reshape((12, 34, 3)).astype(np.uint8)
    self._rgba = np.arange(21 * 43 * 4).reshape((21, 43, 4)).astype(np.uint8)

  def _check_png(self, data):
    # If it has a valid PNG header and is of a reasonable size, we can
    # assume it did the right thing. We trust the underlying
    # `encode_png` op.
    self.assertEqual(b'\x89PNG', data[:4])
    self.assertGreater(len(data), 128)

  def test_invalid_non_numpy(self):
    with six.assertRaisesRegex(self, ValueError, "must be a numpy array"):
      self._encode(self._rgb.tolist())

  def test_invalid_non_uint8(self):
    with six.assertRaisesRegex(self, ValueError, "dtype must be uint8"):
      self._encode(self._rgb.astype(np.float32))

  def test_encodes_png(self):
    data = self._encode(self._rgb)
    self._check_png(data)

  def test_encodes_png_with_alpha(self):
    data = self._encode(self._rgba)
    self._check_png(data)


class TensorFlowWavEncoderTest(tf.test.TestCase):

  def setUp(self):
    super(TensorFlowWavEncoderTest, self).setUp()
    self._encode = util._TensorFlowWavEncoder()
    space = np.linspace(0.0, 100.0, 44100)
    self._stereo = np.array([np.sin(space), np.cos(space)]).transpose()
    self._mono = self._stereo.mean(axis=1, keepdims=True)

  def _check_wav(self, data):
    # If it has a valid WAV/RIFF header and is of a reasonable size, we
    # can assume it did the right thing. We trust the underlying
    # `encode_audio` op.
    self.assertEqual(b'RIFF', data[:4])
    self.assertGreater(len(data), 128)

  def test_encodes_mono_wav(self):
    self._check_wav(self._encode(self._mono, samples_per_second=44100))

  def test_encodes_stereo_wav(self):
    self._check_wav(self._encode(self._stereo, samples_per_second=44100))


if __name__ == '__main__':
  tf.test.main()
