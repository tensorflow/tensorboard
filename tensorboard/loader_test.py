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
import contextlib
import locale
from operator import itemgetter
import os
import tempfile

import numpy as np
import six
import tensorflow as tf
from tensorflow.core.framework import tensor_pb2
from tensorflow.core.framework import types_pb2

from tensorboard import db
from tensorboard import loader
from tensorboard import test_util
from tensorboard import util


class LoaderTestCase(test_util.TestCase):
  def __init__(self, *args, **kwargs):
    super(LoaderTestCase, self).__init__(*args, **kwargs)
    self.clock = test_util.FakeClock()
    self.sleep = test_util.FakeSleep(self.clock)

  def _save_string(self, name, data):
    """Writes new file to temp directory.

    :type name: str
    :type data: str
    """
    path = os.path.join(self.get_temp_dir(), name)
    with open(path, 'wb') as writer:
      writer.write(tf.compat.as_bytes(data))
    return path

  def _save_records(self, name, records):
    """Writes new record file to temp directory.

    :type name: str
    :type records: list[str]
    :rtype: str
    """
    path = os.path.join(self.get_temp_dir(), name)
    with RecordWriter(path) as writer:
      for record in records:
        writer.write(record)
    return path


class RecordReaderTest(LoaderTestCase):
  RecordReader = loader.RecordReader

  def testNoReads_closeWorks(self):
    path = self._save_records('empty.records', [])
    self.RecordReader(path).close()

  def testClose_canBeCalledMultipleTimes(self):
    path = self._save_records('empty.records', [])
    reader = self.RecordReader(path)
    reader.close()
    reader.close()

  def testEmptyFile_returnsNoneRecords(self):
    path = self._save_records('empty.records', [])
    with self.RecordReader(path) as reader:
      self.assertIsNone(reader.get_next_record())
      self.assertIsNone(reader.get_next_record())

  def testGetNextRecord_worksWithGoodOffsets(self):
    path = self._save_records('foobar.records', ['foo', 'bar'])
    with self.RecordReader(path) as reader:
      record1 = reader.get_next_record()
      self.assertEqual(b'foo', record1.record)
      self.assertGreater(record1.offset, 0)
      record2 = reader.get_next_record()
      self.assertEqual(b'bar', record2.record)
      self.assertGreater(record2.offset, record1.offset)
      record3 = reader.get_next_record()
      self.assertIsNone(record3)

  def testEmptyFile_sizeIsZero(self):
    path = self._save_records('empty.records', [])
    with self.RecordReader(path) as reader:
      self.assertEqual(0, reader.get_size())

  def testOneRecord_sizeIsGreaterThanRecord(self):
    path = self._save_records('foo.records', ['foo'])
    with self.RecordReader(path) as reader:
      self.assertGreater(reader.get_size(), 3)

  def testStartOffset_resumesReading(self):
    path = self._save_records('foobar.records', ['foo', 'bar'])
    with self.RecordReader(path) as reader:
      start_offset = reader.get_next_record().offset
    with self.RecordReader(path, start_offset) as reader:
      self.assertEqual(b'bar', reader.get_next_record().record)

  def testCorruptRecord_raisesDataLossError(self):
    path = self._save_string('foobar.records', 'abcd' * 4)
    with self.RecordReader(path) as reader:
      with self.assertRaises(tf.errors.DataLossError):
        self.assertEqual(b'foo', reader.get_next_record())

  def testFileShrunk_raisesIoError(self):
    path = self._save_records('foobar.records', ['foo'])
    with self.RecordReader(path) as reader:
      reader.get_next_record()
      self._save_string('foobar.records', '~~~')
      with self.assertRaises(IOError):
        reader.get_next_record()
        reader.get_size()

  # TODO(jart): Test append behavior when PyRecordWriter supports flush.


class BufferedRecordReaderTest(RecordReaderTest):
  RecordReader = functools.partial(loader.BufferedRecordReader, stat_interval=0)


