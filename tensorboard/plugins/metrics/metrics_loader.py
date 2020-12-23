# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""The TensorBoard metrics plugin loader."""


from tensorboard.plugins import base_plugin
from tensorboard.plugins import metrics_plugin


class MetricsLoader(base_plugin.TBLoader):
    """The loader for MetricsPlugin."""

    def load(self, context):
        """Loads or skips the plugin during setup phase.

        Args:
          context: The TBContext instance.
        """
        if not context._data_provider:
            return None
        return metrics_plugin.MetricsPlugin(context)
