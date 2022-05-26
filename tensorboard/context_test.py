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
        self.assertEqual(ctx.remote_ip, None)
        self.assertEqual(ctx.x_forwarded_for, ())
        self.assertEqual(ctx.client_feature_flags, {})

    def test_args(self):
        auth = auth_lib.AuthContext({}, {"REQUEST_METHOD": "GET"})
        client_feature_flags = {"someFlag": True}
        ctx = context.RequestContext(
            auth=auth,
            remote_ip=REMOTE_IP,
            x_forwarded_for=X_FORWARDED_FOR_IPS,
            client_feature_flags=client_feature_flags,
        )
        self.assertEqual(ctx.auth, auth)
        self.assertEqual(ctx.remote_ip, REMOTE_IP)
        self.assertEqual(ctx.x_forwarded_for, X_FORWARDED_FOR_IPS)
        self.assertEqual(ctx.client_feature_flags, client_feature_flags)

    def test_environ(self):
        environ = {"one": "two", "three": "four"}
        auth = auth_lib.AuthContext({}, environ)
        client_feature_flags = {"someFlag": True}
        req_context = context.from_environ(environ)
        self.assertNotEqual(req_context.auth, auth)
        self.assertEqual(req_context.remote_ip, None)
        self.assertEqual(req_context.x_forwarded_for, ())
        self.assertEqual(req_context.client_feature_flags, {})

        context.set_in_environ(
            environ,
            context.from_environ(environ).replace(
                auth=auth,
                remote_ip=REMOTE_IP,
                x_forwarded_for=X_FORWARDED_FOR_IPS,
                client_feature_flags=client_feature_flags,
            ),
        )
        self.assertEqual(environ["one"], "two")
        self.assertEqual(environ["three"], "four")
        req_context = context.from_environ(environ)
        self.assertEqual(req_context.auth, auth)
        self.assertEqual(req_context.remote_ip, REMOTE_IP)
        self.assertEqual(req_context.x_forwarded_for, X_FORWARDED_FOR_IPS)
        self.assertEqual(req_context.client_feature_flags, client_feature_flags)

    def test_replace(self):
        environ1 = {"one": "two", "three": "four"}
        auth1 = auth_lib.AuthContext({}, environ1)
        environ2 = {"one": "two"}
        auth2 = auth_lib.AuthContext({}, environ2)
        remote_ip1 = ipaddress.ip_address("192.168.0.1")
        remote_ip2 = ipaddress.ip_address("192.168.0.2")
        x_forwarded_for_ips1 = (remote_ip1, REMOTE_IP)
        x_forwarded_for_ips2 = (remote_ip2, REMOTE_IP)
        client_feature_flags1 = {"oneFlag": True}
        client_feature_flags2 = {"twoFlag": False}

        req_context = context.RequestContext(
            auth=auth1,
            remote_ip=remote_ip1,
            x_forwarded_for=x_forwarded_for_ips1,
            client_feature_flags=client_feature_flags1,
        )
        self.assertEqual(req_context.auth, auth1)
        self.assertEqual(req_context.remote_ip, remote_ip1)
        self.assertEqual(req_context.x_forwarded_for, x_forwarded_for_ips1)
        self.assertEqual(
            req_context.client_feature_flags, client_feature_flags1
        )

        req_context_new = req_context.replace(auth=auth2)
        self.assertEqual(req_context_new.auth, auth2)
        self.assertEqual(req_context_new.remote_ip, req_context.remote_ip)
        self.assertEqual(
            req_context_new.x_forwarded_for, req_context.x_forwarded_for
        )
        self.assertEqual(
            req_context_new.client_feature_flags,
            req_context.client_feature_flags,
        )

        req_context_new = req_context.replace(remote_ip=remote_ip2)
        self.assertEqual(req_context_new.auth, req_context.auth)
        self.assertEqual(req_context_new.remote_ip, remote_ip2)
        self.assertEqual(
            req_context_new.x_forwarded_for, req_context.x_forwarded_for
        )
        self.assertEqual(
            req_context_new.client_feature_flags,
            req_context.client_feature_flags,
        )

        req_context_new = req_context.replace(
            x_forwarded_for=x_forwarded_for_ips2
        )
        self.assertEqual(req_context_new.auth, req_context.auth)
        self.assertEqual(req_context_new.remote_ip, req_context.remote_ip)
        self.assertEqual(req_context_new.x_forwarded_for, x_forwarded_for_ips2)
        self.assertEqual(
            req_context_new.client_feature_flags,
            req_context.client_feature_flags,
        )

        req_context_new = req_context.replace(
            client_feature_flags=client_feature_flags2
        )
        self.assertEqual(req_context_new.auth, req_context.auth)
        self.assertEqual(req_context_new.remote_ip, req_context.remote_ip)
        self.assertEqual(
            req_context_new.x_forwarded_for, req_context.x_forwarded_for
        )
        self.assertEqual(
            req_context_new.client_feature_flags, client_feature_flags2
        )


if __name__ == "__main__":
    tb_test.main()
