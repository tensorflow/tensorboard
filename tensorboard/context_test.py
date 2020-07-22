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
"""Tests for tensorboard.context."""

from tensorboard import auth as auth_lib
from tensorboard import context
from tensorboard import test as tb_test


class RequestContextTest(tb_test.TestCase):
    def test_defaults(self):
        ctx = context.RequestContext()
        self.assertIsInstance(ctx.auth, auth_lib.AuthContext)

    def test_args(self):
        auth = auth_lib.AuthContext({}, {"REQUEST_METHOD": "GET"})
        ctx = context.RequestContext(auth=auth)
        self.assertEqual(ctx.auth, auth)

    def test_environ(self):
        environ = {"one": "two", "three": "four"}
        auth = auth_lib.AuthContext({}, environ)
        self.assertNotEqual(context.from_environ(environ).auth, auth)

        context.set_in_environ(
            environ, context.from_environ(environ).replace(auth=auth)
        )
        self.assertEqual(environ["one"], "two")
        self.assertEqual(environ["three"], "four")
        self.assertEqual(context.from_environ(environ).auth, auth)


if __name__ == "__main__":
    tb_test.main()
