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
"""Tests for tensorboard.auth."""

from tensorboard import auth
from tensorboard import test as tb_test


class AuthContextTest(tb_test.TestCase):
    def test_cache_success(self):
        call_count = 0

        class UsernameProvider(auth.AuthProvider):
            def authenticate(self, environ):
                nonlocal call_count
                call_count += 1
                return environ["username"]

        providers = {UsernameProvider: UsernameProvider()}
        auth_ctx = auth.AuthContext(providers, {"username": "whoami"})
        self.assertEqual(auth_ctx.get(UsernameProvider), "whoami")
        self.assertEqual(auth_ctx.get(UsernameProvider), "whoami")
        self.assertEqual(call_count, 1)

    def test_cache_failure(self):
        call_count = 0

        class FailureProvider(auth.AuthProvider):
            def authenticate(self, environ):
                nonlocal call_count
                call_count += 1
                raise RuntimeError()

        providers = {FailureProvider: FailureProvider()}
        auth_ctx = auth.AuthContext(providers, {})
        with self.assertRaises(RuntimeError):
            auth_ctx.get(FailureProvider)
        with self.assertRaises(RuntimeError):
            auth_ctx.get(FailureProvider)
        self.assertEqual(call_count, 2)


if __name__ == "__main__":
    tb_test.main()
