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
"""Information on the graph plugin."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

# This name is used as the plugin prefix route and to identify this plugin
# generally.
# Note however that different 'plugin names' are used in the context of
# graph Summaries.
# See `graphs_plugin.py` for details.
PLUGIN_NAME = "graphs"

# In the context of the data provider interface, tag name given to a
# graph read from the `graph_def` field of an `Event` proto, which is
# not attached to a summary and thus does not have a proper tag name of
# its own. Run level graphs always represent `GraphDef`s (graphs of
# TensorFlow ops), never conceptual graphs, profile graphs, etc.
#
# No other types of graphs are currently supported in the data provider
# interface; when added, they'll have type-specific name scopes (like
# `"__op_graph__/foo"`, `"__conceptual_graph__/bar"`) to preclude
# collisions with this hard-coded string.
RUN_GRAPH_NAME = "__run_graph__"