class BufferedRecordReaderSmallReadAheadTest(RecordReaderTest):
  RecordReader = functools.partial(loader.BufferedRecordReader,
                                   read_ahead=1,
                                   stat_interval=0)


class ProgressTest(LoaderTestCase):

  EMPTY_BAR = loader.Progress.BLOCK_LIGHT * loader.Progress.BAR_WIDTH
  HALF_BAR = (loader.Progress.BLOCK_DARK * (loader.Progress.BAR_WIDTH // 2) +
              EMPTY_BAR[loader.Progress.BAR_WIDTH // 2:])

  def __init__(self, *args, **kwargs):
    super(ProgressTest, self).__init__(*args, **kwargs)
    self.logs = []  # type: list[str]
    self.bars = []  # type: list[str]
    self.RateCounter = functools.partial(loader.RateCounter, clock=self.clock)
    self.progress = loader.Progress(
        clock=self.clock,
        sleep=self.sleep,
        log_callback=self._on_log,
        bar_callback=self._on_bar,
        rate_counter_factory=self.RateCounter)

  def testFirstUpdate_neversEmits(self):
    self.progress.set_progress(1, 10)
    self.assertEqual([], self.logs)
    self.assertEqual([], self.bars)

  def testSecondUpdateButNoTimeElapsed_doesntEmit(self):
    self.progress.set_progress(1, 10)
    self.progress.set_progress(2, 10)
    self.assertEqual([], self.logs)
    self.assertEqual([], self.bars)

  def testBarTimeElapsed_logsBarButNotLog(self):
    self.progress.set_progress(0, 10)
    self.clock.advance(loader.Progress.BAR_INTERVAL_SECONDS)
    self.progress.set_progress(0, 10)
    self.assertEqual([ProgressTest.EMPTY_BAR + ' 0% of 10 '], self.bars)
    self.assertEqual([], self.logs)

  def testLogTimeElapsed_logsBarAndLog(self):
    self.progress.set_progress(0, 10)
    self.clock.advance(loader.Progress.LOG_INTERVAL_SECONDS)
    self.progress.set_progress(0, 10)
    self.assertEqual([ProgressTest.EMPTY_BAR + ' 0% of 10 '], self.bars)
    self.assertEqual(['Loaded 0% of 10'], self.logs)

  def testClose_alwaysEmitsBothAndClearsEphemeralState(self):
    self.progress.close()
    self.assertEqual(['Loaded 0% of 0'], self.logs)
    self.assertEqual([ProgressTest.EMPTY_BAR + ' 0% of 0 ', ''], self.bars)

  def testHalfway_showsHalfBarAndProcessingRate(self):
    self.progress.set_progress(0, 10)
    self.clock.advance(1.0)
    self.progress.set_progress(5, 10)
    self.assertEqual([(ProgressTest.HALF_BAR + ' 50% of 10 ' +
                       loader.Progress.DELTA + ' 5B/s ')],
                     self.bars)

  def testHalfwayOfDoubledData(self):
    self.progress.set_progress(0, 10)
    self.clock.advance(1.0)
    self.progress.set_progress(10, 20)
    self.assertEqual([(ProgressTest.HALF_BAR + ' 50% of 20 ' +
                       loader.Progress.DELTA + ' 10B/s ' +
                       loader.Progress.NABLA + ' 10B/s ')],
                     self.bars)

  def testDataProducedFasterThanConsumed_showsMeltdownAlert(self):
    self.progress.set_progress(0, 10)
    self.clock.advance(1.0)
    self.progress.set_progress(10, 30)
    self.assertIn((u' 33% of 30 ' +
                   loader.Progress.DELTA + ' 10B/s ' +
                   loader.Progress.NABLA + ' 20B/s ' +
                   '[meltdown]'),
                  util.Ansi.ESCAPE_PATTERN.sub('', self.bars[0]))

  def testNoDataSinceLastUpdate_displaysStalledAlert(self):
    self.progress.set_progress(0, 20)
    self.clock.advance(loader.Progress.LOG_INTERVAL_SECONDS)
    self.progress.set_progress(10, 20)
    self.clock.advance(loader.Progress.LOG_INTERVAL_SECONDS)
    self.progress.set_progress(10, 20)
    self.assertIn('[stalled]', self.bars[1])
    self.assertIn('[stalled]', self.logs[1])

  def testBigNumberInAmerica_showsCommas(self):
    locale.setlocale(locale.LC_ALL, 'en_US.utf8')
    self.progress.set_progress(0, 1000000)
    self.clock.advance(1.0)
    self.progress.set_progress(1024, 1000000)
    self.progress.close()
    self.assertIn(u' of 1,000,000 ', self.bars[0])
    self.assertIn(u' 1,024B/s ', self.bars[0])

  def testBigNumberInGermany_showsCommas(self):
    try:
      locale.setlocale(locale.LC_ALL, 'de_DE.utf8')
    except Exception:
      raise self.skipTest('Environment does not support de_DE.utf8 locale')
    self.progress.set_progress(0, 1000000)
    self.clock.advance(1.0)
    self.progress.set_progress(1024, 1000000)
    self.progress.close()
    self.assertIn(u' of 1.000.000 ', self.bars[0])
    self.assertIn(u' 1.024B/s ', self.bars[0])

  def _on_log(self, format_, *args):
    self.logs.append(format_ % args)

  def _on_bar(self, format_, *args):
    self.bars.append(format_ % args)


class EventLogReaderTest(LoaderTestCase):
  EventLog = functools.partial(loader.EventLogReader,
                               record_reader_factory=loader.RecordReader)

  def testInvalidFilename_throwsException(self):
    path = self._save_records('empty.records', [])
    with self.assertRaises(ValueError):
      self.EventLog(path)

  def testEqualAndSortsByTimestampAndHost(self):
    self.assertEqual(
        [self.EventLog('events.out.tfevents.0.LOCALHOST'),
         self.EventLog('events.out.tfevents.0.localhost'),
         self.EventLog('events.out.tfevents.1.localhost')],
        sorted([self.EventLog('events.out.tfevents.1.localhost'),
                self.EventLog('events.out.tfevents.0.localhost'),
                self.EventLog('events.out.tfevents.0.LOCALHOST')]))

  def testFields(self):
    path = self._save_records('events.out.tfevents.7.localhost', [])
    with self.EventLog(path) as log:
      self.assertEqual(path, log.path)
      self.assertEqual(7, log.timestamp)
      self.assertEqual('localhost', log.hostname)

  def testNoReads_closeWorks(self):
    path = self._save_records('events.out.tfevents.0.localhost', [])
    self.EventLog(path).close()

  def testClose_canBeCalledMultipleTimes(self):
    path = self._save_records('events.out.tfevents.0.localhost', [])
    log = self.EventLog(path)
    log.close()
    log.close()

  def testEmptyFile_returnsNoneRecords(self):
    path = self._save_records('events.out.tfevents.0.localhost', [])
    with self.EventLog(path) as log:
      self.assertIsNone(log.get_next_event())
      self.assertIsNone(log.get_next_event())

  def testReadOneEvent(self):
    event = tf.Event(step=123)
    path = self._save_records('events.out.tfevents.0.localhost',
                              [event.SerializeToString()])
    with self.EventLog(path) as log:
      self.assertEqual(event, log.get_next_event())
      self.assertIsNone(log.get_next_event())


class RunReaderTest(LoaderTestCase):
  EventLog = functools.partial(loader.EventLogReader,
                               record_reader_factory=loader.RecordReader)

  def testBadRowId_throwsValueError(self):
    with self.assertRaises(ValueError):
      loader.RunReader(0, 0, 0, 'doodle')

  def testEqualAndSortsByRowId(self):
    customer_number = 27
    a = loader.RunReader(customer_number, 1, 1, 'doodle')
    b = loader.RunReader(customer_number, 1, 2, 'doodle')
    c = loader.RunReader(customer_number, 2, 1, 'doodle')
    self.assertEqual([a, b, c], sorted([c, b, a]))

  def testFields(self):
    id_ = db.RUN_ROWID.create(2, 3)
    with loader.RunReader(1, 2, 3, 'doodle') as run:
      self.assertEqual('doodle', run.name)
      self.assertEqual(1, run.customer_number)
      self.assertEqual(2, run.experiment_id)
      self.assertEqual(3, run.run_id)
      self.assertEqual(id_, run.rowid)

  def testClose_canBeCalledMultipleTimes(self):
    path = self._save_records('events.out.tfevents.0.localhost', [])
    with self.connect_db() as db_conn, self.EventLog(path) as log:
      run = loader.RunReader(1, 2, 3, 'doodle')
      run.add_event_log(db_conn, log)
      run.close()
      run.close()

  def testNoEventLogs_returnsNone(self):
    with loader.RunReader(2, 1, 1, 'doodle') as run:
      self.assertIsNone(run.get_next_event())

  def testReadOneEvent(self):
    event = tf.Event(step=123)
    path = self._save_records('events.out.tfevents.0.localhost',
                              [event.SerializeToString()])
    with self.connect_db() as db_conn:
      with self.EventLog(path) as log:
        with loader.RunReader(2, 1, 1, 'doodle') as run:
          run.add_event_log(db_conn, log)
          self.assertEqual(event, run.get_next_event())
          self.assertIsNone(run.get_next_event())

  def testProgress(self):
    event = tf.Event(step=123)
    path = self._save_records('events.out.tfevents.0.localhost',
                              [event.SerializeToString()])
    with self.connect_db() as db_conn:
      with self.EventLog(path) as log:
        with loader.RunReader(2, 1, 1, 'doodle') as run:
          run.add_event_log(db_conn, log)
          self.assertEqual(0, run.get_offset())
          self.assertGreater(run.get_size(), 0)
          self.assertEqual(event, run.get_next_event())
          self.assertIsNone(run.get_next_event())
          self.assertEqual(run.get_offset(), run.get_size())

  def testMarkReset(self):
    event1 = tf.Event(step=123)
    event2 = tf.Event(step=456)
    path1 = self._save_records('events.out.tfevents.1.localhost',
                               [event1.SerializeToString()])
    path2 = self._save_records('events.out.tfevents.2.localhost',
                               [event2.SerializeToString()])
    with self.connect_db() as db_conn:
      with self.EventLog(path1) as log1, self.EventLog(path2) as log2:
        with loader.RunReader(2, 1, 1, 'doodle') as run:
          run.add_event_log(db_conn, log1)
          run.add_event_log(db_conn, log2)
          self.assertIsNotNone(run.mark_peek_reset())
          self.assertEqual(event1, run.get_next_event())
          run.reset()
          self.assertEqual(event1, run.get_next_event())
          run.mark()
          self.assertEqual(event2, run.get_next_event())
          run.mark()
          self.assertIsNone(run.get_next_event())
          self.assertIsNone(run.mark_peek_reset())

  def testMarkReset_acrossFiles(self):
    event1 = tf.Event(step=123)
    event2 = tf.Event(step=456)
    path1 = self._save_records('events.out.tfevents.1.localhost',
                               [event1.SerializeToString()])
    path2 = self._save_records('events.out.tfevents.2.localhost',
                               [event2.SerializeToString()])
    with self.connect_db() as db_conn:
      with self.EventLog(path1) as log1, self.EventLog(path2) as log2:
        with loader.RunReader(2, 1, 1, 'doodle') as run:
          run.add_event_log(db_conn, log1)
          run.add_event_log(db_conn, log2)
          run.mark()
          self.assertEqual(event1, run.get_next_event())
          self.assertEqual(event2, run.get_next_event())
          self.assertIsNone(run.get_next_event())
          run.reset()
          self.assertEqual(event1, run.get_next_event())
          self.assertEqual(event2, run.get_next_event())
          self.assertIsNone(run.get_next_event())
          run.mark()

  def testMarkWithShrinkingBatchSize_raisesValueError(self):
    event1 = tf.Event(step=123)
    event2 = tf.Event(step=456)
    path1 = self._save_records('events.out.tfevents.1.localhost',
                               [event1.SerializeToString()])
    path2 = self._save_records('events.out.tfevents.2.localhost',
                               [event2.SerializeToString()])
    with self.connect_db() as db_conn:
      with self.EventLog(path1) as log1, self.EventLog(path2) as log2:
        with loader.RunReader(2, 1, 1, 'doodle') as run:
          run.add_event_log(db_conn, log1)
          run.add_event_log(db_conn, log2)
          run.mark()
          self.assertEqual(event1, run.get_next_event())
          self.assertEqual(event2, run.get_next_event())
          self.assertIsNone(run.get_next_event())
          run.reset()
          self.assertEqual(event1, run.get_next_event())
          with six.assertRaisesRegex(self, ValueError, r'monotonic'):
            run.mark()

  def testRestartProgram_resumesThings(self):
    event1 = tf.Event(step=123)
    event2 = tf.Event(step=456)
    path = self._save_records('events.out.tfevents.1.localhost',
                              [event1.SerializeToString(),
                               event2.SerializeToString()])
    with self.connect_db() as db_conn:
      with self.EventLog(path) as log:
        with loader.RunReader(2, 1, 1, 'doodle') as run:
          run.add_event_log(db_conn, log)
          self.assertEqual(event1, run.get_next_event())
          run.save_progress(db_conn)
      with self.EventLog(path) as log:
        with loader.RunReader(2, 1, 1, 'doodle') as run:
          run.add_event_log(db_conn, log)
          self.assertEqual(event2, run.get_next_event())


class ProcessEventsTest(LoaderTestCase):
  def testProcessEvents(self):  # pylint: disable-msg=too-many-statements
    # Create a summary file with some events.
    records = []

    tensors = []
    tag_name = 'some_tag'
    for i in range(5):
      event = tf.Event(step=i+1)
      # TODO(jlewi): We should probably add multiple values to make sure
      # we cover that case.
      v = event.summary.value.add()
      v.tag = tag_name
      v.tensor.dtype = types_pb2.DT_INT64
      nums = np.zeros(10, dtype=np.int64)
      nums[0:i+1] = np.arange(i+1, dtype=np.int64) + 1
      v.tensor.int64_val.extend(nums)
      v.metadata.plugin_data.plugin_name = 'some-plugin'
      records.append(event.SerializeToString())
      tensors.append(v.tensor)
    # Events file must have a name matching the expected pattern.
    events_path = os.path.join(tempfile.mkdtemp(),
                               'somevents.tfevents.1234.somehost')
    with RecordWriter(events_path) as writer:
      for record in records:
        writer.write(record)

    log = loader.EventLogReader(events_path)
    customer_number = 29
    experiment_id = 3
    run_id = 4
    name = 'test-run'
    run_reader = loader.RunReader(customer_number, experiment_id, run_id, name)

    loader.process_event_logs(run_reader, [log], self.tbase)

    # Check that a row in the tags table was created.
    with contextlib.closing(self.connect_db()) as conn:
      with contextlib.closing(conn.cursor()) as c:
        c.execute('select tag_id from Tags where name = ?',
                  (tag_name,))
        rows = c.fetchall()
        self.assertEqual(1, len(rows))
        tag_id = rows[0][0]

    with contextlib.closing(self.connect_db()) as conn:
      with contextlib.closing(conn.cursor()) as c:
        c.execute('select tag_id, encoding, step_count, is_big, tensor '
                  'from tensors where tag_id = ?',
                  (tag_id,))
        # There should be 5 different tensors associated with this tag.
        rows = c.fetchall()
        self.assertEqual(5, len(rows))
        # Make sure the rows are sorted by step.
        rows = sorted(rows, key=itemgetter(2))

        for i, r in enumerate(rows):
          self.assertEqual(0, r[1])
          self.assertEqual(i+1, r[2])
          self.assertEqual(False, r[3])
          actual = tensor_pb2.TensorProto()
          tensor_data = r[4]
          if isinstance(tensor_data, unicode):
            tensor_data = tensor_data.encode('utf-8')
          actual.ParseFromString(tensor_data)
          self.assertEqual(tensors[i], actual,
                           'Got {0} want {1}'.format(tensors[i], actual))

    # TODO(jlewi): Check that progress was saved to the DB.
    with contextlib.closing(self.connect_db()) as conn:
      with contextlib.closing(conn.cursor()) as c:
        c.execute('select event_log_id, path, offset from EventLogs')
        rows = c.fetchall()
        self.assertEqual(1, len(rows))
        row = rows[0]
        self.assertEqual(events_path, row[1])
        self.assertGreater(row[2], 0)

@util.closeable
class RecordWriter(object):
  def __init__(self, path):
    self.path = tf.compat.as_bytes(path)
    self._writer = self._make_writer()

  def write(self, record):
    if not self._writer.WriteRecord(tf.compat.as_bytes(record)):
      raise IOError('Failed to write record to ' + self.path)

  def close(self):
    with tf.errors.raise_exception_on_not_ok_status() as status:
      self._writer.Close(status)

  def _make_writer(self):
    with tf.errors.raise_exception_on_not_ok_status() as status:
      return tf.pywrap_tensorflow.PyRecordWriter_New(
          self.path, tf.compat.as_bytes(''), status)


class TagsTest(test_util.TestCase):

  def testInsertTagId(self):
    customer_number = 22
    experiment_id = 2
    run_id = 10
    tag_name = '237_tag_name'
    plugin_id = 30
    loader.insert_tag_id(self.connect_db(),
                         customer_number, experiment_id, run_id,
                         plugin_id, tag_name, 'display tag', 'description')

    with contextlib.closing(self.connect_db()) as conn:
      with contextlib.closing(conn.cursor()) as c:
        c.execute('select tag_id, customer_number, plugin_id, name, '
                  'display_name, summary_description from Tags '
                  'where run_id = ? and name = ?',
                  (run_id, tag_name))
        row = c.fetchone()

        # Check tag_id is > 0
        self.assertGreater(row[0], 0)
        self.assertEqual(customer_number, row[1])
        self.assertEqual(plugin_id, row[2])
        self.assertEqual(tag_name, row[3])
        self.assertEqual('display tag', row[4])
        self.assertEqual('description', row[5])

class TensorsTest(test_util.TestCase):

  def testInsertTagId(self):
    tensor = tensor_pb2.TensorProto()
    tensor.dtype = types_pb2.DT_INT64
    tensor.version_number = 15
    tensor.int64_val.extend([1, 2, 3])
    customer_number = 22
    tag_id = 20
    step_count = 30
    loader.insert_tensor(self.connect_db(), customer_number, tag_id,
                         step_count, tensor)

    # Try reading the tensor.
    with contextlib.closing(self.connect_db()) as conn:
      with contextlib.closing(conn.cursor()) as c:
        c.execute('select tensor from tensors where customer_number = ? and '
                  'tag_id = ? and step_count = ?',
                  (customer_number, tag_id, step_count))
        row = c.fetchone()
        stored = tensor_pb2.TensorProto()

        tensor_data = row[0]
        if isinstance(tensor_data, unicode):
          tensor_data = tensor_data.encode('utf-8')
        stored.ParseFromString(tensor_data)
        self.assertEqual(tensor, stored,
                         'Got {0} want {1}'.format(stored, tensor))


if __name__ == '__main__':
  tf.test.main()
