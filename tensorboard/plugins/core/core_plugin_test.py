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


import collections.abc
import contextlib
import io
import json
import mimetypes
import os
from unittest import mock
import zipfile

import tensorflow as tf
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard.backend import application
from tensorboard.backend.event_processing import data_provider
from tensorboard.backend.event_processing import (
    plugin_event_multiplexer as event_multiplexer,
)
from tensorboard.data import provider
from tensorboard.plugins import base_plugin
from tensorboard.plugins.core import core_plugin
from tensorboard.util import test_util

FAKE_INDEX_HTML = b"<!doctype html><title>fake-index</title>"
FAKE_INDEX_JS = b"console.log('hello');"
NO_CACHE_CONTROL_VALUE = "no-cache, must-revalidate"
ONE_DAY_CACHE_CONTROL_VALUE = "private, max-age=86400"


class FakeFlags:
    def __init__(
        self,
        bind_all=False,
        db="",
        event_file="",
        generic_data="true",
        grpc_data_provider="",
        host=None,
        inspect=False,
        load_fast="auto",
        logdir="",
        logdir_spec="",
        path_prefix="",
        reuse_port=False,
        version_tb=False,
    ):
        self.bind_all = bind_all
        self.db = db
        self.event_file = event_file
        self.generic_data = generic_data
        self.grpc_data_provider = grpc_data_provider
        self.host = host
        self.inspect = inspect
        self.load_fast = load_fast
        self.logdir = logdir
        self.logdir_spec = logdir_spec
        self.path_prefix = path_prefix
        self.reuse_port = reuse_port
        self.version_tb = version_tb


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

        with self.assertRaisesRegex(ValueError, event_or_logdir_req):
            loader.fix_flags(FakeFlags(inspect=True))
        with self.assertRaisesRegex(ValueError, one_of_event_or_logdir_req):
            loader.fix_flags(
                FakeFlags(
                    inspect=True, logdir="/tmp", event_file="/tmp/event.out"
                )
            )
        with self.assertRaisesRegex(ValueError, logdir_or_db_req):
            loader.fix_flags(FakeFlags(inspect=False))
        with self.assertRaisesRegex(ValueError, logdir_or_db_req):
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


