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
"""Tests for download_data."""


from unittest import mock

from google.protobuf import text_format
import tensorflow as tf

from tensorboard.backend.event_processing import plugin_event_multiplexer
from tensorboard.plugins import base_plugin
from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import backend_context
from tensorboard.plugins.hparams import download_data

EXPERIMENT = """
description: 'Test experiment'
user: 'Test user'
hparam_infos: [
  {
    name: 'initial_temp'
    type: DATA_TYPE_FLOAT64
  },
  {
    name: 'final_temp'
    type: DATA_TYPE_FLOAT64
  },
  { name: 'string_hparam' },
  { name: 'bool_hparam' },
  { name: 'optional_string_hparam' }
]
metric_infos: [
  { name: { tag: 'current_temp' } },
  { name: { tag: 'delta_temp' } },
  { name: { tag: 'optional_metric' } }
]
"""

SESSION_GROUPS = """
session_groups {
  name: "group_1"
  hparams { key: "bool_hparam" value { bool_value: true } }
  hparams { key: "final_temp" value { number_value: 150.0 } }
  hparams { key: "initial_temp" value { number_value: 270.0 } }
  hparams { key: "string_hparam" value { string_value: "a string" } }
  metric_values {
    name { tag: "current_temp" }
    value: 10
    training_step: 1
    wall_time_secs: 1.0
  }
  metric_values { name { tag: "delta_temp" } value: 15
    training_step: 2
    wall_time_secs: 10.0
  }
  metric_values { name { tag: "optional_metric" } value: 33
    training_step: 20
    wall_time_secs: 2.0
  }
  sessions {
    name: "session_1"
    start_time_secs: 314159
    end_time_secs: 314164
    status: STATUS_SUCCESS
    metric_values {
      name { tag: "current_temp" }
      value: 10
      training_step: 1
      wall_time_secs: 1.0
    }
    metric_values {
      name { tag: "delta_temp" }
      value: 15
      training_step: 2
      wall_time_secs: 10.0
    }

    metric_values {
      name { tag: "optional_metric" }
      value: 33
      training_step: 20
      wall_time_secs: 2.0
    }
  }
}
session_groups {
  name: "group_2"
  hparams { key: "bool_hparam" value { bool_value: false } }
  hparams { key: "final_temp" value { number_value: 100.0 } }
  hparams { key: "initial_temp" value { number_value: 280.0 } }
  hparams { key: "string_hparam" value { string_value: "AAAAA"}}
  metric_values {
    name { tag: "current_temp" }
    value: 51.0
    training_step: 1
    wall_time_secs: 1.0
  }
  metric_values {
    name { tag: "delta_temp" }
    value: 44.5
    training_step: 2
    wall_time_secs: 10.3333333
  }
  sessions {
    name: "session_2"
    start_time_secs: 314159
    end_time_secs: 314164
    status: STATUS_SUCCESS
    metric_values {
      name { tag: "current_temp" }
      value: 100
      training_step: 1
      wall_time_secs: 1.0
    }
    metric_values { name { tag: "delta_temp" }
      value: 150
      training_step: 3
      wall_time_secs: 11.0
    }
  }
  sessions {
    name: "session_3"
    start_time_secs: 314159
    end_time_secs: 314164
    status: STATUS_FAILURE
    metric_values {
      name { tag: "current_temp" }
      value: 1.0
      training_step: 1
      wall_time_secs: 1.0
    }
    metric_values { name { tag: "delta_temp" }
      value: 1.5
      training_step: 2
      wall_time_secs: 10.0
    }
  }
  sessions {
    name: "session_5"
    start_time_secs: 314159
    end_time_secs: 314164
    status: STATUS_SUCCESS
    metric_values {
      name { tag: "current_temp" }
      value: 52.0
      training_step: 1
      wall_time_secs: 1.0
    }
    metric_values { name { tag: "delta_temp" }
      value: -18
      training_step: 2
      wall_time_secs: 10.0
    }
  }
}
session_groups {
  name: "group_3"
  hparams { key: "bool_hparam" value { bool_value: true } }
  hparams { key: "final_temp" value { number_value: 0.000012 } }
  hparams { key: "initial_temp" value { number_value: 300.0 } }
  hparams { key: "string_hparam" value { string_value: "a string_3"}}
  hparams {
    key: 'optional_string_hparam' value { string_value: 'BB' }
  }
  metric_values {
    name { tag: "current_temp" }
    value: 101.0
    training_step: 1
    wall_time_secs: 1.0
  }
  metric_values { name { tag: "delta_temp" } value: -15100000.0
    training_step: 2
    wall_time_secs: 10.0
  }
  sessions {
    name: "session_4"
    start_time_secs: 314159
    end_time_secs: 314164
    status: STATUS_UNKNOWN
    metric_values {
      name { tag: "current_temp" }
      value: 101.0
      training_step: 1
      wall_time_secs: 1.0
    }
    metric_values { name { tag: "delta_temp" } value: -151000000.0
      training_step: 2
      wall_time_secs: 10.0
    }
  }
}
total_size: 3
"""


