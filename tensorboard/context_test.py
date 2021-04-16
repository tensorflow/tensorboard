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

import ipaddress

from tensorboard import auth as auth_lib
from tensorboard import context
from tensorboard import test as tb_test

REMOTE_IP = ipaddress.ip_address("192.168.0.1")
X_FORWARDED_FOR_IPS = (ipaddress.ip_address("2001:db8::"), REMOTE_IP)


class RequestContextTest(tb_test.TestCase):
    def test_defaults(self):
        ctx = context.RequestContext()
        self.assertIsInstance(ctx.auth, auth_lib.AuthContext)
        self.assertEqual(ctx.x_forwarded_for, ())

    def test_args(self):
        auth = auth_lib.AuthContext({}, {"REQUEST_METHOD": "GET"})
        ctx = context.RequestContext(
            auth=auth, remote_ip=REMOTE_IP, x_forwarded_for=X_FORWARDED_FOR_IPS
        )
        self.assertEqual(ctx.auth, auth)
        self.assertEqual(ctx.remote_ip, REMOTE_IP)
        self.assertEqual(ctx.x_forwarded_for, X_FORWARDED_FOR_IPS)

    def test_environ(self):
        environ = {"one": "two", "three": "four"}
        auth = auth_lib.AuthContext({}, environ)
        req_context = context.from_environ(environ)
        self.assertNotEqual(req_context.auth, auth)
        self.assertNotEqual(req_context.remote_ip, REMOTE_IP)
        self.assertNotEqual(req_context.x_forwarded_for, X_FORWARDED_FOR_IPS)

        context.set_in_environ(
            environ,
            context.from_environ(environ).replace(
                auth=auth,
                remote_ip=REMOTE_IP,
                x_forwarded_for=X_FORWARDED_FOR_IPS,
            ),
        )
        self.assertEqual(environ["one"], "two")
        self.assertEqual(environ["three"], "four")
        req_context = context.from_environ(environ)
        self.assertEqual(req_context.auth, auth)
        self.assertEqual(req_context.remote_ip, REMOTE_IP)
        self.assertEqual(req_context.x_forwarded_for, X_FORWARDED_FOR_IPS)


if __name__ == "__main__":
    tb_test.main()
