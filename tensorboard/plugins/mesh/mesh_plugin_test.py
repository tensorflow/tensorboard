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
"""Tests the Tensorboard mesh plugin."""

import collections.abc
import os
import shutil
import numpy as np
import tensorflow as tf
import time
from unittest import mock

from werkzeug import test as werkzeug_test
from werkzeug import wrappers
from tensorboard.backend import application
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.plugins import base_plugin
from tensorboard.plugins.mesh import mesh_plugin
from tensorboard.plugins.mesh import summary
from tensorboard.plugins.mesh import plugin_data_pb2
from tensorboard.plugins.mesh import test_utils
from tensorboard.util import test_util as tensorboard_test_util


class MeshPluginTest(tf.test.TestCase):
    """Tests for mesh plugin server."""

    def setUp(self):
        # We use numpy.random to generate meshes. We seed to avoid non-determinism
        # in this test.
        np.random.seed(17)

        # Log dir to save temp events into.
        self.log_dir = self.get_temp_dir()

        # Create mesh summary.
        with tf.compat.v1.Graph().as_default():
            tf_placeholder = tf.compat.v1.placeholder
            sess = tf.compat.v1.Session()
            point_cloud = test_utils.get_random_mesh(1000)
            point_cloud_vertices = tf_placeholder(
                tf.float32, point_cloud.vertices.shape
            )

            mesh_no_color = test_utils.get_random_mesh(2000, add_faces=True)
            mesh_no_color_extended = test_utils.get_random_mesh(
                2500, add_faces=True
            )
            mesh_no_color_vertices = tf_placeholder(tf.float32, [1, None, 3])
            mesh_no_color_faces = tf_placeholder(tf.int32, [1, None, 3])

            mesh_color = test_utils.get_random_mesh(
                3000, add_faces=True, add_colors=True
            )
            mesh_color_vertices = tf_placeholder(
                tf.float32, mesh_color.vertices.shape
            )
            mesh_color_faces = tf_placeholder(tf.int32, mesh_color.faces.shape)
            mesh_color_colors = tf_placeholder(
                tf.uint8, mesh_color.colors.shape
            )

            self.data = [
                point_cloud,
                mesh_no_color,
                mesh_no_color_extended,
                mesh_color,
            ]

            # In case when name is present and display_name is not, we will reuse name
            # as display_name. Summaries below intended to test both cases.
            self.names = ["point_cloud", "mesh_no_color", "mesh_color"]
            summary.op(
                self.names[0],
                point_cloud_vertices,
                description="just point cloud",
            )
            summary.op(
                self.names[1],
                mesh_no_color_vertices,
                faces=mesh_no_color_faces,
                display_name="name_to_display_in_ui",
                description="beautiful mesh in grayscale",
            )
            summary.op(
                self.names[2],
                mesh_color_vertices,
                faces=mesh_color_faces,
                colors=mesh_color_colors,
                description="mesh with random colors",
            )

            merged_summary_op = tf.compat.v1.summary.merge_all()
            self.runs = ["bar"]
            self.steps = 20
            bar_directory = os.path.join(self.log_dir, self.runs[0])
            with tensorboard_test_util.FileWriterCache.get(
                bar_directory
            ) as writer:
                writer.add_graph(sess.graph)
                for step in range(self.steps):
                    # Alternate between two random meshes with different number of
                    # vertices.
                    no_color = (
                        mesh_no_color
                        if step % 2 == 0
                        else mesh_no_color_extended
                    )
                    with mock.patch.object(time, "time", return_value=step):
                        writer.add_summary(
                            sess.run(
                                merged_summary_op,
                                feed_dict={
                                    point_cloud_vertices: point_cloud.vertices,
                                    mesh_no_color_vertices: no_color.vertices,
                                    mesh_no_color_faces: no_color.faces,
                                    mesh_color_vertices: mesh_color.vertices,
                                    mesh_color_faces: mesh_color.faces,
                                    mesh_color_colors: mesh_color.colors,
                                },
                            ),
                            global_step=step,
                        )

        # Start a server that will receive requests.
        multiplexer = event_multiplexer.EventMultiplexer(
            {
                "bar": bar_directory,
            }
        )
        provider = data_provider.MultiplexerDataProvider(
            multiplexer, self.log_dir
        )
        self.context = base_plugin.TBContext(
            logdir=self.log_dir, data_provider=provider
        )
        self.plugin = mesh_plugin.MeshPlugin(self.context)
        # Wait until after plugin construction to reload the multiplexer because the
        # plugin caches data from the multiplexer upon construction and this affects
        # logic tested later down.
        # TODO(https://github.com/tensorflow/tensorboard/issues/2579): Eliminate the
        # caching of data at construction time and move this Reload() up to just
        # after the multiplexer is created.
        multiplexer.Reload()
        wsgi_app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(wsgi_app, wrappers.Response)
        self.routes = self.plugin.get_plugin_apps()

    def tearDown(self):
        shutil.rmtree(self.log_dir, ignore_errors=True)

    def testRoutes(self):
        """Tests that the /tags route offers the correct run to tag mapping."""
        self.assertIsInstance(self.routes["/tags"], collections.abc.Callable)
        self.assertIsInstance(self.routes["/meshes"], collections.abc.Callable)
        self.assertIsInstance(self.routes["/data"], collections.abc.Callable)

    def testTagsRoute(self):
        """Tests that the /tags route offers the correct run to tag mapping."""
        response = self.server.get("/data/plugin/mesh/tags")
        self.assertEqual(200, response.status_code)
        tags = test_utils.deserialize_json_response(response.get_data())
        self.assertIn(self.runs[0], tags)
        for name in self.names:
            self.assertIn(name, tags[self.runs[0]])

    def validate_data_response(
        self, run, tag, sample, content_type, dtype, ground_truth_data, step=0
    ):
        """Makes request and checks that response has expected data."""
        response = self.server.get(
            "/data/plugin/mesh/data?run=%s&tag=%s&sample=%d&content_type="
            "%s&step=%d" % (run, tag, sample, content_type, step)
        )
        self.assertEqual(200, response.status_code)
        data = test_utils.deserialize_array_buffer_response(
            next(response.response), dtype
        )
        self.assertEqual(ground_truth_data.reshape(-1).tolist(), data.tolist())

    def testDataRoute(self):
        """Tests that the /data route returns correct data for meshes."""
        self.validate_data_response(
            self.runs[0],
            self.names[0],
            0,
            "VERTEX",
            np.float32,
            self.data[0].vertices,
        )

        self.validate_data_response(
            self.runs[0], self.names[1], 0, "FACE", np.int32, self.data[1].faces
        )

        # Validate that the same summary has mesh with different number of faces at
        # different step=1.
        self.validate_data_response(
            self.runs[0],
            self.names[1],
            0,
            "FACE",
            np.int32,
            self.data[2].faces,
            step=1,
        )

        self.validate_data_response(
            self.runs[0],
            self.names[2],
            0,
            "COLOR",
            np.uint8,
            self.data[3].colors,
        )

    def testMetadataRoute(self):
        """Tests that the /meshes route returns correct metadata for meshes."""
        response = self.server.get(
            "/data/plugin/mesh/meshes?run=%s&tag=%s&sample=%d"
            % (self.runs[0], self.names[0], 0)
        )
        self.assertEqual(200, response.status_code)
        metadata = test_utils.deserialize_json_response(response.get_data())
        self.assertEqual(len(metadata), self.steps)
        self.assertAllEqual(
            metadata[0]["content_type"], plugin_data_pb2.MeshPluginData.VERTEX
        )
        self.assertAllEqual(
            metadata[0]["data_shape"], self.data[0].vertices.shape
        )

    def testsEventsAlwaysSortedByStep(self):
        """Tests that events always sorted by step."""
        response = self.server.get(
            "/data/plugin/mesh/meshes?run=%s&tag=%s&sample=%d"
            % (self.runs[0], self.names[1], 0)
        )
        self.assertEqual(200, response.status_code)
        metadata = test_utils.deserialize_json_response(response.get_data())
        for i in range(1, self.steps):
            # Step will be equal when two tensors of different content type
            # belong to the same mesh.
            self.assertLessEqual(metadata[i - 1]["step"], metadata[i]["step"])

    def testIsActive(self):
        self.assertFalse(self.plugin.is_active())


if __name__ == "__main__":
    tf.test.main()
