# -*- coding: utf-8 -*-
# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""Integration tests for the Embedding Projector."""


import gzip
import io
import json
import os
import numpy as np
import tensorflow as tf
import unittest

from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from google.protobuf import text_format

from tensorboard.backend import application
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.compat.proto import event_pb2
from tensorboard.compat.proto import summary_pb2
from tensorboard.compat import tf as tf_compat
from tensorboard.plugins import base_plugin
from tensorboard.plugins.projector import projector_config_pb2
from tensorboard.plugins.projector import projector_plugin
from tensorboard.util import test_util

tf.compat.v1.disable_v2_behavior()

USING_REAL_TF = tf_compat.__version__ != "stub"


class ProjectorAppTest(tf.test.TestCase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.logdir = None
        self.plugin = None
        self.server = None

    def setUp(self):
        self.log_dir = self.get_temp_dir()

    def testRunsWithValidCheckpoint(self):
        self._GenerateProjectorTestData()
        self._SetupWSGIApp()
        run_json = self._GetJson("/data/plugin/projector/runs")
        if USING_REAL_TF:
            self.assertTrue(run_json)
        else:
            self.assertFalse(run_json)

    def testRunsWithNoCheckpoint(self):
        self._SetupWSGIApp()
        run_json = self._GetJson("/data/plugin/projector/runs")
        self.assertEqual(run_json, [])

    def testRunsWithInvalidModelCheckpointPath(self):
        checkpoint_file = os.path.join(self.log_dir, "checkpoint")
        f = open(checkpoint_file, "w")
        f.write('model_checkpoint_path: "does_not_exist"\n')
        f.write('all_model_checkpoint_paths: "does_not_exist"\n')
        f.close()
        self._SetupWSGIApp()

        run_json = self._GetJson("/data/plugin/projector/runs")
        self.assertEqual(run_json, [])

    # TODO(#2007): Cleanly separate out projector tests that require real TF
    @unittest.skipUnless(USING_REAL_TF, "Test only passes when using real TF")
    def testRunsWithInvalidModelCheckpointPathInConfig(self):
        config_path = os.path.join(self.log_dir, "projector_config.pbtxt")
        config = projector_config_pb2.ProjectorConfig()
        config.model_checkpoint_path = "does_not_exist"
        embedding = config.embeddings.add()
        embedding.tensor_name = "var1"
        with tf.io.gfile.GFile(config_path, "w") as f:
            f.write(text_format.MessageToString(config))
        self._SetupWSGIApp()

        run_json = self._GetJson("/data/plugin/projector/runs")
        self.assertEqual(run_json, [])

    # TODO(#2007): Cleanly separate out projector tests that require real TF
    @unittest.skipUnless(USING_REAL_TF, "Test only passes when using real TF")
    def testInfoWithValidCheckpointNoEventsData(self):
        self._GenerateProjectorTestData()
        self._SetupWSGIApp()

        info_json = self._GetJson("/data/plugin/projector/info?run=.")
        self.assertCountEqual(
            info_json["embeddings"],
            [
                {
                    "tensorShape": [1, 2],
                    "tensorName": "var1",
                    "bookmarksPath": "bookmarks.json",
                },
                {"tensorShape": [10, 10], "tensorName": "var2"},
                {"tensorShape": [100, 100], "tensorName": "var3"},
            ],
        )

    # TODO(#2007): Cleanly separate out projector tests that require real TF
    @unittest.skipUnless(USING_REAL_TF, "Test only passes when using real TF")
    def testInfoWithValidCheckpointAndEventsData(self):
        self._GenerateProjectorTestData()
        self._GenerateEventsData()
        self._SetupWSGIApp()

        run_json = self._GetJson("/data/plugin/projector/runs")
        self.assertTrue(run_json)
        run = run_json[0]
        info_json = self._GetJson("/data/plugin/projector/info?run=%s" % run)
        self.assertCountEqual(
            info_json["embeddings"],
            [
                {
                    "tensorShape": [1, 2],
                    "tensorName": "var1",
                    "bookmarksPath": "bookmarks.json",
                },
                {"tensorShape": [10, 10], "tensorName": "var2"},
                {"tensorShape": [100, 100], "tensorName": "var3"},
            ],
        )

    # TODO(#2007): Cleanly separate out projector tests that require real TF
    @unittest.skipUnless(USING_REAL_TF, "Test only passes when using real TF")
    def testTensorWithValidCheckpoint(self):
        self._GenerateProjectorTestData()
        self._SetupWSGIApp()

        url = "/data/plugin/projector/tensor?run=.&name=var1"
        tensor_bytes = self._Get(url).data
        expected_tensor = np.array([[6, 6]], dtype=np.float32)
        self._AssertTensorResponse(tensor_bytes, expected_tensor)

    def testBookmarksRequestMissingRunAndName(self):
        self._GenerateProjectorTestData()
        self._SetupWSGIApp()

        url = "/data/plugin/projector/bookmarks"
        self.assertEqual(self._Get(url).status_code, 400)

    def testBookmarksRequestMissingName(self):
        self._GenerateProjectorTestData()
        self._SetupWSGIApp()

        url = "/data/plugin/projector/bookmarks?run=."
        self.assertEqual(self._Get(url).status_code, 400)

    def testBookmarksRequestMissingRun(self):
        self._GenerateProjectorTestData()
        self._SetupWSGIApp()

        url = "/data/plugin/projector/bookmarks?name=var1"
        self.assertEqual(self._Get(url).status_code, 400)

    def testBookmarksUnknownRun(self):
        self._GenerateProjectorTestData()
        self._SetupWSGIApp()

        url = "/data/plugin/projector/bookmarks?run=unknown&name=var1"
        self.assertEqual(self._Get(url).status_code, 400)

    def testBookmarksUnknownName(self):
        self._GenerateProjectorTestData()
        self._SetupWSGIApp()

        url = "/data/plugin/projector/bookmarks?run=.&name=unknown"
        self.assertEqual(self._Get(url).status_code, 400)

    # TODO(#2007): Cleanly separate out projector tests that require real TF
    @unittest.skipUnless(USING_REAL_TF, "Test only passes when using real TF")
    def testBookmarks(self):
        self._GenerateProjectorTestData()
        self._SetupWSGIApp()

        url = "/data/plugin/projector/bookmarks?run=.&name=var1"
        bookmark = self._GetJson(url)
        self.assertEqual(bookmark, {"a": "b"})

    def testEndpointsNoAssets(self):
        g = tf.Graph()

        with test_util.FileWriterCache.get(self.log_dir) as writer:
            writer.add_graph(g)

        self._SetupWSGIApp()
        run_json = self._GetJson("/data/plugin/projector/runs")
        self.assertEqual(run_json, [])

    def _AssertTensorResponse(self, tensor_bytes, expected_tensor):
        tensor = np.reshape(
            np.frombuffer(tensor_bytes, dtype=np.float32), expected_tensor.shape
        )
        self.assertTrue(np.array_equal(tensor, expected_tensor))

    # TODO(#2007): Cleanly separate out projector tests that require real TF
    @unittest.skipUnless(USING_REAL_TF, "Test only passes when using real TF")
    def testPluginIsActive(self):
        self._GenerateProjectorTestData()
        self._SetupWSGIApp()

        patcher = tf.compat.v1.test.mock.patch(
            "threading.Thread.start", autospec=True
        )
        mock = patcher.start()
        self.addCleanup(patcher.stop)

        # The projector plugin has not yet determined whether it is active, but it
        # should now start a thread to determine that.
        self.assertFalse(self.plugin.is_active())
        thread = self.plugin._thread_for_determining_is_active
        mock.assert_called_once_with(thread)

        # The logic has not finished running yet, so the plugin should still not
        # have deemed itself to be active.
        self.assertFalse(self.plugin.is_active())
        mock.assert_called_once_with(thread)

        self.plugin._thread_for_determining_is_active.run()

        # The plugin later finds that embedding data is available.
        self.assertTrue(self.plugin.is_active())

        # Subsequent calls to is_active should not start a new thread. The mock
        # should only have been called once throughout this test.
        self.assertTrue(self.plugin.is_active())
        mock.assert_called_once_with(thread)

    def testPluginIsNotActive(self):
        self._SetupWSGIApp()

        # The is_active method makes use of a separate thread, so we mock threading
        # behavior to make this test deterministic.
        patcher = tf.compat.v1.test.mock.patch(
            "threading.Thread.start", autospec=True
        )
        mock = patcher.start()
        self.addCleanup(patcher.stop)

        # The projector plugin has not yet determined whether it is active, but it
        # should now start a thread to determine that.
        self.assertFalse(self.plugin.is_active())
        mock.assert_called_once_with(
            self.plugin._thread_for_determining_is_active
        )

        self.plugin._thread_for_determining_is_active.run()

        # The plugin later finds that embedding data is not available.
        self.assertFalse(self.plugin.is_active())

        # Furthermore, the plugin should have spawned a new thread to check whether
        # it is active (because it might now be active even though it had not been
        # beforehand), so the mock should now be called twice.
        self.assertEqual(2, mock.call_count)

    def _SetupWSGIApp(self):
        logdir = self.log_dir
        multiplexer = event_multiplexer.EventMultiplexer()
        provider = data_provider.MultiplexerDataProvider(multiplexer, logdir)
        context = base_plugin.TBContext(logdir=logdir, data_provider=provider)
        self.plugin = projector_plugin.ProjectorPlugin(context)
        wsgi_app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(wsgi_app, wrappers.Response)

    def _Get(self, path):
        return self.server.get(path)

    def _GetJson(self, path):
        response = self.server.get(path)
        data = response.data
        if response.headers.get("Content-Encoding") == "gzip":
            data = gzip.GzipFile("", "rb", 9, io.BytesIO(data)).read()
        return json.loads(data.decode("utf-8"))

    def _GenerateEventsData(self):
        with test_util.FileWriterCache.get(self.log_dir) as fw:
            event = event_pb2.Event(
                wall_time=1,
                step=1,
                summary=summary_pb2.Summary(
                    value=[summary_pb2.Summary.Value(tag="s1", simple_value=0)]
                ),
            )
            fw.add_event(event)

    def _GenerateProjectorTestData(self):
        config_path = os.path.join(self.log_dir, "projector_config.pbtxt")
        config = projector_config_pb2.ProjectorConfig()
        embedding = config.embeddings.add()
        # Add an embedding by its canonical tensor name.
        embedding.tensor_name = "var1:0"

        with tf.io.gfile.GFile(
            os.path.join(self.log_dir, "bookmarks.json"), "w"
        ) as f:
            f.write('{"a": "b"}')
        embedding.bookmarks_path = "bookmarks.json"

        config_pbtxt = text_format.MessageToString(config)
        with tf.io.gfile.GFile(config_path, "w") as f:
            f.write(config_pbtxt)

        # Write a checkpoint with some dummy variables.
        with tf.Graph().as_default():
            sess = tf.compat.v1.Session()
            checkpoint_path = os.path.join(self.log_dir, "model")
            tf.compat.v1.get_variable(
                "var1", initializer=tf.constant(np.full([1, 2], 6.0))
            )
            tf.compat.v1.get_variable("var2", [10, 10])
            tf.compat.v1.get_variable("var3", [100, 100])
            sess.run(tf.compat.v1.global_variables_initializer())
            saver = tf.compat.v1.train.Saver(
                write_version=tf.compat.v1.train.SaverDef.V1
            )
            saver.save(sess, checkpoint_path)


class MetadataColumnsTest(tf.test.TestCase):
    def testLengthDoesNotMatch(self):
        metadata = projector_plugin.EmbeddingMetadata(10)

        with self.assertRaises(ValueError):
            metadata.add_column("Labels", [""] * 11)

    def testValuesNot1D(self):
        metadata = projector_plugin.EmbeddingMetadata(3)
        values = np.array([[1, 2, 3]])

        with self.assertRaises(ValueError):
            metadata.add_column("Labels", values)

    def testMultipleColumnsRetrieval(self):
        metadata = projector_plugin.EmbeddingMetadata(3)
        metadata.add_column("Sizes", [1, 2, 3])
        metadata.add_column("Labels", ["a", "b", "c"])
        self.assertEqual(metadata.column_names, ["Sizes", "Labels"])
        self.assertEqual(metadata.name_to_values["Labels"], ["a", "b", "c"])
        self.assertEqual(metadata.name_to_values["Sizes"], [1, 2, 3])

    def testValuesAreListofLists(self):
        metadata = projector_plugin.EmbeddingMetadata(3)
        values = [[1, 2, 3], [4, 5, 6]]
        with self.assertRaises(ValueError):
            metadata.add_column("Labels", values)

    def testStringListRetrieval(self):
        metadata = projector_plugin.EmbeddingMetadata(3)
        metadata.add_column("Labels", ["a", "B", "c"])
        self.assertEqual(metadata.name_to_values["Labels"], ["a", "B", "c"])
        self.assertEqual(metadata.column_names, ["Labels"])

    def testNumericListRetrieval(self):
        metadata = projector_plugin.EmbeddingMetadata(3)
        metadata.add_column("Labels", [1, 2, 3])
        self.assertEqual(metadata.name_to_values["Labels"], [1, 2, 3])

    def testNumericNdArrayRetrieval(self):
        metadata = projector_plugin.EmbeddingMetadata(3)
        metadata.add_column("Labels", np.array([1, 2, 3]))
        self.assertEqual(metadata.name_to_values["Labels"].tolist(), [1, 2, 3])

    def testStringNdArrayRetrieval(self):
        metadata = projector_plugin.EmbeddingMetadata(2)
        metadata.add_column("Labels", np.array(["a", "b"]))
        self.assertEqual(metadata.name_to_values["Labels"].tolist(), ["a", "b"])

    def testDuplicateColumnName(self):
        metadata = projector_plugin.EmbeddingMetadata(2)
        metadata.add_column("Labels", np.array(["a", "b"]))
        with self.assertRaises(ValueError):
            metadata.add_column("Labels", np.array(["a", "b"]))


class LRUCacheTest(tf.test.TestCase):
    def testInvalidSize(self):
        with self.assertRaises(ValueError):
            projector_plugin.LRUCache(0)

    def testSimpleGetAndSet(self):
        cache = projector_plugin.LRUCache(1)
        value = cache.get("a")
        self.assertIsNone(value)
        cache.set("a", 10)
        self.assertEqual(cache.get("a"), 10)

    def testErrorsWhenSettingNoneAsValue(self):
        cache = projector_plugin.LRUCache(1)
        with self.assertRaises(ValueError):
            cache.set("a", None)

    def testLRUReplacementPolicy(self):
        cache = projector_plugin.LRUCache(2)
        cache.set("a", 1)
        cache.set("b", 2)
        cache.set("c", 3)
        self.assertIsNone(cache.get("a"))
        self.assertEqual(cache.get("b"), 2)
        self.assertEqual(cache.get("c"), 3)

        # Make 'b' the most recently used.
        cache.get("b")
        cache.set("d", 4)

        # Make sure 'c' got replaced with 'd'.
        self.assertIsNone(cache.get("c"))
        self.assertEqual(cache.get("b"), 2)
        self.assertEqual(cache.get("d"), 4)


if __name__ == "__main__":
    tf.test.main()
