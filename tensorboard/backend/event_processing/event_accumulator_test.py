# Copyright 2015 The TensorFlow Authors. All Rights Reserved.
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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os

import numpy as np
import six
from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf

from tensorboard.backend.event_processing import event_accumulator as ea
from tensorboard.plugins.distribution import compressor


class _EventGenerator(object):
  """Class that can add_events and then yield them back.

  Satisfies the EventGenerator API required for the EventAccumulator.
  Satisfies the EventWriter API required to create a tf.summary.FileWriter.

  Has additional convenience methods for adding test events.
  """

  def __init__(self, testcase, zero_out_timestamps=False):
    self._testcase = testcase
    self.items = []
    self.zero_out_timestamps = zero_out_timestamps

  def Load(self):
    while self.items:
      yield self.items.pop(0)

  def AddScalar(self, tag, wall_time=0, step=0, value=0):
    event = tf.Event(
        wall_time=wall_time,
        step=step,
        summary=tf.Summary(
            value=[tf.Summary.Value(tag=tag, simple_value=value)]))
    self.AddEvent(event)

  def AddHistogram(self,
                   tag,
                   wall_time=0,
                   step=0,
                   hmin=1,
                   hmax=2,
                   hnum=3,
                   hsum=4,
                   hsum_squares=5,
                   hbucket_limit=None,
                   hbucket=None):
    histo = tf.HistogramProto(
        min=hmin,
        max=hmax,
        num=hnum,
        sum=hsum,
        sum_squares=hsum_squares,
        bucket_limit=hbucket_limit,
        bucket=hbucket)
    event = tf.Event(
        wall_time=wall_time,
        step=step,
        summary=tf.Summary(value=[tf.Summary.Value(tag=tag, histo=histo)]))
    self.AddEvent(event)

  def AddImage(self,
               tag,
               wall_time=0,
               step=0,
               encoded_image_string=b'imgstr',
               width=150,
               height=100):
    image = tf.Summary.Image(
        encoded_image_string=encoded_image_string, width=width, height=height)
    event = tf.Event(
        wall_time=wall_time,
        step=step,
        summary=tf.Summary(value=[tf.Summary.Value(tag=tag, image=image)]))
    self.AddEvent(event)

  def AddAudio(self,
               tag,
               wall_time=0,
               step=0,
               encoded_audio_string=b'sndstr',
               content_type='audio/wav',
               sample_rate=44100,
               length_frames=22050):
    audio = tf.Summary.Audio(
        encoded_audio_string=encoded_audio_string,
        content_type=content_type,
        sample_rate=sample_rate,
        length_frames=length_frames)
    event = tf.Event(
        wall_time=wall_time,
        step=step,
        summary=tf.Summary(value=[tf.Summary.Value(tag=tag, audio=audio)]))
    self.AddEvent(event)

  def AddEvent(self, event):
    if self.zero_out_timestamps:
      event.wall_time = 0
    self.items.append(event)

  def add_event(self, event):  # pylint: disable=invalid-name
    """Match the EventWriter API."""
    self.AddEvent(event)

  def get_logdir(self):  # pylint: disable=invalid-name
    """Return a temp directory for asset writing."""
    return self._testcase.get_temp_dir()


class EventAccumulatorTest(tf.test.TestCase):

  def assertTagsEqual(self, actual, expected):
    """Utility method for checking the return value of the Tags() call.

    It fills out the `expected` arg with the default (empty) values for every
    tag type, so that the author needs only specify the non-empty values they
    are interested in testing.

    Args:
      actual: The actual Accumulator tags response.
      expected: The expected tags response (empty fields may be omitted)
    """

    empty_tags = {
        ea.IMAGES: [],
        ea.AUDIO: [],
        ea.SCALARS: [],
        ea.HISTOGRAMS: [],
        ea.COMPRESSED_HISTOGRAMS: [],
        ea.GRAPH: False,
        ea.META_GRAPH: False,
        ea.RUN_METADATA: [],
        ea.TENSORS: [],
    }

    # Verifies that there are no unexpected keys in the actual response.
    # If this line fails, likely you added a new tag type, and need to update
    # the empty_tags dictionary above.
    self.assertItemsEqual(actual.keys(), empty_tags.keys())

    for key in actual:
      expected_value = expected.get(key, empty_tags[key])
      if isinstance(expected_value, list):
        self.assertItemsEqual(actual[key], expected_value)
      else:
        self.assertEqual(actual[key], expected_value)


