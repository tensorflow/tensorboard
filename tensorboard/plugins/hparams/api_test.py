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
import time

from google.protobuf import text_format
import six

from tensorboard import test
from tensorboard.plugins.hparams import api as hp
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import metadata


class ExperimentTest(test.TestCase):
  def test_summary_pb(self):
    hparams = [
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
    metrics = [
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
    experiment = hp.Experiment(
        hparams=hparams,
        metrics=metrics,
        user="zalgo",
        description="nothing to see here; move along",
        time_created_secs=1555624767,
    )

    self.assertEqual(experiment.hparams, hparams)
    self.assertEqual(experiment.metrics, metrics)
    self.assertEqual(experiment.user, "zalgo"),
    self.assertEqual(experiment.description, "nothing to see here; move along")
    self.assertEqual(experiment.time_created_secs, 1555624767)

    expected_experiment_pb = api_pb2.Experiment()
    text_format.Merge(
        """
        description: "nothing to see here; move along"
        user: "zalgo"
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
        expected_experiment_pb,
    )
    actual_summary_pb = experiment.summary_pb()
    plugin_content = actual_summary_pb.value[0].metadata.plugin_data.content
    self.assertEqual(
        metadata.parse_experiment_plugin_data(plugin_content),
        expected_experiment_pb,
    )


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
  test.main()
