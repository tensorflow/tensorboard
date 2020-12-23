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
"""Tests for `profile_redirect_plugin`."""


import contextlib
import sys
from unittest import mock

from tensorboard.plugins import base_plugin
from tensorboard.plugins.profile_redirect import profile_redirect_plugin
from tensorboard import test as tb_test


_DYNAMIC_PLUGIN_MODULE = "tensorboard_plugin_profile"


class ProfileRedirectPluginLoaderTest(tb_test.TestCase):
    """Tests for `ProfileRedirectPluginLoader`."""

    def test_loads_when_no_dynamic_plugin(self):
        with contextlib.ExitStack() as stack:
            stack.enter_context(mock.patch.dict(sys.modules))
            sys.modules.pop(_DYNAMIC_PLUGIN_MODULE, None)

            real_import = __import__

            def fake_import(name, *args, **kwargs):
                if name == _DYNAMIC_PLUGIN_MODULE:
                    raise ImportError("Pretend I'm not here")
                else:
                    return real_import(name, *args, **kwargs)

            stack.enter_context(mock.patch("builtins.__import__", fake_import))

            plugin_class = profile_redirect_plugin._ProfileRedirectPlugin
            plugin_init = stack.enter_context(
                mock.patch.object(plugin_class, "__init__", return_value=None)
            )

            loader = profile_redirect_plugin.ProfileRedirectPluginLoader()
            context = base_plugin.TBContext()
            result = loader.load(context)
            self.assertIsInstance(result, plugin_class)
            plugin_init.assert_called_once_with(context)

    def test_does_not_load_when_dynamic_plugin_present(self):
        with contextlib.ExitStack() as stack:
            stack.enter_context(mock.patch.dict(sys.modules))
            sys.modules.pop(_DYNAMIC_PLUGIN_MODULE, None)

            real_import = __import__

            def fake_import(name, *args, **kwargs):
                if name == _DYNAMIC_PLUGIN_MODULE:
                    arbitrary_module = sys
                    sys.modules.setdefault(
                        _DYNAMIC_PLUGIN_MODULE, arbitrary_module
                    )
                    return arbitrary_module
                else:
                    return real_import(name, *args, **kwargs)

            stack.enter_context(mock.patch("builtins.__import__", fake_import))

            plugin_class = profile_redirect_plugin._ProfileRedirectPlugin
            plugin_init = stack.enter_context(
                mock.patch.object(plugin_class, "__init__", return_value=None)
            )

            loader = profile_redirect_plugin.ProfileRedirectPluginLoader()
            context = base_plugin.TBContext()
            result = loader.load(context)
            self.assertIsNone(result)
            plugin_init.assert_not_called()


if __name__ == "__main__":
    tb_test.main()