class MockingEventAccumulatorTest(EventAccumulatorTest):

  def setUp(self):
    super(MockingEventAccumulatorTest, self).setUp()
    self.stubs = tf.test.StubOutForTesting()
    self._real_constructor = ea.EventAccumulator
    self._real_generator = ea._GeneratorFromPath

    def _FakeAccumulatorConstructor(generator, *args, **kwargs):
      ea._GeneratorFromPath = lambda x: generator
      return self._real_constructor(generator, *args, **kwargs)

    ea.EventAccumulator = _FakeAccumulatorConstructor

  def tearDown(self):
    self.stubs.CleanUp()
    ea.EventAccumulator = self._real_constructor
    ea._GeneratorFromPath = self._real_generator

  def testEmptyAccumulator(self):
    gen = _EventGenerator(self)
    x = ea.EventAccumulator(gen)
    x.Reload()
    self.assertTagsEqual(x.Tags(), {})

  def testTags(self):
    """Tags should be found in EventAccumulator after adding some events."""
    gen = _EventGenerator(self)
    gen.AddScalar('s1')
    gen.AddScalar('s2')
    gen.AddHistogram('hst1')
    gen.AddHistogram('hst2')
    gen.AddImage('im1')
    gen.AddImage('im2')
    gen.AddAudio('snd1')
    gen.AddAudio('snd2')
    acc = ea.EventAccumulator(gen)
    acc.Reload()
    self.assertTagsEqual(acc.Tags(), {
        ea.IMAGES: ['im1', 'im2'],
        ea.AUDIO: ['snd1', 'snd2'],
        ea.SCALARS: ['s1', 's2'],
        ea.HISTOGRAMS: ['hst1', 'hst2'],
        ea.COMPRESSED_HISTOGRAMS: ['hst1', 'hst2'],
    })

  def testReload(self):
    """EventAccumulator contains suitable tags after calling Reload."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    acc.Reload()
    self.assertTagsEqual(acc.Tags(), {})
    gen.AddScalar('s1')
    gen.AddScalar('s2')
    gen.AddHistogram('hst1')
    gen.AddHistogram('hst2')
    gen.AddImage('im1')
    gen.AddImage('im2')
    gen.AddAudio('snd1')
    gen.AddAudio('snd2')
    acc.Reload()
    self.assertTagsEqual(acc.Tags(), {
        ea.IMAGES: ['im1', 'im2'],
        ea.AUDIO: ['snd1', 'snd2'],
        ea.SCALARS: ['s1', 's2'],
        ea.HISTOGRAMS: ['hst1', 'hst2'],
        ea.COMPRESSED_HISTOGRAMS: ['hst1', 'hst2'],
    })

  def testScalars(self):
    """Tests whether EventAccumulator contains scalars after adding them."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    s1 = ea.ScalarEvent(wall_time=1, step=10, value=32)
    s2 = ea.ScalarEvent(wall_time=2, step=12, value=64)
    gen.AddScalar('s1', wall_time=1, step=10, value=32)
    gen.AddScalar('s2', wall_time=2, step=12, value=64)
    acc.Reload()
    self.assertEqual(acc.Scalars('s1'), [s1])
    self.assertEqual(acc.Scalars('s2'), [s2])

  def testHistograms(self):
    """Tests whether histograms are inserted into EventAccumulator."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)

    val1 = ea.HistogramValue(
        min=1,
        max=2,
        num=3,
        sum=4,
        sum_squares=5,
        bucket_limit=[1, 2, 3],
        bucket=[0, 3, 0])
    val2 = ea.HistogramValue(
        min=-2,
        max=3,
        num=4,
        sum=5,
        sum_squares=6,
        bucket_limit=[2, 3, 4],
        bucket=[1, 3, 0])

    hst1 = ea.HistogramEvent(wall_time=1, step=10, histogram_value=val1)
    hst2 = ea.HistogramEvent(wall_time=2, step=12, histogram_value=val2)
    gen.AddHistogram(
        'hst1',
        wall_time=1,
        step=10,
        hmin=1,
        hmax=2,
        hnum=3,
        hsum=4,
        hsum_squares=5,
        hbucket_limit=[1, 2, 3],
        hbucket=[0, 3, 0])
    gen.AddHistogram(
        'hst2',
        wall_time=2,
        step=12,
        hmin=-2,
        hmax=3,
        hnum=4,
        hsum=5,
        hsum_squares=6,
        hbucket_limit=[2, 3, 4],
        hbucket=[1, 3, 0])
    acc.Reload()
    self.assertEqual(acc.Histograms('hst1'), [hst1])
    self.assertEqual(acc.Histograms('hst2'), [hst2])

  def testCompressedHistograms(self):
    """Tests compressed histograms inserted into EventAccumulator."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen, compression_bps=(0, 2500, 5000, 7500, 10000))

    gen.AddHistogram(
        'hst1',
        wall_time=1,
        step=10,
        hmin=1,
        hmax=2,
        hnum=3,
        hsum=4,
        hsum_squares=5,
        hbucket_limit=[1, 2, 3],
        hbucket=[0, 3, 0])
    gen.AddHistogram(
        'hst2',
        wall_time=2,
        step=12,
        hmin=-2,
        hmax=3,
        hnum=4,
        hsum=5,
        hsum_squares=6,
        hbucket_limit=[2, 3, 4],
        hbucket=[1, 3, 0])
    acc.Reload()

    # Create the expected values after compressing hst1
    expected_vals1 = [
        compressor.CompressedHistogramValue(bp, val)
        for bp, val in [(0, 1.0), (2500, 1.25), (5000, 1.5), (7500, 1.75
                                                             ), (10000, 2.0)]
    ]
    expected_cmphst1 = ea.CompressedHistogramEvent(
        wall_time=1, step=10, compressed_histogram_values=expected_vals1)
    self.assertEqual(acc.CompressedHistograms('hst1'), [expected_cmphst1])

    # Create the expected values after compressing hst2
    expected_vals2 = [
        compressor.CompressedHistogramValue(bp, val)
        for bp, val in [(0, -2),
                        (2500, 2),
                        (5000, 2 + 1 / 3),
                        (7500, 2 + 2 / 3),
                        (10000, 3)]
    ]
    expected_cmphst2 = ea.CompressedHistogramEvent(
        wall_time=2, step=12, compressed_histogram_values=expected_vals2)
    self.assertEqual(acc.CompressedHistograms('hst2'), [expected_cmphst2])

  def testImages(self):
    """Tests 2 images inserted/accessed in EventAccumulator."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    im1 = ea.ImageEvent(
        wall_time=1,
        step=10,
        encoded_image_string=b'big',
        width=400,
        height=300)
    im2 = ea.ImageEvent(
        wall_time=2,
        step=12,
        encoded_image_string=b'small',
        width=40,
        height=30)
    gen.AddImage(
        'im1',
        wall_time=1,
        step=10,
        encoded_image_string=b'big',
        width=400,
        height=300)
    gen.AddImage(
        'im2',
        wall_time=2,
        step=12,
        encoded_image_string=b'small',
        width=40,
        height=30)
    acc.Reload()
    self.assertEqual(acc.Images('im1'), [im1])
    self.assertEqual(acc.Images('im2'), [im2])

  def testAudio(self):
    """Tests 2 audio events inserted/accessed in EventAccumulator."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    snd1 = ea.AudioEvent(
        wall_time=1,
        step=10,
        encoded_audio_string=b'big',
        content_type='audio/wav',
        sample_rate=44100,
        length_frames=441000)
    snd2 = ea.AudioEvent(
        wall_time=2,
        step=12,
        encoded_audio_string=b'small',
        content_type='audio/wav',
        sample_rate=44100,
        length_frames=44100)
    gen.AddAudio(
        'snd1',
        wall_time=1,
        step=10,
        encoded_audio_string=b'big',
        content_type='audio/wav',
        sample_rate=44100,
        length_frames=441000)
    gen.AddAudio(
        'snd2',
        wall_time=2,
        step=12,
        encoded_audio_string=b'small',
        content_type='audio/wav',
        sample_rate=44100,
        length_frames=44100)
    acc.Reload()
    self.assertEqual(acc.Audio('snd1'), [snd1])
    self.assertEqual(acc.Audio('snd2'), [snd2])

  def testKeyError(self):
    """KeyError should be raised when accessing non-existing keys."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    acc.Reload()
    with self.assertRaises(KeyError):
      acc.Scalars('s1')
    with self.assertRaises(KeyError):
      acc.Scalars('hst1')
    with self.assertRaises(KeyError):
      acc.Scalars('im1')
    with self.assertRaises(KeyError):
      acc.Histograms('s1')
    with self.assertRaises(KeyError):
      acc.Histograms('im1')
    with self.assertRaises(KeyError):
      acc.Images('s1')
    with self.assertRaises(KeyError):
      acc.Images('hst1')
    with self.assertRaises(KeyError):
      acc.Audio('s1')
    with self.assertRaises(KeyError):
      acc.Audio('hst1')

  def testNonValueEvents(self):
    """Non-value events in the generator don't cause early exits."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    gen.AddScalar('s1', wall_time=1, step=10, value=20)
    gen.AddEvent(tf.Event(wall_time=2, step=20, file_version='nots2'))
    gen.AddScalar('s3', wall_time=3, step=100, value=1)
    gen.AddHistogram('hst1')
    gen.AddImage('im1')
    gen.AddAudio('snd1')

    acc.Reload()
    self.assertTagsEqual(acc.Tags(), {
        ea.IMAGES: ['im1'],
        ea.AUDIO: ['snd1'],
        ea.SCALARS: ['s1', 's3'],
        ea.HISTOGRAMS: ['hst1'],
        ea.COMPRESSED_HISTOGRAMS: ['hst1'],
    })

  def testExpiredDataDiscardedAfterRestartForFileVersionLessThan2(self):
    """Tests that events are discarded after a restart is detected.

    If a step value is observed to be lower than what was previously seen,
    this should force a discard of all previous items with the same tag
    that are outdated.

    Only file versions < 2 use this out-of-order discard logic. Later versions
    discard events based on the step value of SessionLog.START.
    """
    warnings = []
    self.stubs.Set(tf.logging, 'warn', warnings.append)

    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)

    gen.AddEvent(tf.Event(wall_time=0, step=0, file_version='brain.Event:1'))
    gen.AddScalar('s1', wall_time=1, step=100, value=20)
    gen.AddScalar('s1', wall_time=1, step=200, value=20)
    gen.AddScalar('s1', wall_time=1, step=300, value=20)
    acc.Reload()
    ## Check that number of items are what they should be
    self.assertEqual([x.step for x in acc.Scalars('s1')], [100, 200, 300])

    gen.AddScalar('s1', wall_time=1, step=101, value=20)
    gen.AddScalar('s1', wall_time=1, step=201, value=20)
    gen.AddScalar('s1', wall_time=1, step=301, value=20)
    acc.Reload()
    ## Check that we have discarded 200 and 300 from s1
    self.assertEqual([x.step for x in acc.Scalars('s1')], [100, 101, 201, 301])

  def testOrphanedDataNotDiscardedIfFlagUnset(self):
    """Tests that events are not discarded if purge_orphaned_data is false.
    """
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen, purge_orphaned_data=False)

    gen.AddEvent(tf.Event(wall_time=0, step=0, file_version='brain.Event:1'))
    gen.AddScalar('s1', wall_time=1, step=100, value=20)
    gen.AddScalar('s1', wall_time=1, step=200, value=20)
    gen.AddScalar('s1', wall_time=1, step=300, value=20)
    acc.Reload()
    ## Check that number of items are what they should be
    self.assertEqual([x.step for x in acc.Scalars('s1')], [100, 200, 300])

    gen.AddScalar('s1', wall_time=1, step=101, value=20)
    gen.AddScalar('s1', wall_time=1, step=201, value=20)
    gen.AddScalar('s1', wall_time=1, step=301, value=20)
    acc.Reload()
    ## Check that we have NOT discarded 200 and 300 from s1
    self.assertEqual([x.step for x in acc.Scalars('s1')],
                     [100, 200, 300, 101, 201, 301])

  def testEventsDiscardedPerTagAfterRestartForFileVersionLessThan2(self):
    """Tests that event discards after restart, only affect the misordered tag.

    If a step value is observed to be lower than what was previously seen,
    this should force a discard of all previous items that are outdated, but
    only for the out of order tag. Other tags should remain unaffected.

    Only file versions < 2 use this out-of-order discard logic. Later versions
    discard events based on the step value of SessionLog.START.
    """
    warnings = []
    self.stubs.Set(tf.logging, 'warn', warnings.append)

    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)

    gen.AddEvent(tf.Event(wall_time=0, step=0, file_version='brain.Event:1'))
    gen.AddScalar('s1', wall_time=1, step=100, value=20)
    gen.AddScalar('s1', wall_time=1, step=200, value=20)
    gen.AddScalar('s1', wall_time=1, step=300, value=20)
    gen.AddScalar('s1', wall_time=1, step=101, value=20)
    gen.AddScalar('s1', wall_time=1, step=201, value=20)
    gen.AddScalar('s1', wall_time=1, step=301, value=20)

    gen.AddScalar('s2', wall_time=1, step=101, value=20)
    gen.AddScalar('s2', wall_time=1, step=201, value=20)
    gen.AddScalar('s2', wall_time=1, step=301, value=20)

    acc.Reload()
    ## Check that we have discarded 200 and 300
    self.assertEqual([x.step for x in acc.Scalars('s1')], [100, 101, 201, 301])

    ## Check that s1 discards do not affect s2
    ## i.e. check that only events from the out of order tag are discarded
    self.assertEqual([x.step for x in acc.Scalars('s2')], [101, 201, 301])

  def testOnlySummaryEventsTriggerDiscards(self):
    """Test that file version event does not trigger data purge."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    gen.AddScalar('s1', wall_time=1, step=100, value=20)
    ev1 = tf.Event(wall_time=2, step=0, file_version='brain.Event:1')
    graph_bytes = tf.GraphDef().SerializeToString()
    ev2 = tf.Event(wall_time=3, step=0, graph_def=graph_bytes)
    gen.AddEvent(ev1)
    gen.AddEvent(ev2)
    acc.Reload()
    self.assertEqual([x.step for x in acc.Scalars('s1')], [100])

  def testSessionLogStartMessageDiscardsExpiredEvents(self):
    """Test that SessionLog.START message discards expired events.

    This discard logic is preferred over the out-of-order step discard logic,
    but this logic can only be used for event protos which have the SessionLog
    enum, which was introduced to event.proto for file_version >= brain.Event:2.
    """
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    gen.AddEvent(tf.Event(wall_time=0, step=1, file_version='brain.Event:2'))

    gen.AddScalar('s1', wall_time=1, step=100, value=20)
    gen.AddScalar('s1', wall_time=1, step=200, value=20)
    gen.AddScalar('s1', wall_time=1, step=300, value=20)
    gen.AddScalar('s1', wall_time=1, step=400, value=20)

    gen.AddScalar('s2', wall_time=1, step=202, value=20)
    gen.AddScalar('s2', wall_time=1, step=203, value=20)

    slog = tf.SessionLog(status=tf.SessionLog.START)
    gen.AddEvent(tf.Event(wall_time=2, step=201, session_log=slog))
    acc.Reload()
    self.assertEqual([x.step for x in acc.Scalars('s1')], [100, 200])
    self.assertEqual([x.step for x in acc.Scalars('s2')], [])

  def testFirstEventTimestamp(self):
    """Test that FirstEventTimestamp() returns wall_time of the first event."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    gen.AddEvent(tf.Event(wall_time=10, step=20, file_version='brain.Event:2'))
    gen.AddScalar('s1', wall_time=30, step=40, value=20)
    self.assertEqual(acc.FirstEventTimestamp(), 10)

  def testReloadPopulatesFirstEventTimestamp(self):
    """Test that Reload() means FirstEventTimestamp() won't load events."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    gen.AddEvent(tf.Event(wall_time=1, step=2, file_version='brain.Event:2'))

    acc.Reload()

    def _Die(*args, **kwargs):  # pylint: disable=unused-argument
      raise RuntimeError('Load() should not be called')

    self.stubs.Set(gen, 'Load', _Die)
    self.assertEqual(acc.FirstEventTimestamp(), 1)

  def testFirstEventTimestampLoadsEvent(self):
    """Test that FirstEventTimestamp() doesn't discard the loaded event."""
    gen = _EventGenerator(self)
    acc = ea.EventAccumulator(gen)
    gen.AddEvent(tf.Event(wall_time=1, step=2, file_version='brain.Event:2'))

    self.assertEqual(acc.FirstEventTimestamp(), 1)
    acc.Reload()
    self.assertEqual(acc.file_version, 2.0)

  def testTFSummaryScalar(self):
    """Verify processing of tf.summary.scalar."""
    event_sink = _EventGenerator(self, zero_out_timestamps=True)
    writer = tf.summary.FileWriter(self.get_temp_dir())
    writer.event_writer = event_sink
    with self.test_session() as sess:
      ipt = tf.placeholder(tf.float32)
      tf.summary.scalar('scalar1', ipt)
      tf.summary.scalar('scalar2', ipt * ipt)
      merged = tf.summary.merge_all()
      writer.add_graph(sess.graph)
      for i in xrange(10):
        summ = sess.run(merged, feed_dict={ipt: i})
        writer.add_summary(summ, global_step=i)

    accumulator = ea.EventAccumulator(event_sink)
    accumulator.Reload()

    seq1 = [ea.ScalarEvent(wall_time=0, step=i, value=i) for i in xrange(10)]
    seq2 = [
        ea.ScalarEvent(
            wall_time=0, step=i, value=i * i) for i in xrange(10)
    ]

    self.assertTagsEqual(accumulator.Tags(), {
        ea.SCALARS: ['scalar1', 'scalar2'],
        ea.GRAPH: True,
        ea.META_GRAPH: False,
    })

    self.assertEqual(accumulator.Scalars('scalar1'), seq1)
    self.assertEqual(accumulator.Scalars('scalar2'), seq2)
    first_value = accumulator.Scalars('scalar1')[0].value
    self.assertTrue(isinstance(first_value, float))

  def testTFSummaryImage(self):
    """Verify processing of tf.summary.image."""
    event_sink = _EventGenerator(self, zero_out_timestamps=True)
    writer = tf.summary.FileWriter(self.get_temp_dir())
    writer.event_writer = event_sink
    with self.test_session() as sess:
      ipt = tf.ones([10, 4, 4, 3], tf.uint8)
      # This is an interesting example, because the old tf.image_summary op
      # would throw an error here, because it would be tag reuse.
      # Using the tf node name instead allows argument re-use to the image
      # summary.
      with tf.name_scope('1'):
        tf.summary.image('images', ipt, max_outputs=1)
      with tf.name_scope('2'):
        tf.summary.image('images', ipt, max_outputs=2)
      with tf.name_scope('3'):
        tf.summary.image('images', ipt, max_outputs=3)
      merged = tf.summary.merge_all()
      writer.add_graph(sess.graph)
      for i in xrange(10):
        summ = sess.run(merged)
        writer.add_summary(summ, global_step=i)

    accumulator = ea.EventAccumulator(event_sink)
    accumulator.Reload()

    tags = [
        u'1/images/image', u'2/images/image/0', u'2/images/image/1',
        u'3/images/image/0', u'3/images/image/1', u'3/images/image/2'
    ]

    self.assertTagsEqual(accumulator.Tags(), {
        ea.IMAGES: tags,
        ea.GRAPH: True,
        ea.META_GRAPH: False,
    })

  def testTFSummaryTensor(self):
    """Verify processing of tf.summary.tensor."""
    event_sink = _EventGenerator(self, zero_out_timestamps=True)
    writer = tf.summary.FileWriter(self.get_temp_dir())
    writer.event_writer = event_sink
    with self.test_session() as sess:
      tf.summary.tensor_summary('scalar', tf.constant(1.0))
      tf.summary.tensor_summary('vector', tf.constant([1.0, 2.0, 3.0]))
      tf.summary.tensor_summary('string', tf.constant(six.b('foobar')))
      merged = tf.summary.merge_all()
      summ = sess.run(merged)
      writer.add_summary(summ, 0)

    accumulator = ea.EventAccumulator(event_sink)
    accumulator.Reload()

    self.assertTagsEqual(accumulator.Tags(), {
        ea.TENSORS: ['scalar', 'vector', 'string'],
    })

    scalar_proto = accumulator.Tensors('scalar')[0].tensor_proto
    scalar = tf.make_ndarray(scalar_proto)
    vector_proto = accumulator.Tensors('vector')[0].tensor_proto
    vector = tf.make_ndarray(vector_proto)
    string_proto = accumulator.Tensors('string')[0].tensor_proto
    string = tf.make_ndarray(string_proto)

    self.assertTrue(np.array_equal(scalar, 1.0))
    self.assertTrue(np.array_equal(vector, [1.0, 2.0, 3.0]))
    self.assertTrue(np.array_equal(string, six.b('foobar')))


