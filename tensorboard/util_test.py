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

import logging
import time

import six
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


if __name__ == '__main__':
  tf.test.main()
