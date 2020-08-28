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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os

from google.protobuf import text_format
import six
import tensorflow as tf

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import

from tensorboard.plugins.hparams import keras
from tensorboard.plugins.hparams import metadata
from tensorboard.plugins.hparams import plugin_data_pb2
from tensorboard.plugins.hparams import summary_v2 as hp


tf.compat.v1.enable_eager_execution()


class CallbackTest(tf.test.TestCase):
    def setUp(self):
        super(CallbackTest, self).setUp()
        self.logdir = os.path.join(self.get_temp_dir(), "logs")

    def _initialize_model(self, writer):
        HP_DENSE_NEURONS = hp.HParam("dense_neurons", hp.IntInterval(4, 16))
        self.hparams = {
            "optimizer": "adam",
            HP_DENSE_NEURONS: 8,
        }
        self.model = tf.keras.models.Sequential(
            [
                tf.keras.layers.Dense(
                    self.hparams[HP_DENSE_NEURONS], input_shape=(1,)
                ),
                tf.keras.layers.Dense(1, activation="sigmoid"),
            ]
        )
        self.model.compile(loss="mse", optimizer=self.hparams["optimizer"])
        self.trial_id = "my_trial"
        self.callback = keras.Callback(
            writer, self.hparams, trial_id=self.trial_id
        )

    def test_eager(self):
        def mock_time():
            mock_time.time += 1
            return mock_time.time

        mock_time.time = 1556227801.875
        initial_time = mock_time.time
        with mock.patch("time.time", mock_time):
            self._initialize_model(writer=self.logdir)
            self.model.fit(x=[(1,)], y=[(2,)], callbacks=[self.callback])
        final_time = mock_time.time

        files = os.listdir(self.logdir)
        self.assertEqual(len(files), 1, files)
        events_file = os.path.join(self.logdir, files[0])
        plugin_data = []
        for event in tf.compat.v1.train.summary_iterator(events_file):
            if event.WhichOneof("what") != "summary":
                continue
            self.assertEqual(len(event.summary.value), 1, event.summary.value)
            value = event.summary.value[0]
            self.assertEqual(
                value.metadata.plugin_data.plugin_name, metadata.PLUGIN_NAME,
            )
            plugin_data.append(value.metadata.plugin_data.content)

        self.assertEqual(len(plugin_data), 2, plugin_data)
        (start_plugin_data, end_plugin_data) = plugin_data
        start_pb = metadata.parse_session_start_info_plugin_data(
            start_plugin_data
        )
        end_pb = metadata.parse_session_end_info_plugin_data(end_plugin_data)

        # We're not the only callers of `time.time`; Keras calls it
        # internally an unspecified number of times, so we're not guaranteed
        # to know the exact values. Instead, we perform relative checks...
        self.assertGreater(start_pb.start_time_secs, initial_time)
        self.assertLess(start_pb.start_time_secs, end_pb.end_time_secs)
        self.assertLessEqual(start_pb.start_time_secs, final_time)
        # ...and then stub out the times for proto equality checks below.
        start_pb.start_time_secs = 1234.5
        end_pb.end_time_secs = 6789.0

        expected_start_pb = plugin_data_pb2.SessionStartInfo()
        text_format.Merge(
            """
            start_time_secs: 1234.5
            group_name: "my_trial"
            hparams {
              key: "optimizer"
              value {
                string_value: "adam"
              }
            }
            hparams {
              key: "dense_neurons"
              value {
                number_value: 8.0
              }
            }
            """,
            expected_start_pb,
        )
        self.assertEqual(start_pb, expected_start_pb)

        expected_end_pb = plugin_data_pb2.SessionEndInfo()
        text_format.Merge(
            """
            end_time_secs: 6789.0
            status: STATUS_SUCCESS
            """,
            expected_end_pb,
        )
        self.assertEqual(end_pb, expected_end_pb)

    def test_explicit_writer(self):
        writer = tf.compat.v2.summary.create_file_writer(
            self.logdir, filename_suffix=".magic",
        )
        self._initialize_model(writer=writer)
        self.model.fit(x=[(1,)], y=[(2,)], callbacks=[self.callback])

        files = os.listdir(self.logdir)
        self.assertEqual(len(files), 1, files)
        filename = files[0]
        self.assertTrue(filename.endswith(".magic"), filename)
        # We'll assume that the contents are correct, as in the case where
        # the file writer was constructed implicitly.

    def test_non_eager_failure(self):
        with tf.compat.v1.Graph().as_default():
            assert not tf.executing_eagerly()
            self._initialize_model(writer=self.logdir)
            with six.assertRaisesRegex(
                self, RuntimeError, "only supported in TensorFlow eager mode"
            ):
                self.model.fit(x=[(1,)], y=[(2,)], callbacks=[self.callback])

    def test_reuse_failure(self):
        self._initialize_model(writer=self.logdir)
        self.model.fit(x=[(1,)], y=[(2,)], callbacks=[self.callback])
        with six.assertRaisesRegex(
            self, RuntimeError, "cannot be reused across training sessions"
        ):
            self.model.fit(x=[(1,)], y=[(2,)], callbacks=[self.callback])

    def test_invalid_writer(self):
        with six.assertRaisesRegex(
            self,
            TypeError,
            "writer must be a `SummaryWriter` or `str`, not None",
        ):
            keras.Callback(writer=None, hparams={})

    def test_duplicate_hparam_names_across_object_and_string(self):
        hparams = {
            "foo": 1,
            hp.HParam("foo"): 1,
        }
        with six.assertRaisesRegex(
            self, ValueError, "multiple values specified for hparam 'foo'"
        ):
            keras.Callback(self.get_temp_dir(), hparams)

    def test_duplicate_hparam_names_from_two_objects(self):
        hparams = {
            hp.HParam("foo"): 1,
            hp.HParam("foo"): 1,
        }
        with six.assertRaisesRegex(
            self, ValueError, "multiple values specified for hparam 'foo'"
        ):
            keras.Callback(self.get_temp_dir(), hparams)

    def test_invalid_trial_id(self):
        with six.assertRaisesRegex(
            self, TypeError, "`trial_id` should be a `str`, but got: 12"
        ):
            keras.Callback(self.get_temp_dir(), {}, trial_id=12)


if __name__ == "__main__":
    tf.test.main()
