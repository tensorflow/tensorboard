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

import abc
import collections
import os
import time

from google.protobuf import text_format
import six
import tensorflow as tf

try:
  # python version >= 3.3
  from unittest import mock  # pylint: disable=g-import-not-at-top
except ImportError:
  import mock  # pylint: disable=g-import-not-at-top,unused-import

from tensorboard import test
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import metadata
from tensorboard.plugins.hparams import plugin_data_pb2
from tensorboard.plugins.hparams import summary_v2 as hp


tf.compat.v1.enable_eager_execution()


class HParamsConfigTest(test.TestCase):
  def setUp(self):
    self.logdir = os.path.join(self.get_temp_dir(), "logs")

    self.hparams = [
        hp.HParam("learning_rate", hp.RealInterval(1e-2, 1e-1)),
        hp.HParam("dense_layers", hp.IntInterval(2, 7)),
        hp.HParam("optimizer", hp.Discrete(["adam", "sgd"])),
        hp.HParam("who_knows_what"),
        hp.HParam(
            "magic",
            hp.Discrete([False, True]),
            display_name="~*~ Magic ~*~",
            description="descriptive",
        ),
    ]
    self.metrics = [
        hp.Metric("samples_per_second"),
        hp.Metric(group="train", tag="batch_loss", display_name="loss (train)"),
        hp.Metric(
            group="validation",
            tag="epoch_accuracy",
            display_name="accuracy (val.)",
            description="Accuracy on the _validation_ dataset.",
            dataset_type=hp.Metric.VALIDATION,
        ),
    ]
    self.time_created_secs = 1555624767.0

    self.expected_experiment_pb = api_pb2.Experiment()
    text_format.Merge(
        """
        time_created_secs: 1555624767.0
        hparam_infos {
          name: "learning_rate"
          type: DATA_TYPE_FLOAT64
          domain_interval {
            min_value: 0.01
            max_value: 0.1
          }
        }
        hparam_infos {
          name: "dense_layers"
          type: DATA_TYPE_FLOAT64
          domain_interval {
            min_value: 2
            max_value: 7
          }
        }
        hparam_infos {
          name: "optimizer"
          type: DATA_TYPE_STRING
          domain_discrete {
            values {
              string_value: "adam"
            }
            values {
              string_value: "sgd"
            }
          }
        }
        hparam_infos {
          name: "who_knows_what"
        }
        hparam_infos {
          name: "magic"
          type: DATA_TYPE_BOOL
          display_name: "~*~ Magic ~*~"
          description: "descriptive"
          domain_discrete {
            values {
              bool_value: false
            }
            values {
              bool_value: true
            }
          }
        }
        metric_infos {
          name {
            tag: "samples_per_second"
          }
        }
        metric_infos {
          name {
            group: "train"
            tag: "batch_loss"
          }
          display_name: "loss (train)"
        }
        metric_infos {
          name {
            group: "validation"
            tag: "epoch_accuracy"
          }
          display_name: "accuracy (val.)"
          description: "Accuracy on the _validation_ dataset."
          dataset_type: DATASET_VALIDATION
        }
        """,
        self.expected_experiment_pb,
    )

  def _get_unique_summary_value(self, logdir):
    """Get the unique summary `Value` stored in `logdir`.

    Specifically, `logdir` must be a directory containing exactly one
    entry, which must be an events file of whose events exactly one is a
    summary, which must have exactly one `value`. This unique `value`
    will be returned.

    Args:
      logdir: String path to a logdir.

    Returns:
      A `summary_pb2.Summary.Value` object.
    """
    files = os.listdir(logdir)
    self.assertEqual(len(files), 1, files)
    events_file = os.path.join(logdir, files[0])
    summaries = [
        event.summary
        for event in tf.compat.v1.train.summary_iterator(events_file)
        if event.WhichOneof("what") == "summary"
    ]
    self.assertEqual(len(summaries), 1, summaries)
    values = summaries[0].value
    self.assertEqual(len(values), 1, values)
    return values[0]

  def _check_logdir(self, logdir):
    """Test that the experiment summary was written to `logdir`."""
    actual_value = self._get_unique_summary_value(logdir)
    self.assertEqual(
        actual_value.metadata.plugin_data.plugin_name,
        metadata.PLUGIN_NAME,
    )
    plugin_content = actual_value.metadata.plugin_data.content
    self.assertEqual(
        metadata.parse_experiment_plugin_data(plugin_content),
        self.expected_experiment_pb,
    )

  def test_eager(self):
    with tf.compat.v2.summary.create_file_writer(self.logdir).as_default():
      result = hp.hparams_config(
          hparams=self.hparams,
          metrics=self.metrics,
          time_created_secs=self.time_created_secs,
      )
      self.assertTrue(result)
    self._check_logdir(self.logdir)

  def test_graph_mode(self):
    with \
        tf.compat.v1.Graph().as_default(), \
        tf.compat.v1.Session() as sess, \
        tf.compat.v2.summary.create_file_writer(self.logdir).as_default() as w:
      sess.run(w.init())
      summ = hp.hparams_config(
          hparams=self.hparams,
          metrics=self.metrics,
          time_created_secs=self.time_created_secs,
      )
      self.assertTrue(sess.run(summ))
    self._check_logdir(self.logdir)

  def test_eager_no_default_writer(self):
    result = hp.hparams_config(
        hparams=self.hparams,
        metrics=self.metrics,
        time_created_secs=self.time_created_secs,
    )
    self.assertFalse(result)  # no default writer