class CorePluginTest(tf.test.TestCase):
    def setUp(self):
        super().setUp()
        self.multiplexer = event_multiplexer.EventMultiplexer()
        self.logdir = self.get_temp_dir()
        provider = data_provider.MultiplexerDataProvider(
            self.multiplexer, self.logdir
        )
        context = base_plugin.TBContext(
            assets_zip_provider=get_test_assets_zip_provider(),
            logdir=self.logdir,
            data_provider=provider,
            window_title="title foo",
        )
        self.plugin = core_plugin.CorePlugin(context)
        app = application.TensorBoardWSGI([self.plugin])
        self.server = werkzeug_test.Client(app, wrappers.Response)

    def tearDown(self):
        mimetypes.init()

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
        self.assertEqual(
            html,
            b'<!doctype html><meta name="tb-relative-root" content="./">'
            + FAKE_INDEX_HTML,
        )

    def test_js_no_cache(self):
        response = self.server.get("/index.js?foo=bar")
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            NO_CACHE_CONTROL_VALUE, response.headers.get("Cache-Control")
        )

    def test_js_cache(self):
        """Tests cache header for js files marked for caching.

        The test relies on local system's defaults for the javascript mimetype
        which, in practice, should be one of 'text/javascript' or
        'application/javascript'. It could be either, depending on the system.

        See test_js_cache_with_text_javascript() and
        test_js_cache_with_application_javascript() for test cases where
        the javascript mimetype have been explicitly configured.
        """
        response = self.server.get("/index.js?_file_hash=meow")
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            ONE_DAY_CACHE_CONTROL_VALUE, response.headers.get("Cache-Control")
        )

    def test_js_cache_with_text_javascript(self):
        """Tests cache header when js mimetype is 'text/javascript'."""
        mimetypes.add_type("text/javascript", ".js")
        response = self.server.get("/index.js?_file_hash=meow")
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            ONE_DAY_CACHE_CONTROL_VALUE, response.headers.get("Cache-Control")
        )

    def test_js_cache_with_application_javascript(self):
        """Tests cache header when js mimetype is 'application/javascript'."""
        mimetypes.add_type("application/javascript", ".js")
        response = self.server.get("/index.js?_file_hash=meow")
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            ONE_DAY_CACHE_CONTROL_VALUE, response.headers.get("Cache-Control")
        )

    def test_html_no_cache(self):
        response = self.server.get("/index.html?_file_hash=meow")
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            NO_CACHE_CONTROL_VALUE, response.headers.get("Cache-Control")
        )

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

    def testEnvironmentWithExperimentMetadata(self):
        class FakeDataProvider:
            def experiment_metadata(self, ctx, *, experiment_id):
                del experiment_id  # Unused.
                return provider.ExperimentMetadata(
                    data_location="/tmp/logs",
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
        self.server = werkzeug_test.Client(app, wrappers.Response)

        parsed_object = self._get_json(self.server, "/data/environment")
        self.assertEqual(parsed_object["data_location"], "/tmp/logs")
        self.assertEqual(parsed_object["window_title"], None)
        self.assertEqual(
            parsed_object["experiment_name"], "Experiment #5 (実験＃5)"
        )
        self.assertEqual(
            parsed_object["experiment_description"], "Take five (😊)"
        )
        self.assertEqual(parsed_object["creation_time"], 1234.5)

    def testEnvironmentDebugOffByDefault(self):
        parsed_object = self._get_json(self.server, "/data/environment")
        self.assertNotIn("debug", parsed_object)

    def testEnvironmentDebugOnExplicitly(self):
        multiplexer = event_multiplexer.EventMultiplexer()
        logdir = self.get_temp_dir()
        provider = data_provider.MultiplexerDataProvider(multiplexer, logdir)
        context = base_plugin.TBContext(
            assets_zip_provider=get_test_assets_zip_provider(),
            logdir=logdir,
            data_provider=provider,
            window_title="title foo",
        )
        plugin = core_plugin.CorePlugin(context, include_debug_info=True)
        app = application.TensorBoardWSGI([plugin])
        server = werkzeug_test.Client(app, wrappers.Response)

        parsed_object = self._get_json(server, "/data/environment")
        self.assertIn("debug", parsed_object)

    def testLogdir(self):
        """Test the format of the data/logdir endpoint."""
        parsed_object = self._get_json(self.server, "/data/logdir")
        self.assertEqual(parsed_object, {"logdir": self.get_temp_dir()})

    def testRuns(self):
        """Test the format of the /data/runs endpoint."""
        self._add_run("run1")
        run_json = self._get_json(self.server, "/data/runs")
        self.assertEqual(run_json, ["run1"])

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
                self._get_json(self.server, "/data/runs"),
                ["run1", "avocado"],
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

    def testNotificationsRedirectSuccess(self):
        """Test that the /data/notifications endpoint redirect to /notifications_note.json."""
        response = self.server.get("/data/notifications")
        self.assertEqual(302, response.status_code)
        self.assertEqual(
            "../notifications_note.json", response.headers.get("Location")
        )


class CorePluginPathPrefixTest(tf.test.TestCase):
    def _send_request(self, path_prefix, pathname):
        multiplexer = event_multiplexer.EventMultiplexer()
        logdir = self.get_temp_dir()
        provider = data_provider.MultiplexerDataProvider(multiplexer, logdir)
        context = base_plugin.TBContext(
            assets_zip_provider=get_test_assets_zip_provider(),
            logdir=logdir,
            data_provider=provider,
            window_title="",
            flags=FakeFlags(path_prefix=path_prefix),
        )
        plugin = core_plugin.CorePlugin(context)
        app = application.TensorBoardWSGI([plugin], path_prefix=path_prefix)
        server = werkzeug_test.Client(app, wrappers.Response)
        return server.get(pathname)

    def _assert_index(self, response, expected_tb_relative_root):
        self.assertEqual(200, response.status_code)
        self.assertStartsWith(response.headers.get("Content-Type"), "text/html")
        html = response.get_data()

        expected_meta = (
            '<!doctype html><meta name="tb-relative-root" content="%s">'
            % expected_tb_relative_root
        ).encode()
        self.assertEqual(
            html,
            expected_meta + FAKE_INDEX_HTML,
        )

    def testIndex_no_path_prefix(self):
        self._assert_index(self._send_request("", "/"), "./")
        self._assert_index(self._send_request("", "/index.html"), "./")

    def testIndex_path_prefix_foo(self):
        self._assert_index(self._send_request("/foo", "/foo/"), "./")
        self._assert_index(self._send_request("/foo", "/foo/index.html"), "./")

    def testIndex_path_prefix_foo_exp_route(self):
        self._assert_index(
            self._send_request("/foo", "/foo/experiment/123/"), "../../"
        )

    def testIndex_path_prefix_foo_incorrect_route(self):
        self.assertEqual(
            404, (self._send_request("/foo", "/foo/meow/").status_code)
        )
        self.assertEqual(404, (self._send_request("/foo", "/").status_code))
        self.assertEqual(
            404, (self._send_request("/foo", "/index.html").status_code)
        )

        # Missing trailing "/" causes redirection.
        self.assertEqual(301, (self._send_request("/foo", "/foo").status_code))
        self.assertEqual(
            301, (self._send_request("/foo", "/foo/experiment/123").status_code)
        )

    def testIndex_path_prefix_foo_bar(self):
        self._assert_index(self._send_request("/foo/bar", "/foo/bar/"), "./")
        self._assert_index(
            self._send_request("/foo/bar", "/foo/bar/index.html"), "./"
        )

    def testIndex_path_prefix_foo_bar_exp_route(self):
        self._assert_index(
            self._send_request("/foo/bar", "/foo/bar/experiment/123/"), "../../"
        )


def get_test_assets_zip_provider():
    memfile = io.BytesIO()
    with zipfile.ZipFile(
        memfile, mode="w", compression=zipfile.ZIP_DEFLATED
    ) as zf:
        zf.writestr("index.html", FAKE_INDEX_HTML)
        zf.writestr("index.js", FAKE_INDEX_JS)
    return lambda: contextlib.closing(io.BytesIO(memfile.getvalue()))


if __name__ == "__main__":
    tf.test.main()
