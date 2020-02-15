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
"""Tests the TensorBoard core endpoints."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections.abc
import contextlib
import json
import os
import shutil
import six
import zipfile

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import

import tensorflow as tf

from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.backend.event_processing import db_import_multiplexer
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.compat.proto import graph_pb2
from tensorboard.compat.proto import meta_graph_pb2
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
from tensorboard.plugins.core import core_plugin
from tensorboard.util import test_util

FAKE_INDEX_HTML = b"<!doctype html><title>fake-index</title>"


class FakeFlags(object):
    def __init__(
        self,
        bind_all=False,
        host=None,
        inspect=False,
        version_tb=False,
        logdir="",
        logdir_spec="",
        event_file="",
        db="",
        path_prefix="",
        generic_data="false",
    ):
        self.bind_all = bind_all
        self.host = host
        self.inspect = inspect
        self.version_tb = version_tb
        self.logdir = logdir
        self.logdir_spec = logdir_spec
        self.event_file = event_file
        self.db = db
        self.path_prefix = path_prefix
        self.generic_data = generic_data


class CorePluginFlagsTest(tf.test.TestCase):
    def testFlag(self):
        loader = core_plugin.CorePluginLoader()
        loader.fix_flags(FakeFlags(version_tb=True))
        loader.fix_flags(FakeFlags(inspect=True, logdir="/tmp"))
        loader.fix_flags(FakeFlags(inspect=True, event_file="/tmp/event.out"))
        loader.fix_flags(FakeFlags(inspect=False, logdir="/tmp"))
        loader.fix_flags(FakeFlags(inspect=False, db="sqlite:foo"))
        # User can pass both, although the behavior is not clearly defined.
        loader.fix_flags(
            FakeFlags(inspect=False, logdir="/tmp", db="sqlite:foo")
        )

        logdir_or_db_req = r"A logdir or db must be specified"
        one_of_event_or_logdir_req = (
            r"Must specify either --logdir.*but not both.$"
        )
        event_or_logdir_req = r"Must specify either --logdir or --event_file.$"

        with six.assertRaisesRegex(self, ValueError, event_or_logdir_req):
            loader.fix_flags(FakeFlags(inspect=True))
        with six.assertRaisesRegex(self, ValueError, event_or_logdir_req):
            loader.fix_flags(FakeFlags(inspect=True, db="sqlite:~/db.sqlite"))
        with six.assertRaisesRegex(
            self, ValueError, one_of_event_or_logdir_req
        ):
            loader.fix_flags(
                FakeFlags(
                    inspect=True, logdir="/tmp", event_file="/tmp/event.out"
                )
            )
        with six.assertRaisesRegex(self, ValueError, logdir_or_db_req):
            loader.fix_flags(FakeFlags(inspect=False))
        with six.assertRaisesRegex(self, ValueError, logdir_or_db_req):
            loader.fix_flags(
                FakeFlags(inspect=False, event_file="/tmp/event.out")
            )

    def testPathPrefix_stripsTrailingSlashes(self):
        loader = core_plugin.CorePluginLoader()
        for path_prefix in ("/hello", "/hello/", "/hello//", "/hello///"):
            flag = FakeFlags(
                inspect=False, logdir="/tmp", path_prefix=path_prefix
            )
            loader.fix_flags(flag)
            self.assertEqual(
                flag.path_prefix,
                "/hello",
                "got %r (input %r)" % (flag.path_prefix, path_prefix),
            )

    def testPathPrefix_mustStartWithSlash(self):
        loader = core_plugin.CorePluginLoader()
        flag = FakeFlags(inspect=False, logdir="/tmp", path_prefix="noslash")
        with self.assertRaises(base_plugin.FlagsError) as cm:
            loader.fix_flags(flag)
        msg = str(cm.exception)
        self.assertIn("must start with slash", msg)
        self.assertIn(repr("noslash"), msg)


class CorePluginNoDataTest(tf.test.TestCase):
    def setUp(self):
        super(CorePluginNoDataTest, self).setUp()
        context = base_plugin.TBContext(
            assets_zip_provider=get_test_assets_zip_provider(),
            logdir=self.get_temp_dir(),
            multiplexer=event_multiplexer.EventMultiplexer(),
            window_title="title foo",
        )
        self.plugin = core_plugin.CorePlugin(context)
        app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(app, wrappers.BaseResponse)

    def _get_json(self, server, path):
        response = server.get(path)
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("Content-Type")
        )
        return json.loads(response.get_data().decode("utf-8"))

    def testRoutesProvided(self):
        """Tests that the plugin offers the correct routes."""
        routes = self.plugin.get_plugin_apps()
        self.assertIsInstance(routes["/data/logdir"], collections.abc.Callable)
        self.assertIsInstance(routes["/data/runs"], collections.abc.Callable)

    def testIndex_returnsActualHtml(self):
        """Test the format of the root / endpoint."""
        response = self.server.get("/")
        self.assertEqual(200, response.status_code)
        self.assertStartsWith(response.headers.get("Content-Type"), "text/html")
        html = response.get_data()
        self.assertEqual(html, FAKE_INDEX_HTML)

    def testDataPaths_disableAllCaching(self):
        """Test the format of the /data/runs endpoint."""
        for path in ("/data/runs", "/data/logdir"):
            response = self.server.get(path)
            self.assertEqual(200, response.status_code, msg=path)
            self.assertEqual("0", response.headers.get("Expires"), msg=path)

    def testEnvironmentForWindowTitle(self):
        """Test that the environment route correctly returns the window
        title."""
        parsed_object = self._get_json(self.server, "/data/environment")
        self.assertEqual(parsed_object["window_title"], "title foo")

    def testEnvironmentForLogdir(self):
        """Test that the environment route correctly returns the logdir."""
        parsed_object = self._get_json(self.server, "/data/environment")
        self.assertEqual(parsed_object["data_location"], self.get_temp_dir())

    def testLogdir(self):
        """Test the format of the data/logdir endpoint."""
        parsed_object = self._get_json(self.server, "/data/logdir")
        self.assertEqual(parsed_object, {"logdir": self.get_temp_dir()})


class CorePluginExperimentMetadataTest(tf.test.TestCase):
    def _get_json(self, server, path):
        response = server.get(path)
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("Content-Type")
        )
        return json.loads(response.get_data().decode("utf-8"))

    def testGetEnvironmentDataWithExperimentMetadata(self):
        """Test environment route returns correct metadata about experiment."""

        class FakeDataProvider(object):
            def data_location(self, experiment_id):
                del experiment_id  # Unused.
                return ""

            def experiment_metadata(self, experiment_id):
                del experiment_id  # Unused.
                return provider.ExperimentMetadata(
                    experiment_name="Experiment #5 (実験＃5)",
                    experiment_description="Take five (😊)",
                    creation_time=1234.5,
                )

        self.context = base_plugin.TBContext(
            flags=FakeFlags(generic_data="true"),
            data_provider=FakeDataProvider(),
        )

        self.plugin = core_plugin.CorePlugin(self.context)
        app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(app, wrappers.BaseResponse)

        parsed_object = self._get_json(self.server, "/data/environment")
        self.assertEqual(parsed_object["data_location"], "")
        self.assertEqual(parsed_object["window_title"], None)
        self.assertEqual(
            parsed_object["experiment_name"], "Experiment #5 (実験＃5)"
        )
        self.assertEqual(
            parsed_object["experiment_description"], "Take five (😊)"
        )
        self.assertEqual(parsed_object["creation_time"], 1234.5)

    def testGetEnvironmentDataWithNoExperimentMetadata(self):
        """Test environment route works when no experiment metadata exists."""

        class FakeDataProvider(object):
            def data_location(self, experiment_id):
                del experiment_id  # Unused.
                return ""

            def experiment_metadata(self, experiment_id):
                del experiment_id  # Unused.
                return None

        self.context = base_plugin.TBContext(
            flags=FakeFlags(generic_data="true"),
            data_provider=FakeDataProvider(),
        )

        self.plugin = core_plugin.CorePlugin(self.context)
        app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(app, wrappers.BaseResponse)

        parsed_object = self._get_json(self.server, "/data/environment")
        self.assertEqual(parsed_object["data_location"], "")
        self.assertEqual(parsed_object["window_title"], None)
        self.assertNotIn("experiment_name", parsed_object)
        self.assertNotIn("experiment_description", parsed_object)
        self.assertNotIn("creation_time", parsed_object)


class CorePluginDbModeTest(tf.test.TestCase):
    def setUp(self):
        super(CorePluginDbModeTest, self).setUp()
        self.db_path = os.path.join(self.get_temp_dir(), "db.db")
        self.db_uri = "sqlite:" + self.db_path
        db_connection_provider = application.create_sqlite_connection_provider(
            self.db_uri
        )
        context = base_plugin.TBContext(
            assets_zip_provider=get_test_assets_zip_provider(),
            db_connection_provider=db_connection_provider,
            db_uri=self.db_uri,
        )
        self.plugin = core_plugin.CorePlugin(context)
        app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(app, wrappers.BaseResponse)

    def _get_json(self, server, path):
        response = server.get(path)
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("Content-Type")
        )
        return json.loads(response.get_data().decode("utf-8"))

    def testEnvironmentForDbUri(self):
        """Test that the environment route correctly returns the database
        URI."""
        parsed_object = self._get_json(self.server, "/data/environment")
        self.assertEqual(parsed_object["data_location"], self.db_uri)


class CorePluginTestBase(object):
    def setUp(self):
        super(CorePluginTestBase, self).setUp()
        self.logdir = self.get_temp_dir()
        self.multiplexer = self.create_multiplexer()
        db_uri = None
        db_connection_provider = None
        if isinstance(
            self.multiplexer, db_import_multiplexer.DbImportMultiplexer
        ):
            db_uri = self.multiplexer.db_uri
            db_connection_provider = self.multiplexer.db_connection_provider
        context = base_plugin.TBContext(
            assets_zip_provider=get_test_assets_zip_provider(),
            logdir=self.logdir,
            multiplexer=self.multiplexer,
            db_uri=db_uri,
            db_connection_provider=db_connection_provider,
        )
        self.plugin = core_plugin.CorePlugin(context)
        app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(app, wrappers.BaseResponse)

    def create_multiplexer(self):
        raise NotImplementedError()

    def _add_run(self, run_name):
        run_path = os.path.join(self.logdir, run_name)
        with test_util.FileWriter(run_path) as writer:
            writer.add_test_summary("foo")
        self.multiplexer.AddRunsFromDirectory(self.logdir)
        self.multiplexer.Reload()

    def _get_json(self, server, path):
        response = server.get(path)
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            "application/json", response.headers.get("Content-Type")
        )
        return json.loads(response.get_data().decode("utf-8"))

    def testRuns(self):
        """Test the format of the /data/runs endpoint."""
        self._add_run("run1")
        run_json = self._get_json(self.server, "/data/runs")
        self.assertEqual(run_json, ["run1"])


class CorePluginLogdirModeTest(CorePluginTestBase, tf.test.TestCase):
    def create_multiplexer(self):
        return event_multiplexer.EventMultiplexer()

    # Not in base class because DB import mode does not set started_time.
    def testRunsAppendOnly(self):
        """Test that new runs appear after old ones in /data/runs."""
        fake_wall_times = {
            "run1": 1234.0,
            "avocado": 2345.0,
            "zebra": 3456.0,
            "ox": 4567.0,
            "mysterious": None,
            "enigmatic": None,
        }

        def FirstEventTimestamp_stub(run_name):
            matches = [
                candidate_name
                for candidate_name in fake_wall_times
                if run_name.endswith(candidate_name)
            ]
            self.assertEqual(len(matches), 1, "%s (%s)" % (matches, run_name))
            wall_time = fake_wall_times[matches[0]]
            if wall_time is None:
                raise ValueError("No event timestamp could be found")
            else:
                return wall_time

        with mock.patch.object(
            self.multiplexer, "FirstEventTimestamp"
        ) as mock_first_event_timestamp:
            mock_first_event_timestamp.side_effect = FirstEventTimestamp_stub
            # Start with a single run.
            self._add_run("run1")

            # Add one run: it should come last.
            self._add_run("avocado")
            self.assertEqual(
                self._get_json(self.server, "/data/runs"), ["run1", "avocado"],
            )

            # Add another run: it should come last, too.
            self._add_run("zebra")
            self.assertEqual(
                self._get_json(self.server, "/data/runs"),
                ["run1", "avocado", "zebra"],
            )

            # And maybe there's a run for which we somehow have no timestamp.
            self._add_run("mysterious")
            self.assertEqual(
                self._get_json(self.server, "/data/runs"),
                ["run1", "avocado", "zebra", "mysterious"],
            )

            # Add another timestamped run: it should come before the timestamp-less one.
            self._add_run("ox")
            self.assertEqual(
                self._get_json(self.server, "/data/runs"),
                ["run1", "avocado", "zebra", "ox", "mysterious"],
            )

            # Add another timestamp-less run, lexicographically before the other one:
            # it should come after all timestamped runs but first among timestamp-less.
            self._add_run("enigmatic")
            self.assertEqual(
                self._get_json(self.server, "/data/runs"),
                ["run1", "avocado", "zebra", "ox", "enigmatic", "mysterious"],
            )


class CorePluginDbImportModeTest(CorePluginTestBase, tf.test.TestCase):
    def create_multiplexer(self):
        db_path = os.path.join(self.get_temp_dir(), "db.db")
        db_uri = "sqlite:%s" % db_path
        db_connection_provider = application.create_sqlite_connection_provider(
            db_uri
        )
        return db_import_multiplexer.DbImportMultiplexer(
            db_uri=db_uri,
            db_connection_provider=db_connection_provider,
            purge_orphaned_data=True,
            max_reload_threads=1,
        )

    def _add_run(self, run_name, experiment_name="experiment"):
        run_path = os.path.join(self.logdir, experiment_name, run_name)
        with test_util.FileWriter(run_path) as writer:
            writer.add_test_summary("foo")
        self.multiplexer.AddRunsFromDirectory(self.logdir)
        self.multiplexer.Reload()

    def testExperiments(self):
        """Test the format of the /data/experiments endpoint."""
        self._add_run("run1", experiment_name="exp1")
        self._add_run("run2", experiment_name="exp1")
        self._add_run("run3", experiment_name="exp2")

        [exp1, exp2] = self._get_json(self.server, "/data/experiments")
        self.assertEqual(exp1.get("name"), "exp1")
        self.assertEqual(exp2.get("name"), "exp2")

    def testExperimentRuns(self):
        """Test the format of the /data/experiment_runs endpoint."""
        self._add_run("run1", experiment_name="exp1")
        self._add_run("run2", experiment_name="exp1")
        self._add_run("run3", experiment_name="exp2")

        [exp1, exp2] = self._get_json(self.server, "/data/experiments")

        exp1_runs = self._get_json(
            self.server, "/experiment/%s/data/experiment_runs" % exp1.get("id"),
        )
        self.assertEqual(len(exp1_runs), 2)
        self.assertEqual(exp1_runs[0].get("name"), "run1")
        self.assertEqual(exp1_runs[1].get("name"), "run2")
        self.assertEqual(len(exp1_runs[0].get("tags")), 1)
        self.assertEqual(exp1_runs[0].get("tags")[0].get("name"), "foo")
        self.assertEqual(len(exp1_runs[1].get("tags")), 1)
        self.assertEqual(exp1_runs[1].get("tags")[0].get("name"), "foo")

        exp2_runs = self._get_json(
            self.server, "/experiment/%s/data/experiment_runs" % exp2.get("id"),
        )
        self.assertEqual(len(exp2_runs), 1)
        self.assertEqual(exp2_runs[0].get("name"), "run3")


def get_test_assets_zip_provider():
    memfile = six.BytesIO()
    with zipfile.ZipFile(
        memfile, mode="w", compression=zipfile.ZIP_DEFLATED
    ) as zf:
        zf.writestr("index.html", FAKE_INDEX_HTML)
    return lambda: contextlib.closing(six.BytesIO(memfile.getvalue()))


if __name__ == "__main__":
    tf.test.main()
