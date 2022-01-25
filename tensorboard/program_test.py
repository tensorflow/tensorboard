# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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
"""Unit tests for program package."""


import argparse
import io
import sys
from unittest import mock

from tensorboard import program
from tensorboard import test as tb_test
from tensorboard.plugins import base_plugin
from tensorboard.plugins.core import core_plugin


def fake_asset_provider():
    pass


class TensorBoardTest(tb_test.TestCase):
    """Tests the TensorBoard program."""

    def testPlugins_pluginClass(self):
        tb = program.TensorBoard(
            plugins=[core_plugin.CorePlugin],
            assets_zip_provider=fake_asset_provider,
        )
        self.assertIsInstance(tb.plugin_loaders[0], base_plugin.BasicLoader)
        self.assertIs(tb.plugin_loaders[0].plugin_class, core_plugin.CorePlugin)

    def testPlugins_pluginLoaderClass(self):
        tb = program.TensorBoard(
            plugins=[core_plugin.CorePluginLoader],
            assets_zip_provider=fake_asset_provider,
        )
        self.assertIsInstance(
            tb.plugin_loaders[0], core_plugin.CorePluginLoader
        )

    def testPlugins_pluginLoader(self):
        loader = core_plugin.CorePluginLoader()
        tb = program.TensorBoard(
            plugins=[loader],
            assets_zip_provider=fake_asset_provider,
        )
        self.assertIs(tb.plugin_loaders[0], loader)

    def testPlugins_invalidType(self):
        plugin_instance = core_plugin.CorePlugin(base_plugin.TBContext())
        with self.assertRaisesRegex(TypeError, "CorePlugin"):
            tb = program.TensorBoard(
                plugins=[plugin_instance],
                assets_zip_provider=fake_asset_provider,
            )

    def testConfigure(self):
        tb = program.TensorBoard(
            plugins=[core_plugin.CorePluginLoader],
            assets_zip_provider=fake_asset_provider,
        )
        tb.configure(logdir="foo")
        self.assertEqual(tb.flags.logdir, "foo")

    def testConfigure_unknownFlag(self):
        tb = program.TensorBoard(
            plugins=[core_plugin.CorePlugin],
            assets_zip_provider=fake_asset_provider,
        )
        with self.assertRaisesRegex(ValueError, "Unknown TensorBoard flag"):
            tb.configure(foo="bar")

    def test_should_use_data_server(self):
        def f(**kwargs):
            kwargs.setdefault("logdir", "")
            kwargs.setdefault("logdir_spec", "")
            flags = argparse.Namespace()
            for k, v in kwargs.items():
                setattr(flags, k, v)
            return program._should_use_data_server(flags)

        self.assertFalse(f())
        self.assertFalse(f(logdir_spec="a:foo,b:bar"))
        self.assertTrue(f(logdir="logs/mnist/"))
        self.assertTrue(f(logdir="gs://logs"))
        self.assertFalse(f(logdir="notgs://logs"))


class WerkzeugServerTest(tb_test.TestCase):
    """Tests the default Werkzeug implementation of TensorBoardServer.

    Mostly useful for IPv4/IPv6 testing. This test should run with only
    IPv4, only IPv6, and both IPv4 and IPv6 enabled.
    """

    class _StubApplication(object):
        pass

    def make_flags(self, **kwargs):
        flags = argparse.Namespace()
        kwargs.setdefault("host", None)
        kwargs.setdefault("bind_all", kwargs["host"] is None)
        kwargs.setdefault("reuse_port", False)
        for k, v in kwargs.items():
            setattr(flags, k, v)
        return flags

    def testMakeServerBlankHost(self):
        # Test that we can bind to all interfaces without throwing an error
        server = program.WerkzeugServer(
            self._StubApplication(), self.make_flags(port=0, path_prefix="")
        )
        self.assertStartsWith(server.get_url(), "http://")

    def testPathPrefixSlash(self):
        # Test that checks the path prefix ends with one trailing slash
        server = program.WerkzeugServer(
            self._StubApplication(),
            self.make_flags(port=0, path_prefix="/test"),
        )
        self.assertEndsWith(server.get_url(), "/test/")

        server = program.WerkzeugServer(
            self._StubApplication(),
            self.make_flags(port=0, path_prefix="/test/"),
        )
        self.assertEndsWith(server.get_url(), "/test/")

    def testSpecifiedHost(self):
        one_passed = False
        try:
            server = program.WerkzeugServer(
                self._StubApplication(),
                self.make_flags(host="127.0.0.1", port=0, path_prefix=""),
            )
            self.assertStartsWith(server.get_url(), "http://127.0.0.1:")
            one_passed = True
        except program.TensorBoardServerException:
            # IPv4 is not supported
            pass
        try:
            server = program.WerkzeugServer(
                self._StubApplication(),
                self.make_flags(host="::1", port=0, path_prefix=""),
            )
            self.assertStartsWith(server.get_url(), "http://[::1]:")
            one_passed = True
        except program.TensorBoardServerException:
            # IPv6 is not supported
            pass
        self.assertTrue(
            one_passed
        )  # We expect either IPv4 or IPv6 to be supported