class RealisticEventAccumulatorTest(EventAccumulatorTest):

  def testScalarsRealistically(self):
    """Test accumulator by writing values and then reading them."""

    def FakeScalarSummary(tag, value):
      value = tf.Summary.Value(tag=tag, simple_value=value)
      summary = tf.Summary(value=[value])
      return summary

    directory = os.path.join(self.get_temp_dir(), 'values_dir')
    if tf.gfile.IsDirectory(directory):
      tf.gfile.DeleteRecursively(directory)
    tf.gfile.MkDir(directory)

    writer = tf.summary.FileWriter(directory, max_queue=100)

    with tf.Graph().as_default() as graph:
      _ = tf.constant([2.0, 1.0])
    # Add a graph to the summary writer.
    writer.add_graph(graph)
    meta_graph_def = tf.train.export_meta_graph(graph_def=graph.as_graph_def(
        add_shapes=True))
    writer.add_meta_graph(meta_graph_def)

    run_metadata = tf.RunMetadata()
    device_stats = run_metadata.step_stats.dev_stats.add()
    device_stats.device = 'test device'
    writer.add_run_metadata(run_metadata, 'test run')

    # Write a bunch of events using the writer.
    for i in xrange(30):
      summ_id = FakeScalarSummary('id', i)
      summ_sq = FakeScalarSummary('sq', i * i)
      writer.add_summary(summ_id, i * 5)
      writer.add_summary(summ_sq, i * 5)
    writer.flush()

    # Verify that we can load those events properly
    acc = ea.EventAccumulator(directory)
    acc.Reload()
    self.assertTagsEqual(acc.Tags(), {
        ea.SCALARS: ['id', 'sq'],
        ea.GRAPH: True,
        ea.META_GRAPH: True,
        ea.RUN_METADATA: ['test run'],
    })
    id_events = acc.Scalars('id')
    sq_events = acc.Scalars('sq')
    self.assertEqual(30, len(id_events))
    self.assertEqual(30, len(sq_events))
    for i in xrange(30):
      self.assertEqual(i * 5, id_events[i].step)
      self.assertEqual(i * 5, sq_events[i].step)
      self.assertEqual(i, id_events[i].value)
      self.assertEqual(i * i, sq_events[i].value)

    # Write a few more events to test incremental reloading
    for i in xrange(30, 40):
      summ_id = FakeScalarSummary('id', i)
      summ_sq = FakeScalarSummary('sq', i * i)
      writer.add_summary(summ_id, i * 5)
      writer.add_summary(summ_sq, i * 5)
    writer.flush()

    # Verify we can now see all of the data
    acc.Reload()
    id_events = acc.Scalars('id')
    sq_events = acc.Scalars('sq')
    self.assertEqual(40, len(id_events))
    self.assertEqual(40, len(sq_events))
    for i in xrange(40):
      self.assertEqual(i * 5, id_events[i].step)
      self.assertEqual(i * 5, sq_events[i].step)
      self.assertEqual(i, id_events[i].value)
      self.assertEqual(i * i, sq_events[i].value)
    self.assertProtoEquals(graph.as_graph_def(add_shapes=True), acc.Graph())
    self.assertProtoEquals(meta_graph_def, acc.MetaGraph())

  def testGraphFromMetaGraphBecomesAvailable(self):
    """Test accumulator by writing values and then reading them."""

    directory = os.path.join(self.get_temp_dir(), 'metagraph_test_values_dir')
    if tf.gfile.IsDirectory(directory):
      tf.gfile.DeleteRecursively(directory)
    tf.gfile.MkDir(directory)

    writer = tf.summary.FileWriter(directory, max_queue=100)

    with tf.Graph().as_default() as graph:
      _ = tf.constant([2.0, 1.0])
    # Add a graph to the summary writer.
    meta_graph_def = tf.train.export_meta_graph(graph_def=graph.as_graph_def(
        add_shapes=True))
    writer.add_meta_graph(meta_graph_def)

    writer.flush()

    # Verify that we can load those events properly
    acc = ea.EventAccumulator(directory)
    acc.Reload()
    self.assertTagsEqual(acc.Tags(), {
        ea.GRAPH: True,
        ea.META_GRAPH: True,
    })
    self.assertProtoEquals(graph.as_graph_def(add_shapes=True), acc.Graph())
    self.assertProtoEquals(meta_graph_def, acc.MetaGraph())

  def _writeMetadata(self, logdir, summary_metadata, nonce=''):
    """Write to disk a summary with the given metadata.

    Arguments:
      logdir: a string
      summary_metadata: a `SummaryMetadata` protobuf object
      nonce: optional; will be added to the end of the event file name
        to guarantee that multiple calls to this function do not stomp the
        same file
    """

    summary = tf.Summary()
    summary.value.add(
        tensor=tf.make_tensor_proto(['po', 'ta', 'to'], dtype=tf.string),
        tag='you_are_it',
        metadata=summary_metadata)
    writer = tf.summary.FileWriter(logdir, filename_suffix=nonce)
    writer.add_summary(summary.SerializeToString())
    writer.close()

  def testSummaryMetadata(self):
    logdir = self.get_temp_dir()
    summary_metadata = tf.SummaryMetadata(
        display_name='current tagee', summary_description='no')
    summary_metadata.plugin_data.plugin_name = 'outlet'
    self._writeMetadata(logdir, summary_metadata)
    acc = ea.EventAccumulator(logdir)
    acc.Reload()
    self.assertProtoEquals(summary_metadata,
                           acc.SummaryMetadata('you_are_it'))

  def testSummaryMetadata_FirstMetadataWins(self):
    logdir = self.get_temp_dir()
    summary_metadata_1 = tf.SummaryMetadata(
        display_name='current tagee',
        summary_description='no',
        plugin_data=tf.SummaryMetadata.PluginData(plugin_name='outlet',
                                                  content=b'120v'))
    self._writeMetadata(logdir, summary_metadata_1, nonce='1')
    acc = ea.EventAccumulator(logdir)
    acc.Reload()
    summary_metadata_2 = tf.SummaryMetadata(
        display_name='tagee of the future',
        summary_description='definitely not',
        plugin_data=tf.SummaryMetadata.PluginData(plugin_name='plug',
                                                  content=b'110v'))
    self._writeMetadata(logdir, summary_metadata_2, nonce='2')
    acc.Reload()

    self.assertProtoEquals(summary_metadata_1,
                           acc.SummaryMetadata('you_are_it'))

  def testPluginTagToContent_PluginsCannotJumpOnTheBandwagon(self):
    # If there are multiple `SummaryMetadata` for a given tag, and the
    # set of plugins in the `plugin_data` of second is different from
    # that of the first, then the second set should be ignored.
    logdir = self.get_temp_dir()
    summary_metadata_1 = tf.SummaryMetadata(
        display_name='current tagee',
        summary_description='no',
        plugin_data=tf.SummaryMetadata.PluginData(plugin_name='outlet',
                                                  content=b'120v'))
    self._writeMetadata(logdir, summary_metadata_1, nonce='1')
    acc = ea.EventAccumulator(logdir)
    acc.Reload()
    summary_metadata_2 = tf.SummaryMetadata(
        display_name='tagee of the future',
        summary_description='definitely not',
        plugin_data=tf.SummaryMetadata.PluginData(plugin_name='plug',
                                                  content=b'110v'))
    self._writeMetadata(logdir, summary_metadata_2, nonce='2')
    acc.Reload()

    self.assertEqual(acc.PluginTagToContent('outlet'),
                     {'you_are_it': b'120v'})
    with six.assertRaisesRegex(self, KeyError, 'plug'):
      acc.PluginTagToContent('plug')

if __name__ == '__main__':
  tf.test.main()
