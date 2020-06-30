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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from tensorboard import notebook
from tensorboard import manager
from tensorboard import test as tb_test

try:
    # python version >= 3.3
    from unittest import mock
except ImportError:
    import mock  # pylint: disable=unused-import


class CustomDisplayAPITest(tb_test.TestCase):
    """Tests for `notebook.register_custom_display()`."""

    counter = 0

    # Mock a StartLaunched result so to prevent starting a Tensorboard
    # process in the following tests
    _info = manager.TensorBoardInfo(
        version="x.x",
        start_time=0,
        pid=0,
        port=6006,
        path_prefix="prefix",
        logdir="dir",
        db="db",
        cache_key="key",
    )
    _startup_result = manager.StartLaunched(info=_info)

    def custom_display(self, port, height, display_handle):
        del port
        del height
        del display_handle
        self.counter = 1

    def reset(self):
        self.counter = 0

    def test_get_context(self):
        notebook.register_custom_display(self.custom_display)
        self.assertEqual(notebook._get_context(), "_CONTEXT_CUSTOM")

    def test_display(self):
        notebook.register_custom_display(self.custom_display)
        notebook.display(6006)
        self.assertEqual(self.counter, 1)
        self.reset()

    def test_start(self):
        with mock.patch(
            "tensorboard.manager.start", lambda _: self._startup_result
        ):
            notebook.register_custom_display(self.custom_display)
            notebook.start("--logdir test")
        self.assertEqual(self.counter, 1)
        self.reset()


if __name__ == "__main__":
    tb_test.main()
