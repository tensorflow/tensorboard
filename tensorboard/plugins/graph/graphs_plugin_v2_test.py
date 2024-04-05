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
"""Integration tests for the Graphs Plugin for TensorFlow v2."""


import numpy as np
import os.path

from google.protobuf import text_format
import tensorflow as tf

from tensorboard.compat.proto import graph_pb2
from tensorboard.plugins.graph import graphs_plugin_test


# Graph plugin V2 Keras 3 is only supported in TensorFlow eager mode.
tf.compat.v1.enable_eager_execution()


class GraphsPluginV2Test(
    graphs_plugin_test.GraphsPluginBaseTest, tf.test.TestCase
):
    def generate_run(
        self, logdir, run_name, include_graph, include_run_metadata
    ):
        x, y = np.ones((10, 10)), np.ones((10, 1))
        val_x, val_y = np.ones((4, 10)), np.ones((4, 1))

        model = tf.keras.Sequential(
            [
                tf.keras.layers.Dense(10, activation="relu"),
                tf.keras.layers.Dense(1, activation="sigmoid"),
            ]
        )
        model.compile(optimizer="rmsprop", loss="binary_crossentropy")

        model.fit(
            x,
            y,
            validation_data=(val_x, val_y),
            batch_size=2,
            epochs=1,
            callbacks=[
                tf.keras.callbacks.TensorBoard(
                    log_dir=os.path.join(logdir, run_name),
                    write_graph=include_graph,
                )
            ],
        )

    def _get_graph(self, plugin, *args, **kwargs):
        """Fetch and return the graph as a proto."""
        (graph_pbtxt, mime_type) = plugin.graph_impl(*args, **kwargs)
        self.assertEqual(mime_type, "text/x-protobuf")
        return text_format.Parse(graph_pbtxt, graph_pb2.GraphDef())

    def test_info(self):
        raise self.skipTest(
            "TODO: enable this after tf-nightly writes a conceptual graph."
        )

        plugin = self.load_plugin(
            [
                graphs_plugin_test._RUN_WITH_GRAPH_WITH_METADATA,
                graphs_plugin_test._RUN_WITHOUT_GRAPH_WITH_METADATA,
            ]
        )
        expected = {
            "w_graph_wo_meta": {
                "run": "w_graph_wo_meta",
                "run_graph": True,
                "tags": {
                    "keras": {
                        "conceptual_graph": True,
                        "profile": False,
                        "tag": "keras",
                        "op_graph": False,
                    },
                },
            },
        }

        self.generate_run(
            "w_graph_wo_meta", include_graph=True, include_run_metadata=False
        )
        self.generate_run(
            "wo_graph_wo_meta", include_graph=False, include_run_metadata=False
        )
        self.bootstrap_plugin()

        self.assertEqual(expected, plugin.info_impl())

    def test_graph_conceptual_graph(self):
        raise self.skipTest(
            "TODO: enable this after tf-nightly writes a conceptual graph."
        )

        self.generate_run(
            self._RUN_WITH_GRAPH, include_graph=True, include_run_metadata=False
        )
        self.bootstrap_plugin()

        graph = self._get_graph(
            self._RUN_WITH_GRAPH, tag="keras", is_conceptual=True
        )
        node_names = set(node.name for node in graph.node)
        self.assertEqual({"sequential/dense", "sequential/dense_1"}, node_names)


if __name__ == "__main__":
    tf.test.main()