class IntIntervalTest(test.TestCase):
  def test_simple(self):
    domain = hp.IntInterval(3, 7)
    self.assertEqual(domain.min_value, 3)
    self.assertEqual(domain.max_value, 7)
    self.assertEqual(domain.dtype, int)

  def test_singleton_domain(self):
    domain = hp.IntInterval(61, 61)
    self.assertEqual(domain.min_value, 61)
    self.assertEqual(domain.max_value, 61)
    self.assertEqual(domain.dtype, int)

  def test_non_ints(self):
    with six.assertRaisesRegex(
        self, TypeError, "min_value must be an int: -inf"):
      hp.IntInterval(float("-inf"), 0)
    with six.assertRaisesRegex(
        self, TypeError, "max_value must be an int: 'eleven'"):
      hp.IntInterval(7, "eleven")

  def test_backward_endpoints(self):
    with six.assertRaisesRegex(
        self, ValueError, "123 > 45"):
      hp.IntInterval(123, 45)


class RealIntervalTest(test.TestCase):
  def test_simple(self):
    domain = hp.RealInterval(3.1, 7.7)
    self.assertEqual(domain.min_value, 3.1)
    self.assertEqual(domain.max_value, 7.7)
    self.assertEqual(domain.dtype, float)

  def test_singleton_domain(self):
    domain = hp.RealInterval(61.318, 61.318)
    self.assertEqual(domain.min_value, 61.318)
    self.assertEqual(domain.max_value, 61.318)
    self.assertEqual(domain.dtype, float)

  def test_infinite_domain(self):
    inf = float("inf")
    domain = hp.RealInterval(-inf, inf)
    self.assertEqual(domain.min_value, -inf)
    self.assertEqual(domain.max_value, inf)
    self.assertEqual(domain.dtype, float)

  def test_non_ints(self):
    with six.assertRaisesRegex(
        self, TypeError, "min_value must be a float: True"):
      hp.RealInterval(True, 2.0)
    with six.assertRaisesRegex(
        self, TypeError, "max_value must be a float: 'wat'"):
      hp.RealInterval(1.2, "wat")

  def test_backward_endpoints(self):
    with six.assertRaisesRegex(
        self, ValueError, "2.1 > 1.2"):
      hp.RealInterval(2.1, 1.2)


class DiscreteTest(test.TestCase):
  def test_simple(self):
    domain = hp.Discrete([1, 2, 5])
    self.assertEqual(domain.values, [1, 2, 5])
    self.assertEqual(domain.dtype, int)

  def test_values_sorted(self):
    domain = hp.Discrete([2, 3, 1])
    self.assertEqual(domain.values, [1, 2, 3])
    self.assertEqual(domain.dtype, int)

  def test_empty_with_explicit_dtype(self):
    domain = hp.Discrete([], dtype=bool)
    self.assertIs(domain.dtype, bool)
    self.assertEqual(domain.values, [])

  def test_empty_with_unspecified_dtype(self):
    with six.assertRaisesRegex(
        self, ValueError, "Empty domain with no dtype specified"):
      hp.Discrete([])

  def test_dtype_mismatch(self):
    with six.assertRaisesRegex(
        self, TypeError, r"dtype mismatch: not isinstance\(2, str\)"):
      hp.Discrete(["one", 2])


if __name__ == "__main__":
  tf.test.main()