class SubcommandTest(tb_test.TestCase):
    def setUp(self):
        super(SubcommandTest, self).setUp()
        self.stderr = io.StringIO()
        patchers = [
            mock.patch.object(program.TensorBoard, "_install_signal_handler"),
            mock.patch.object(program.TensorBoard, "_run_serve_subcommand"),
            mock.patch.object(_TestSubcommand, "run"),
            mock.patch.object(sys, "stderr", self.stderr),
        ]
        for p in patchers:
            p.start()
            self.addCleanup(p.stop)
        _TestSubcommand.run.return_value = None

    def tearDown(self):
        stderr = self.stderr.getvalue()
        if stderr:
            # In case of failing tests, let there be debug info.
            print("Stderr:\n%s" % stderr)

    def testImplicitServe(self):
        tb = program.TensorBoard(
            plugins=[core_plugin.CorePluginLoader],
            assets_zip_provider=fake_asset_provider,
            subcommands=[_TestSubcommand(lambda parser: None)],
        )
        tb.configure(("tb", "--logdir", "logs", "--path_prefix", "/x///"))
        tb.main()
        program.TensorBoard._run_serve_subcommand.assert_called_once()
        flags = program.TensorBoard._run_serve_subcommand.call_args[0][0]
        self.assertEqual(flags.logdir, "logs")
        self.assertEqual(flags.path_prefix, "/x")  # fixed by core_plugin

    def testExplicitServe(self):
        tb = program.TensorBoard(
            plugins=[core_plugin.CorePluginLoader],
            assets_zip_provider=fake_asset_provider,
            subcommands=[_TestSubcommand()],
        )
        tb.configure(
            ("tb", "serve", "--logdir", "logs", "--path_prefix", "/x///")
        )
        tb.main()
        program.TensorBoard._run_serve_subcommand.assert_called_once()
        flags = program.TensorBoard._run_serve_subcommand.call_args[0][0]
        self.assertEqual(flags.logdir, "logs")
        self.assertEqual(flags.path_prefix, "/x")  # fixed by core_plugin

    def testSubcommand(self):
        def define_flags(parser):
            parser.add_argument("--hello")

        tb = program.TensorBoard(
            plugins=[core_plugin.CorePluginLoader],
            assets_zip_provider=fake_asset_provider,
            subcommands=[_TestSubcommand(define_flags=define_flags)],
        )
        tb.configure(("tb", "test", "--hello", "world"))
        self.assertEqual(tb.main(), 0)
        _TestSubcommand.run.assert_called_once()
        flags = _TestSubcommand.run.call_args[0][0]
        self.assertEqual(flags.hello, "world")

    def testSubcommand_ExitCode(self):
        tb = program.TensorBoard(
            plugins=[core_plugin.CorePluginLoader],
            assets_zip_provider=fake_asset_provider,
            subcommands=[_TestSubcommand()],
        )
        _TestSubcommand.run.return_value = 77
        tb.configure(("tb", "test"))
        self.assertEqual(tb.main(), 77)

    def testSubcommand_DoesNotInheritBaseArgs(self):
        tb = program.TensorBoard(
            plugins=[core_plugin.CorePluginLoader],
            assets_zip_provider=fake_asset_provider,
            subcommands=[_TestSubcommand()],
        )
        with self.assertRaises(SystemExit):
            tb.configure(("tb", "test", "--logdir", "logs"))
        self.assertIn(
            "unrecognized arguments: --logdir logs", self.stderr.getvalue()
        )
        self.stderr.truncate(0)

    def testSubcommand_MayRequirePositionals(self):
        def define_flags(parser):
            parser.add_argument("payload")

        tb = program.TensorBoard(
            plugins=[core_plugin.CorePluginLoader],
            assets_zip_provider=fake_asset_provider,
            subcommands=[_TestSubcommand(define_flags=define_flags)],
        )
        with self.assertRaises(SystemExit):
            tb.configure(("tb", "test"))
        self.assertIn("required", self.stderr.getvalue())
        self.assertIn("payload", self.stderr.getvalue())
        self.stderr.truncate(0)

    def testConflictingNames_AmongSubcommands(self):
        with self.assertRaises(ValueError) as cm:
            tb = program.TensorBoard(
                plugins=[core_plugin.CorePluginLoader],
                assets_zip_provider=fake_asset_provider,
                subcommands=[_TestSubcommand(), _TestSubcommand()],
            )
        self.assertIn("Duplicate subcommand name:", str(cm.exception))
        self.assertIn("test", str(cm.exception))

    def testConflictingNames_WithServe(self):
        with self.assertRaises(ValueError) as cm:
            tb = program.TensorBoard(
                plugins=[core_plugin.CorePluginLoader],
                assets_zip_provider=fake_asset_provider,
                subcommands=[_TestSubcommand(name="serve")],
            )
        self.assertIn("Duplicate subcommand name:", str(cm.exception))
        self.assertIn("serve", str(cm.exception))


class _TestSubcommand(program.TensorBoardSubcommand):
    def __init__(self, name=None, define_flags=None):
        self._name = name
        self._define_flags = define_flags

    def name(self):
        return self._name or "test"

    def define_flags(self, parser):
        if self._define_flags:
            self._define_flags(parser)

    def run(self, flags):
        pass


if __name__ == "__main__":
    tb_test.main()
