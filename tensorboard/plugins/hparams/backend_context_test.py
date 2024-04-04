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


import operator
from unittest import mock

import tensorflow as tf

from google.protobuf import text_format
from tensorboard import context
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import backend_context
from tensorboard.plugins.hparams import metadata
from tensorboard.plugins.hparams import plugin_data_pb2

DATA_TYPE_EXPERIMENT = "experiment"
DATA_TYPE_SESSION_START_INFO = "session_start_info"
DATA_TYPE_SESSION_END_INFO = "session_end_info"


class BackendContextTest(tf.test.TestCase):
    # Make assertProtoEquals print all the diff.
    maxDiff = None  # pylint: disable=invalid-name

    def setUp(self):
        self._mock_tb_context = base_plugin.TBContext()

        self._mock_tb_context.data_provider = mock.create_autospec(
            provider.DataProvider
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = (
            self._mock_list_tensors
        )
        self._mock_tb_context.data_provider.list_scalars.side_effect = (
            self._mock_list_scalars
        )
        self._mock_tb_context.data_provider.list_hyperparameters.side_effect = (
            self._mock_list_hyperparameters
        )

        self.session_1_start_info_ = ""
        self.session_2_start_info_ = ""
        self.session_3_start_info_ = ""
        self._hyperparameters = []

    def _mock_list_tensors(
        self, ctx, *, experiment_id, plugin_name, run_tag_filter
    ):
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
        result = {}
        for run, tag_to_content in hparams_content.items():
            result.setdefault(run, {})
            for tag, content in tag_to_content.items():
                t = provider.TensorTimeSeries(
                    max_step=0,
                    max_wall_time=0,
                    plugin_content=content,
                    description="",
                    display_name="",
                )
                result[run][tag] = t
        return result

    def _mock_list_scalars(
        self,
        ctx,
        *,
        experiment_id,
        plugin_name,
        run_tag_filter=provider.RunTagFilter(),
    ):
        scalars_content = {
            "exp/session_1": {"loss": b"", "accuracy": b""},
            "exp/session_1/eval": {
                "loss": b"",
            },
            "exp/session_1/train": {
                "loss": b"",
            },
            "exp/session_2": {
                "loss": b"",
                "accuracy": b"",
            },
            "exp/session_2/eval": {
                "loss": b"",
            },
            "exp/session_2/train": {
                "loss": b"",
            },
            "exp/session_3": {
                "loss": b"",
                "accuracy": b"",
            },
            "exp/session_3/eval": {
                "loss": b"",
            },
            "exp/session_3xyz/": {
                "loss2": b"",
            },
            ".": {
                "entropy": b"",
            },
        }
        result = {}
        for run, tag_to_content in scalars_content.items():
            result.setdefault(run, {})
            for tag, content in tag_to_content.items():
                t = provider.ScalarTimeSeries(
                    max_step=0,
                    max_wall_time=0,
                    plugin_content=content,
                    description="",
                    display_name="",
                )
                result[run][tag] = t
        return result

    def _mock_list_hyperparameters(
        self,
        ctx,
        *,
        experiment_ids,
        limit,
    ):
        return self._hyperparameters

    def _experiment_from_metadata(
        self, *, include_metrics=True, hparams_limit=None
    ):
        """Calls the expected operations for generating an Experiment proto."""
        ctxt = backend_context.Context(self._mock_tb_context)
        request_ctx = context.RequestContext()
        return ctxt.experiment_from_metadata(
            request_ctx,
            "123",
            include_metrics,
            ctxt.hparams_metadata(request_ctx, "123"),
            ctxt.hparams_from_data_provider(
                request_ctx, "123", limit=hparams_limit
            ),
            hparams_limit,
        )

    def test_experiment_with_experiment_tag(self):
        experiment = """
            description: 'Test experiment'
            metric_infos: [
              { name: { tag: 'current_temp' } }
            ]
        """
        run = "exp"
        tag = metadata.EXPERIMENT_TAG
        t = provider.TensorTimeSeries(
            max_step=0,
            max_wall_time=0,
            plugin_content=self._serialized_plugin_data(
                DATA_TYPE_EXPERIMENT, experiment
            ),
            description="",
            display_name="",
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._mock_tb_context.data_provider.list_tensors.return_value = {
            run: {tag: t}
        }
        self.assertProtoEquals(experiment, self._experiment_from_metadata())

    def test_experiment_with_experiment_tag_include_metrics(self):
        experiment = """
            description: 'Test experiment'
            metric_infos: [
              { name: { tag: 'current_temp' } },
              { name: { tag: 'delta_temp' } }
            ]
        """
        run = "exp"
        tag = metadata.EXPERIMENT_TAG
        t = provider.TensorTimeSeries(
            max_step=0,
            max_wall_time=0,
            plugin_content=self._serialized_plugin_data(
                DATA_TYPE_EXPERIMENT, experiment
            ),
            description="",
            display_name="",
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._mock_tb_context.data_provider.list_tensors.return_value = {
            run: {tag: t}
        }

        with self.subTest("False"):
            response = self._experiment_from_metadata(include_metrics=False)
            self.assertEmpty(response.metric_infos)

        with self.subTest("True"):
            response = self._experiment_from_metadata(include_metrics=True)
            self.assertLen(response.metric_infos, 2)

    def test_experiment_with_session_tags(self):
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
              domain_interval {
                min_value: 100.0
                max_value: 300.0
              }
              differs: true
            },
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
              domain_interval {
                min_value: 0.01
                max_value: 0.05
              }
              differs: true
            },
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: 'CNN'},
                         {string_value: 'LATTICE'}]
              }
              differs: true
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
        actual_exp = self._experiment_from_metadata()
        _canonicalize_experiment(actual_exp)
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_with_session_tags_differs_field(self):
        self.session_1_start_info_ = """
            hparams: [
              {key: 'bool_hparam_differs_true' value: {bool_value: false}},
              {key: 'bool_hparam_differs_true' value: {bool_value: true}},
              {key: 'float_hparam_differs_false' value: {number_value: 1024}},
              {key: 'float_hparam_differs_true' value: {number_value: 0.01}},
              {key: 'string_hparams_differs_false' value: {string_value: 'momentum'}},
              {key: 'string_hparams_differs_true' value: {string_value: 'CNN'}}
            ]
        """
        self.session_2_start_info_ = """
            hparams:[
              {key: 'bool_hparam_differs_true' value: {bool_value: false}},
              {key: 'float_hparam_differs_false' value: {number_value: 1024}},
              {key: 'float_hparam_differs_true' value: {number_value: 0.02}},
              {key: 'string_hparams_differs_false' value: {string_value: 'momentum'}},
              {key: 'string_hparams_differs_true' value: {string_value: 'LATTICE'}}
            ]
        """
        self.session_3_start_info_ = """
            hparams:[
              {key: 'bool_hparam_differs_false' value: {bool_value: false}},
              {key: 'bool_hparam_differs_true' value: {bool_value: false}},
              {key: 'float_hparam_differs_false' value: {number_value: 1024}},
              {key: 'float_hparam_differs_true' value: {number_value: 0.05}},
              {key: 'string_hparams_differs_false' value: {string_value: 'momentum'}},
              {key: 'string_hparams_differs_true' value: {string_value: 'CNN'}}
            ]
        """
        expected_exp = """
            hparam_infos: {
              name: 'bool_hparam_differs_false'
              type: DATA_TYPE_BOOL
              domain_discrete: {
                values: [{bool_value: false}]
              }
              differs: false
            }
            hparam_infos: {
              name: 'bool_hparam_differs_true'
              type: DATA_TYPE_BOOL
              domain_discrete: {
                values: [{bool_value: false}, {bool_value: true}]
              }
              differs: true
            }
            hparam_infos: {
              name: 'float_hparam_differs_false'
              type: DATA_TYPE_FLOAT64
              domain_interval {
                min_value: 1024
                max_value: 1024
              }
              differs: false
            }
            hparam_infos: {
              name: 'float_hparam_differs_true'
              type: DATA_TYPE_FLOAT64
              domain_interval {
                min_value: 0.01
                max_value: 0.05
              }
              differs: true
            }
            hparam_infos: {
              name: 'string_hparams_differs_false'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: 'momentum'}]
              }
              differs: false
            }
            hparam_infos: {
              name: 'string_hparams_differs_true'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: 'CNN'},
                         {string_value: 'LATTICE'}]
              }
              differs: true
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
        actual_exp = self._experiment_from_metadata()
        _canonicalize_experiment(actual_exp)
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_with_session_tags_different_hparam_types(self):
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
              differs: true
            }
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: '0.01'},
                         {string_value: '0.02'}]
              }
              differs: true
            }
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: 'CNN'},
                         {string_value: 'LATTICE'}]
              }
              differs: true
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
        actual_exp = self._experiment_from_metadata()
        _canonicalize_experiment(actual_exp)
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_with_session_tags_bool_types(self):
        self.session_1_start_info_ = """
            hparams:[
              {key: 'use_batch_norm' value: {bool_value: true}}
            ]
        """
        self.session_2_start_info_ = """
            hparams:[
              {key: 'use_batch_norm' value: {bool_value: true}}
            ]
        """
        self.session_3_start_info_ = """
            hparams:[
            ]
        """
        expected_exp = """
            hparam_infos: {
              name: 'use_batch_norm'
              type: DATA_TYPE_BOOL
              domain_discrete: {
                values: [{bool_value: true}]
              }
              differs: false
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
        actual_exp = self._experiment_from_metadata()
        _canonicalize_experiment(actual_exp)
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_with_session_tags_string_domain_and_invalid_number_values(
        self,
    ):
        self.session_1_start_info_ = """
            hparams:[
              {key: 'maybe_invalid' value: {string_value: 'force_to_string_type'}}
            ]
        """
        self.session_2_start_info_ = """
            hparams:[
              {key: 'maybe_invalid' value: {number_value: NaN}}
            ]
        """
        self.session_3_start_info_ = """
            hparams:[
              {key: 'maybe_invalid' value: {number_value: Infinity}}
            ]
        """
        expected_hparam_info = """
            name: 'maybe_invalid'
            type: DATA_TYPE_STRING
            domain_discrete: {
              values: [{string_value: 'force_to_string_type'}]
            }
        """
        actual_exp = self._experiment_from_metadata()
        self.assertLen(actual_exp.hparam_infos, 1)
        self.assertProtoEquals(expected_hparam_info, actual_exp.hparam_infos[0])

    def test_experiment_with_session_tags_include_metrics(self):
        self.session_1_start_info_ = """
            hparams: [
              {key: 'batch_size' value: {number_value: 100}}
            ]
        """
        with self.subTest("False"):
            response = self._experiment_from_metadata(include_metrics=False)
            self.assertEmpty(response.metric_infos)

        with self.subTest("True"):
            response = self._experiment_from_metadata(include_metrics=True)
            self.assertLen(response.metric_infos, 4)

    def test_experiment_without_any_hparams(self):
        actual_exp = self._experiment_from_metadata()
        self.assertIsInstance(actual_exp, api_pb2.Experiment)
        self.assertProtoEquals("", actual_exp)

    def test_experiment_from_data_provider_differs(self):
        self._hyperparameters = provider.ListHyperparametersResult(
            hyperparameters=[
                provider.Hyperparameter(
                    hyperparameter_name="hparam1_name",
                    hyperparameter_display_name="hparam1_display_name",
                    differs=True,
                ),
                provider.Hyperparameter(
                    hyperparameter_name="hparam2_name",
                    hyperparameter_display_name="hparam2_display_name",
                    differs=False,
                ),
            ],
            session_groups=[],
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        actual_exp = self._experiment_from_metadata()
        expected_exp = """
            hparam_infos: {
              name: 'hparam1_name'
              display_name: 'hparam1_display_name'
              differs: true
            }
            hparam_infos: {
              name: 'hparam2_name'
              display_name: 'hparam2_display_name'
              differs: false
            }
        """
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_data_provider_interval_hparam(self):
        self._hyperparameters = provider.ListHyperparametersResult(
            hyperparameters=[
                provider.Hyperparameter(
                    hyperparameter_name="hparam1_name",
                    hyperparameter_display_name="hparam1_display_name",
                    domain_type=provider.HyperparameterDomainType.INTERVAL,
                    domain=(-10.0, 15),
                )
            ],
            session_groups=[],
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        actual_exp = self._experiment_from_metadata()
        expected_exp = """
            hparam_infos: {
              name: 'hparam1_name'
              display_name: 'hparam1_display_name'
              type: DATA_TYPE_FLOAT64
              domain_interval: {
                min_value: -10.0
                max_value: 15
              }
            }
        """
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_data_provider_discrete_bool_hparam(self):
        self._hyperparameters = provider.ListHyperparametersResult(
            hyperparameters=[
                provider.Hyperparameter(
                    hyperparameter_name="hparam1_name",
                    hyperparameter_display_name="hparam1_display_name",
                    domain_type=provider.HyperparameterDomainType.DISCRETE_BOOL,
                    domain=[True],
                ),
                provider.Hyperparameter(
                    hyperparameter_name="hparam2_name",
                    hyperparameter_display_name="hparam2_display_name",
                    domain_type=provider.HyperparameterDomainType.DISCRETE_BOOL,
                    domain=[True, False],
                ),
                provider.Hyperparameter(
                    hyperparameter_name="hparam3_name",
                    hyperparameter_display_name="hparam3_display_name",
                    domain_type=provider.HyperparameterDomainType.DISCRETE_BOOL,
                    domain=[False],
                ),
                provider.Hyperparameter(
                    hyperparameter_name="hparam4_name",
                    hyperparameter_display_name="hparam4_display_name",
                    domain_type=provider.HyperparameterDomainType.DISCRETE_BOOL,
                    domain=[],
                ),
            ],
            session_groups=[],
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        actual_exp = self._experiment_from_metadata()
        expected_exp = """
            hparam_infos: {
              name: 'hparam1_name'
              display_name: 'hparam1_display_name'
              type: DATA_TYPE_BOOL
              domain_discrete: {
                values: [{bool_value: true}]
              }
            }
            hparam_infos: {
              name: 'hparam2_name'
              display_name: 'hparam2_display_name'
              type: DATA_TYPE_BOOL
              domain_discrete: {
                values: [{bool_value: true}, {bool_value: false}]
              }
            }
            hparam_infos: {
              name: 'hparam3_name'
              display_name: 'hparam3_display_name'
              type: DATA_TYPE_BOOL
              domain_discrete: {
                values: [{bool_value: false}]
              }
            }
            hparam_infos: {
              name: 'hparam4_name'
              display_name: 'hparam4_display_name'
              type: DATA_TYPE_BOOL
            }
        """
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_data_provider_discrete_float_hparam(self):
        self._hyperparameters = provider.ListHyperparametersResult(
            hyperparameters=[
                provider.Hyperparameter(
                    hyperparameter_name="hparam1_name",
                    hyperparameter_display_name="hparam1_display_name",
                    domain_type=provider.HyperparameterDomainType.DISCRETE_FLOAT,
                    domain=[-1.0, 1.5, 0.0],
                ),
            ],
            session_groups=[],
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        actual_exp = self._experiment_from_metadata()
        expected_exp = """
            hparam_infos: {
              name: 'hparam1_name'
              display_name: 'hparam1_display_name'
              type: DATA_TYPE_FLOAT64
              domain_discrete: {
                values: [
                  {number_value: -1.0},
                  {number_value: 1.5},
                  {number_value: 0.0}
                ]
              }
            }
        """
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_data_provider_discrete_string_hparam(self):
        self._hyperparameters = provider.ListHyperparametersResult(
            hyperparameters=[
                provider.Hyperparameter(
                    hyperparameter_name="hparam1_name",
                    hyperparameter_display_name="hparam1_display_name",
                    domain_type=provider.HyperparameterDomainType.DISCRETE_STRING,
                    domain=["one", "two", "aaaa"],
                ),
            ],
            session_groups=[],
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        actual_exp = self._experiment_from_metadata()
        expected_exp = """
            hparam_infos: {
              name: 'hparam1_name'
              display_name: 'hparam1_display_name'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [
                  {string_value: 'one'},
                  {string_value: 'two'},
                  {string_value: 'aaaa'}
                ]
              }
            }
        """
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_data_provider_session_groups(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        # The sessions chosen here mimic those returned in the implementation
        # of _mock_list_tensors. These work nicely with the scalars returned
        # in _mock_list_scalars and generate the same set of metric_infos as
        # the tensor-based tests in this file.
        self._hyperparameters = provider.ListHyperparametersResult(
            hyperparameters=[],
            session_groups=[
                provider.HyperparameterSessionGroup(
                    root=provider.HyperparameterSessionRun(
                        experiment_id="exp", run=""
                    ),
                    sessions=[
                        provider.HyperparameterSessionRun(
                            experiment_id="exp", run="session_1"
                        ),
                        provider.HyperparameterSessionRun(
                            experiment_id="exp", run="session_2"
                        ),
                    ],
                    hyperparameter_values=[],
                ),
                provider.HyperparameterSessionGroup(
                    root=provider.HyperparameterSessionRun(
                        experiment_id="exp", run=""
                    ),
                    sessions=[
                        provider.HyperparameterSessionRun(
                            experiment_id="exp", run="session_3"
                        ),
                    ],
                    hyperparameter_values=[],
                ),
            ],
        )
        actual_exp = self._experiment_from_metadata()
        expected_exp = """
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
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_data_provider_session_group_without_run_name(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = provider.ListHyperparametersResult(
            hyperparameters=[],
            session_groups=[
                provider.HyperparameterSessionGroup(
                    root=provider.HyperparameterSessionRun(
                        experiment_id="exp/session_1", run=""
                    ),
                    # The entire path to the run is encoded in the experiment_id
                    # to allow us to test empty run name while still generating
                    # metric_infos.
                    sessions=[
                        provider.HyperparameterSessionRun(
                            experiment_id="exp/session_1", run=""
                        ),
                    ],
                    hyperparameter_values=[],
                ),
            ],
        )
        actual_exp = self._experiment_from_metadata()
        expected_exp = """
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
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_data_provider_session_group_without_experiment_name(
        self,
    ):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = provider.ListHyperparametersResult(
            hyperparameters=[],
            session_groups=[
                provider.HyperparameterSessionGroup(
                    root=provider.HyperparameterSessionRun(
                        experiment_id="", run="exp/session_1"
                    ),
                    sessions=[
                        provider.HyperparameterSessionRun(
                            experiment_id="", run="exp/session_1"
                        ),
                    ],
                    hyperparameter_values=[],
                ),
            ],
        )
        actual_exp = self._experiment_from_metadata()
        expected_exp = """
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
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_data_provider_session_group_without_session_names(
        self,
    ):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = provider.ListHyperparametersResult(
            hyperparameters=[],
            session_groups=[
                provider.HyperparameterSessionGroup(
                    root=provider.HyperparameterSessionRun(
                        experiment_id="", run=""
                    ),
                    sessions=[
                        provider.HyperparameterSessionRun(
                            experiment_id="", run=""
                        ),
                    ],
                    hyperparameter_values=[],
                ),
            ],
        )
        actual_exp = self._experiment_from_metadata()
        # The result specifies a single session without explicit identifier. It
        # therefore represents a session that includes all run/tag combinations
        # as separate metric values.
        expected_exp = """
            metric_infos {
              name {
                group: "exp/session_1"
                tag: "accuracy"
              }
            }
            metric_infos {
              name {
                group: "exp/session_2"
                tag: "accuracy"
              }
            }
            metric_infos {
              name {
                group: "exp/session_3"
                tag: "accuracy"
              }
            }
            metric_infos {
              name {
                group: "."
                tag: "entropy"
              }
            }
            metric_infos {
              name {
                group: "exp/session_1"
                tag: "loss"
              }
            }
            metric_infos {
              name {
                group: "exp/session_1/eval"
                tag: "loss"
              }
            }
            metric_infos {
              name {
                group: "exp/session_1/train"
                tag: "loss"
              }
            }
            metric_infos {
              name {
                group: "exp/session_2"
                tag: "loss"
              }
            }
            metric_infos {
              name {
                group: "exp/session_2/eval"
                tag: "loss"
              }
            }
            metric_infos {
              name {
                group: "exp/session_2/train"
                tag: "loss"
              }
            }
            metric_infos {
              name {
                group: "exp/session_3"
                tag: "loss"
              }
            }
            metric_infos {
              name {
                group: "exp/session_3/eval"
                tag: "loss"
              }
            }
            metric_infos {
              name {
                group: "exp/session_3xyz"
                tag: "loss2"
              }
            }
        """
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_data_provider_include_metrics(self):
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._hyperparameters = provider.ListHyperparametersResult(
            hyperparameters=[],
            session_groups=[
                provider.HyperparameterSessionGroup(
                    root=provider.HyperparameterSessionRun(
                        experiment_id="exp", run=""
                    ),
                    sessions=[
                        provider.HyperparameterSessionRun(
                            experiment_id="exp", run="session_1"
                        ),
                    ],
                    hyperparameter_values=[],
                ),
            ],
        )

        with self.subTest("False"):
            response = self._experiment_from_metadata(include_metrics=False)
            self.assertEmpty(response.metric_infos)

        with self.subTest("True"):
            response = self._experiment_from_metadata(include_metrics=True)
            self.assertLen(response.metric_infos, 4)

    def test_experiment_from_data_provider_old_response_type(self):
        self._hyperparameters = [
            provider.Hyperparameter(
                hyperparameter_name="hparam1_name",
                hyperparameter_display_name="hparam1_display_name",
                domain_type=provider.HyperparameterDomainType.INTERVAL,
                domain=(-10.0, 15),
            )
        ]
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        actual_exp = self._experiment_from_metadata()
        expected_exp = """
            hparam_infos: {
              name: 'hparam1_name'
              display_name: 'hparam1_display_name'
              type: DATA_TYPE_FLOAT64
              domain_interval: {
                min_value: -10.0
                max_value: 15
              }
            }
        """
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_tags_with_hparams_limit_no_differed_hparams(self):
        experiment = """
            name: 'Test experiment'
            hparam_infos: {
              name: 'batch_size'
              type: DATA_TYPE_FLOAT64
              differs: false
            }
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
              differs: false
            }
            hparam_infos: {
              name: 'use_batch_norm'
              type: DATA_TYPE_BOOL
              differs: false
            }
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              differs: false
            }
        """
        t = provider.TensorTimeSeries(
            max_step=0,
            max_wall_time=0,
            plugin_content=self._serialized_plugin_data(
                DATA_TYPE_EXPERIMENT, experiment
            ),
            description="",
            display_name="",
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._mock_tb_context.data_provider.list_tensors.return_value = {
            "train": {metadata.EXPERIMENT_TAG: t}
        }
        expected_exp = """
            name: 'Test experiment'
            hparam_infos: {
              name: 'batch_size'
              type: DATA_TYPE_FLOAT64
              differs: false
            }
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
              differs: false
            }
        """
        actual_exp = self._experiment_from_metadata(
            include_metrics=False, hparams_limit=2
        )
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_tags_with_hparams_limit_returns_differed_hparams_first(
        self,
    ):
        experiment = """
            name: 'Test experiment'
            hparam_infos: {
              name: 'batch_size'
              type: DATA_TYPE_FLOAT64
              differs: false
            }
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
              differs: true
            }
            hparam_infos: {
              name: 'use_batch_norm'
              type: DATA_TYPE_BOOL
              differs: false
            }
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              differs: true
            }
        """
        t = provider.TensorTimeSeries(
            max_step=0,
            max_wall_time=0,
            plugin_content=self._serialized_plugin_data(
                DATA_TYPE_EXPERIMENT, experiment
            ),
            description="",
            display_name="",
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._mock_tb_context.data_provider.list_tensors.return_value = {
            "train": {metadata.EXPERIMENT_TAG: t}
        }
        expected_exp = """
            name: 'Test experiment'
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
              differs: true
            },
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              differs: true
            }
        """
        actual_exp = self._experiment_from_metadata(
            include_metrics=False, hparams_limit=2
        )
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_tags_sorts_differed_hparams_first(self):
        experiment = """
            name: 'Test experiment'
            hparam_infos: {
              name: 'batch_size'
              type: DATA_TYPE_FLOAT64
              differs: false
            }
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
              differs: true
            }
            hparam_infos: {
              name: 'use_batch_norm'
              type: DATA_TYPE_BOOL
              differs: false
            }
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              differs: true
            }
        """
        t = provider.TensorTimeSeries(
            max_step=0,
            max_wall_time=0,
            plugin_content=self._serialized_plugin_data(
                DATA_TYPE_EXPERIMENT, experiment
            ),
            description="",
            display_name="",
        )
        self._mock_tb_context.data_provider.list_tensors.side_effect = None
        self._mock_tb_context.data_provider.list_tensors.return_value = {
            "train": {metadata.EXPERIMENT_TAG: t}
        }
        expected_exp = """
            name: 'Test experiment'
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
              differs: true
            }
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              differs: true
            }
            hparam_infos: {
              name: 'batch_size'
              type: DATA_TYPE_FLOAT64
              differs: false
            }
            hparam_infos: {
              name: 'use_batch_norm'
              type: DATA_TYPE_BOOL
              differs: false
            }
        """
        actual_exp = self._experiment_from_metadata(
            include_metrics=False, hparams_limit=None
        )
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_runs_with_hparams_limit_no_differed_hparams(self):
        self.session_1_start_info_ = """
            hparams: [
              {key: 'lr' value: {number_value: 0.001}},
              {key: 'model_type' value: {string_value: 'LATTICE'}},
              {key: 'use_batch_norm' value: {bool_value: true}}
            ]
        """
        self.session_2_start_info_ = """
            hparams: [
              {key: 'lr' value: {number_value: 0.001}},
              {key: 'model_type' value: {string_value: 'LATTICE'}},
              {key: 'use_batch_norm' value: {bool_value: true}}
            ]
        """
        self.session_3_start_info_ = """
            hparams: [
              {key: 'lr' value: {number_value: 0.001}},
              {key: 'model_type' value: {string_value: 'LATTICE'}},
              {key: 'use_batch_norm' value: {bool_value: true}}
            ]
        """
        expected_exp = """
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
              domain_interval {
                min_value: 0.001
                max_value: 0.001
              }
              differs: false
            }
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: 'LATTICE'}]
              }
              differs: false
            }
        """
        actual_exp = self._experiment_from_metadata(
            include_metrics=False, hparams_limit=2
        )
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_runs_with_hparams_limit_returns_differed_hparams_first(
        self,
    ):
        self.session_1_start_info_ = """
            hparams: [
              {key: 'batch_size' value: {number_value: 200}},
              {key: 'lr' value: {number_value: 0.01}},
              {key: 'model_type' value: {string_value: 'CNN'}}
            ]
        """
        self.session_2_start_info_ = """
            hparams: [
              {key: 'batch_size' value: {number_value: 200}},
              {key: 'lr' value: {number_value: 0.02}},
              {key: 'model_type' value: {string_value: 'LATTICE'}}
            ]
        """
        self.session_3_start_info_ = """
            hparams: [
              {key: 'batch_size' value: {number_value: 200}},
              {key: 'lr' value: {number_value: 0.05}},
              {key: 'model_type' value: {string_value: 'CNN'}}
            ]
        """
        expected_exp = """
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
              domain_interval {
                min_value: 0.01
                max_value: 0.05
              }
              differs: true
            }
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: 'CNN'},
                         {string_value: 'LATTICE'}]
              }
              differs: true
            }
        """
        actual_exp = self._experiment_from_metadata(
            include_metrics=False, hparams_limit=2
        )
        _canonicalize_experiment(actual_exp)
        self.assertProtoEquals(expected_exp, actual_exp)

    def test_experiment_from_runs_sorts_differed_hparams_first(self):
        self.session_1_start_info_ = """
            hparams: [
              {key: 'batch_size' value: {number_value: 200}},
              {key: 'lr' value: {number_value: 0.01}},
              {key: 'model_type' value: {string_value: 'CNN'}},
              {key: 'use_batch_norm' value: {bool_value: false}}
            ]
        """
        self.session_2_start_info_ = """
            hparams: [
              {key: 'batch_size' value: {number_value: 300}},
              {key: 'lr' value: {number_value: 0.01}},
              {key: 'model_type' value: {string_value: 'CNN'}},
              {key: 'use_batch_norm' value: {bool_value: false}}
            ]
        """
        self.session_3_start_info_ = """
            hparams: [
              {key: 'batch_size' value: {number_value: 100}},
              {key: 'lr' value: {number_value: 0.01}},
              {key: 'model_type' value: {string_value: 'CNN'}},
              {key: 'use_batch_norm' value: {bool_value: true}}
            ]
        """
        expected_exp = """
            hparam_infos: {
              name: 'batch_size'
              type: DATA_TYPE_FLOAT64
              domain_interval {
                min_value: 100
                max_value: 300
              }
              differs: true
            }
            hparam_infos: {
              name: 'use_batch_norm'
              type: DATA_TYPE_BOOL
              domain_discrete: {
                values: [{bool_value: false}, {bool_value: true}]
              }
              differs: true
            }
            hparam_infos: {
              name: 'lr'
              type: DATA_TYPE_FLOAT64
              domain_interval {
                min_value: 0.01
                max_value: 0.01
              }
              differs: false
            }
            hparam_infos: {
              name: 'model_type'
              type: DATA_TYPE_STRING
              domain_discrete: {
                values: [{string_value: 'CNN'}]
              }
              differs: false
            }
        """
        actual_exp = self._experiment_from_metadata(
            include_metrics=False, hparams_limit=None
        )
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