EXPECTED_LATEX = r"""\begin{table}[tbp]
\begin{tabular}{llllllll}
initial\_temp & final\_temp & string\_hparam & bool\_hparam & optional\_string\_hparam & current\_temp & delta\_temp & optional\_metric \\ \hline
$270$ & $150$ & a string & $1$ &  & $10$ & $15$ & $33$ \\
$280$ & $100$ & AAAAA & $0$ &  & $51$ & $44.5$ & - \\
$300$ & $1.2\cdot 10^{-5}$ & a string\_3 & $1$ & BB & $101$ & $-1.51\cdot 10^{7}$ & - \\
\hline
\end{tabular}
\end{table}
"""

EXPECTED_CSV = """initial_temp,final_temp,string_hparam,bool_hparam,optional_string_hparam,current_temp,delta_temp,optional_metric\r
270.0,150.0,a string,True,,10.0,15.0,33.0\r
280.0,100.0,AAAAA,False,,51.0,44.5,\r
300.0,1.2e-05,a string_3,True,BB,101.0,-15100000.0,\r
"""


class DownloadDataTest(tf.test.TestCase):
    def setUp(self):
        self._mock_multiplexer = mock.create_autospec(
            plugin_event_multiplexer.EventMultiplexer
        )
        self._mock_tb_context = base_plugin.TBContext(
            multiplexer=self._mock_multiplexer
        )

    def _run_handler(self, experiment, session_groups, response_format):
        experiment_proto = text_format.Merge(experiment, api_pb2.Experiment())
        session_groups_proto = text_format.Merge(
            session_groups, api_pb2.ListSessionGroupsResponse()
        )
        num_columns = len(experiment_proto.hparam_infos) + len(
            experiment_proto.metric_infos
        )
        handler = download_data.Handler(
            backend_context.Context(self._mock_tb_context),
            experiment_proto,
            session_groups_proto,
            response_format,
            [True] * num_columns,
        )
        return handler.run()

    def test_csv(self):
        body, mime_type = self._run_handler(
            EXPERIMENT, SESSION_GROUPS, download_data.OutputFormat.CSV
        )
        self.assertEqual("text/csv", mime_type)
        self.assertEqual(EXPECTED_CSV, body)

    def test_latex(self):
        body, mime_type = self._run_handler(
            EXPERIMENT, SESSION_GROUPS, download_data.OutputFormat.LATEX
        )
        self.assertEqual("application/x-latex", mime_type)
        self.assertEqual(EXPECTED_LATEX, body)

    def test_json(self):
        body, mime_type = self._run_handler(
            EXPERIMENT, SESSION_GROUPS, download_data.OutputFormat.JSON
        )
        self.assertEqual("application/json", mime_type)
        expected_result = {
            "header": [
                "initial_temp",
                "final_temp",
                "string_hparam",
                "bool_hparam",
                "optional_string_hparam",
                "current_temp",
                "delta_temp",
                "optional_metric",
            ],
            "rows": [
                [270.0, 150.0, "a string", True, "", 10.0, 15.0, 33.0],
                [280.0, 100.0, "AAAAA", False, "", 51.0, 44.5, None],
                [
                    300.0,
                    1.2e-05,
                    "a string_3",
                    True,
                    "BB",
                    101.0,
                    -15100000.0,
                    None,
                ],
            ],
        }
        self.assertEqual(expected_result, body)


if __name__ == "__main__":
    tf.test.main()
