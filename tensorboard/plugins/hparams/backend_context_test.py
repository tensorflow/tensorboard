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
"""Tests for backend_context."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import operator

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import
import tensorflow as tf

from google.protobuf import text_format
from tensorboard import context
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import plugin_event_multiplexer
from tensorboard.compat.proto import summary_pb2
from tensorboard.plugins import base_plugin
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import backend_context
from tensorboard.plugins.hparams import metadata
from tensorboard.plugins.hparams import plugin_data_pb2
from tensorboard.plugins.scalar import metadata as scalars_metadata

DATA_TYPE_EXPERIMENT = "experiment"
DATA_TYPE_SESSION_START_INFO = "session_start_info"
DATA_TYPE_SESSION_END_INFO = "session_end_info"


class BackendContextTest(tf.test.TestCase):
    # Make assertProtoEquals print all the diff.
    maxDiff = None  # pylint: disable=invalid-name

    def setUp(self):
        self._mock_tb_context = base_plugin.TBContext()
        # TODO(#3425): Remove mocking or switch to mocking data provider
        # APIs directly.
        self._mock_multiplexer = mock.create_autospec(
            plugin_event_multiplexer.EventMultiplexer
        )
        self._mock_tb_context.multiplexer = self._mock_multiplexer
        self._mock_multiplexer.PluginRunToTagToContent.side_effect = (
            self._mock_plugin_run_to_tag_to_content
        )
        self._mock_multiplexer.AllSummaryMetadata.side_effect = (
            self._mock_all_summary_metadata
        )
        self._mock_multiplexer.SummaryMetadata.side_effect = (
            self._mock_summary_metadata
        )
        self._mock_tb_context.data_provider = data_provider.MultiplexerDataProvider(
            self._mock_multiplexer, "/path/to/logs"
        )
        self.session_1_start_info_ = ""
        self.session_2_start_info_ = ""
        self.session_3_start_info_ = ""

    def _mock_all_summary_metadata(self):
        result = {}
        hparams_content = {
            "exp/session_1": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO, self.session_1_start_info_
                ),
            },
            "exp/session_2": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO, self.session_2_start_info_
                ),
            },
            "exp/session_3": {
                metadata.SESSION_START_INFO_TAG: self._serialized_plugin_data(
                    DATA_TYPE_SESSION_START_INFO, self.session_3_start_info_
                ),
            },
        }
        scalars_content = {
            "exp/session_1": {"loss": b"", "accuracy": b""},
            "exp/session_1/eval": {"loss": b"",},
            "exp/session_1/train": {"loss": b"",},
            "exp/session_2": {"loss": b"", "accuracy": b"",},
            "exp/session_2/eval": {"loss": b"",},
            "exp/session_2/train": {"loss": b"",},
            "exp/session_3": {"loss": b"", "accuracy": b"",},
            "exp/session_3/eval": {"loss": b"",},
            "exp/session_3xyz/": {"loss2": b"",},
        }
        for (run, tag_to_content) in hparams_content.items():
            result.setdefault(run, {})
            for (tag, content) in tag_to_content.items():
                m = summary_pb2.SummaryMetadata()
                m.data_class = summary_pb2.DATA_CLASS_TENSOR
                m.plugin_data.plugin_name = metadata.PLUGIN_NAME
                m.plugin_data.content = content
                result[run][tag] = m
        for (run, tag_to_content) in scalars_content.items():
            result.setdefault(run, {})
            for (tag, content) in tag_to_content.items():
                m = summary_pb2.SummaryMetadata()
                m.data_class = summary_pb2.DATA_CLASS_SCALAR
                m.plugin_data.plugin_name = scalars_metadata.PLUGIN_NAME
                m.plugin_data.content = content
                result[run][tag] = m
        return result

    def _mock_plugin_run_to_tag_to_content(self, plugin_name):
        result = {}
        for (
            run,
            tag_to_metadata,
        ) in self._mock_multiplexer.AllSummaryMetadata().items():
            for (tag, metadata) in tag_to_metadata.items():
                if metadata.plugin_data.plugin_name != plugin_name:
                    continue
                result.setdefault(run, {})
                result[run][tag] = metadata.plugin_data.content
        return result

    def _mock_summary_metadata(self, run, tag):
        return self._mock_multiplexer.AllSummaryMetadata()[run][tag]

    def test_experiment_with_experiment_tag(self):
        experiment = """
            description: 'Test experiment'
            metric_infos: [
              { name: { tag: 'current_temp' } }
            ]
        """
        run = "exp"
        tag = metadata.EXPERIMENT_TAG
        m = summary_pb2.SummaryMetadata()
        m.data_class = summary_pb2.DATA_CLASS_TENSOR
        m.plugin_data.plugin_name = metadata.PLUGIN_NAME
        m.plugin_data.content = self._serialized_plugin_data(
            DATA_TYPE_EXPERIMENT, experiment
        )
        self._mock_multiplexer.AllSummaryMetadata.side_effect = None
        self._mock_multiplexer.AllSummaryMetadata.return_value = {run: {tag: m}}
        ctxt = backend_context.Context(self._mock_tb_context)
        request_ctx = context.RequestContext()
        self.assertProtoEquals(
            experiment,
            ctxt.experiment_from_metadata(
                request_ctx, "123", ctxt.hparams_metadata(request_ctx, "123")
            ),
        )

    def test_experiment_without_experiment_tag(self):
        self.session_1_start_info_ = """
        hparams: [
          {key: 'batch_size' value: {number_value: 100}},
          {key: 'lr' value: {number_value: 0.01}},
          {key: 'model_type' value: {string_value: 'CNN'}}
        ]
        """
        self.session_2_start_info_ = """
            hparams:[
              {key: 'batch_size' value: {number_value: 200}},
              {key: 'lr' value: {number_value: 0.02}},
              {key: 'model_type' value: {string_value: 'LATTICE'}}
            ]
        """
        self.session_3_start_info_ = """
            hparams:[
              {key: 'batch_size' value: {number_value: 300}},
              {key: 'lr' value: {number_value: 0.05}},
              {key: 'model_type' value: {string_value: 'CNN'}}
            ]
        """
        expected_exp = """
            hparam_infos: {
              name: 'batch_size'
              type: DATA_TYPE_FLOAT64
            },
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
            },
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: 'CNN'},
                         {string_value: 'LATTICE'}]
              }
            }
            metric_infos: {
              name: {group: '', tag: 'accuracy'}
            }
            metric_infos: {
              name: {group: '', tag: 'loss'}
            }
            metric_infos: {
              name: {group: 'eval', tag: 'loss'}
            }
            metric_infos: {
              name: {group: 'train', tag: 'loss'}
            }
        """
        ctxt = backend_context.Context(self._mock_tb_context)
        request_ctx = context.RequestContext()
        actual_exp = ctxt.experiment_from_metadata(
            request_ctx, "123", ctxt.hparams_metadata(request_ctx, "123")
        )
        _canonicalize_experiment(actual_exp)
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_without_experiment_tag_different_hparam_types(self):
        self.session_1_start_info_ = """
            hparams:[
              {key: 'batch_size' value: {number_value: 100}},
              {key: 'lr' value: {string_value: '0.01'}}
            ]
        """
        self.session_2_start_info_ = """
            hparams:[
              {key: 'lr' value: {number_value: 0.02}},
              {key: 'model_type' value: {string_value: 'LATTICE'}}
            ]
        """
        self.session_3_start_info_ = """
            hparams:[
              {key: 'batch_size' value: {bool_value: true}},
              {key: 'model_type' value: {string_value: 'CNN'}}
            ]
        """
        expected_exp = """
            hparam_infos: {
              name: 'batch_size'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: '100.0'},
                         {string_value: 'true'}]
              }
            }
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: '0.01'},
                         {string_value: '0.02'}]
              }
            }
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: 'CNN'},
                         {string_value: 'LATTICE'}]
              }
            }
            metric_infos: {
              name: {group: '', tag: 'accuracy'}
            }
            metric_infos: {
              name: {group: '', tag: 'loss'}
            }
            metric_infos: {
              name: {group: 'eval', tag: 'loss'}
            }
            metric_infos: {
              name: {group: 'train', tag: 'loss'}
            }
        """
        ctxt = backend_context.Context(self._mock_tb_context)
        request_ctx = context.RequestContext()
        actual_exp = ctxt.experiment_from_metadata(
            request_ctx, "123", ctxt.hparams_metadata(request_ctx, "123")
        )
        _canonicalize_experiment(actual_exp)
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_without_experiment_tag_many_distinct_values(self):
        self.session_1_start_info_ = """
            hparams:[
              {key: 'batch_size' value: {number_value: 100}},
              {key: 'lr' value: {string_value: '0.01'}}
            ]
        """
        self.session_2_start_info_ = """
            hparams:[
              {key: 'lr' value: {number_value: 0.02}},
              {key: 'model_type' value: {string_value: 'CNN'}}
            ]
        """
        self.session_3_start_info_ = """
            hparams:[
              {key: 'batch_size' value: {bool_value: true}},
              {key: 'model_type' value: {string_value: 'CNN'}}
            ]
        """
        expected_exp = """
            hparam_infos: {
              name: 'batch_size'
              type: DATA_TYPE_STRING
            }
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_STRING
            }
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: 'CNN'}]
              }
            }
            metric_infos: {
              name: {group: '', tag: 'accuracy'}
            }
            metric_infos: {
              name: {group: '', tag: 'loss'}
            }
            metric_infos: {
              name: {group: 'eval', tag: 'loss'}
            }
            metric_infos: {
              name: {group: 'train', tag: 'loss'}
            }
        """
        ctxt = backend_context.Context(
            self._mock_tb_context, max_domain_discrete_len=1
        )
        request_ctx = context.RequestContext()
        actual_exp = ctxt.experiment_from_metadata(
            request_ctx, "123", ctxt.hparams_metadata(request_ctx, "123"),
        )
        _canonicalize_experiment(actual_exp)
        self.assertProtoEquals(expected_exp, actual_exp)

    def _serialized_plugin_data(self, data_oneof_field, text_protobuffer):
        oneof_type_dict = {
            DATA_TYPE_EXPERIMENT: api_pb2.Experiment,
            DATA_TYPE_SESSION_START_INFO: plugin_data_pb2.SessionStartInfo,
            DATA_TYPE_SESSION_END_INFO: plugin_data_pb2.SessionEndInfo,
        }
        protobuffer = text_format.Merge(
            text_protobuffer, oneof_type_dict[data_oneof_field]()
        )
        plugin_data = plugin_data_pb2.HParamsPluginData()
        getattr(plugin_data, data_oneof_field).CopyFrom(protobuffer)
        return metadata.create_summary_metadata(plugin_data).plugin_data.content


def _canonicalize_experiment(exp):
    """Sorts the repeated fields of an Experiment message."""
    exp.hparam_infos.sort(key=operator.attrgetter("name"))
    exp.metric_infos.sort(key=operator.attrgetter("name.group", "name.tag"))
    for hparam_info in exp.hparam_infos:
        if hparam_info.HasField("domain_discrete"):
            hparam_info.domain_discrete.values.sort(
                key=operator.attrgetter("string_value")
            )


if __name__ == "__main__":
    tf.test.main()
