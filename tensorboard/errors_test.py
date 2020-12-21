# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for tensorboard.errors."""


from tensorboard import errors
from tensorboard import test as tb_test


class InvalidArgumentErrorTest(tb_test.TestCase):
    def test_no_details(self):
        e = errors.InvalidArgumentError()
        expected_msg = "Invalid argument"
        self.assertEqual(str(e), expected_msg)

    def test_with_details(self):
        e = errors.InvalidArgumentError("expected absolute path; got './foo'")
        expected_msg = "Invalid argument: expected absolute path; got './foo'"
        self.assertEqual(str(e), expected_msg)

    def test_http_code(self):
        self.assertEqual(errors.InvalidArgumentError().http_code, 400)

    def test_headers(self):
        e1 = errors.InvalidArgumentError()
        e2 = errors.InvalidArgumentError()
        self.assertEmpty(e1.headers)
        self.assertIsNot(e1.headers, e2.headers)


class NotFoundErrorTest(tb_test.TestCase):
    def test_no_details(self):
        e = errors.NotFoundError()
        expected_msg = "Not found"
        self.assertEqual(str(e), expected_msg)

    def test_with_details(self):
        e = errors.NotFoundError("no scalar data for run=foo, tag=bar")
        expected_msg = "Not found: no scalar data for run=foo, tag=bar"
        self.assertEqual(str(e), expected_msg)

    def test_http_code(self):
        self.assertEqual(errors.NotFoundError().http_code, 404)

    def test_headers(self):
        e1 = errors.NotFoundError()
        e2 = errors.NotFoundError()
        self.assertEmpty(e1.headers)
        self.assertIsNot(e1.headers, e2.headers)


class UnauthenticatedErrorTest(tb_test.TestCase):
    def test_no_details(self):
        e = errors.UnauthenticatedError(challenge="Digest")
        expected_msg = "Unauthenticated"
        self.assertEqual(str(e), expected_msg)

    def test_with_details(self):
        e = errors.UnauthenticatedError(
            "don't you know who I am?", challenge="Digest"
        )
        expected_msg = "Unauthenticated: don't you know who I am?"
        self.assertEqual(str(e), expected_msg)

    def test_http_code(self):
        self.assertEqual(
            errors.UnauthenticatedError(challenge="Digest").http_code, 401
        )

    def test_headers(self):
        details = "hmm"
        challenge = 'Bearer realm="https://example.com"'
        e1 = errors.UnauthenticatedError(details, challenge=challenge)
        e2 = errors.UnauthenticatedError(details, challenge=challenge)
        self.assertEqual(
            e1.headers,
            [("WWW-Authenticate", 'Bearer realm="https://example.com"')],
        )
        self.assertIsNot(e1.headers, e2.headers)


class PermissionDeniedErrorTest(tb_test.TestCase):
    def test_no_details(self):
        e = errors.PermissionDeniedError()
        expected_msg = "Permission denied"
        self.assertEqual(str(e), expected_msg)

    def test_with_details(self):
        e = errors.PermissionDeniedError("this data is top secret")
        expected_msg = "Permission denied: this data is top secret"
        self.assertEqual(str(e), expected_msg)

    def test_http_code(self):
        self.assertEqual(errors.PermissionDeniedError().http_code, 403)

    def test_headers(self):
        e1 = errors.PermissionDeniedError()
        e2 = errors.PermissionDeniedError()
        self.assertEmpty(e1.headers)
        self.assertIsNot(e1.headers, e2.headers)


if __name__ == "__main__":
    tb_test.main()
