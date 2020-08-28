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
# Lint as: python3
"""Tests for tensorboard.uploader.auth."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import os

import google.auth.credentials
import google.oauth2.credentials

from tensorboard.uploader import auth
from tensorboard import test as tb_test


class CredentialsStoreTest(tb_test.TestCase):
    def test_no_config_dir(self):
        store = auth.CredentialsStore(user_config_directory=None)
        self.assertIsNone(store.read_credentials())
        creds = google.oauth2.credentials.Credentials(token=None)
        store.write_credentials(creds)
        store.clear()

    def test_clear_existent_file(self):
        root = self.get_temp_dir()
        path = os.path.join(
            root, "tensorboard", "credentials", "uploader-creds.json"
        )
        os.makedirs(os.path.dirname(path))
        open(path, mode="w").close()
        self.assertTrue(os.path.exists(path))
        auth.CredentialsStore(user_config_directory=root).clear()
        self.assertFalse(os.path.exists(path))

    def test_clear_nonexistent_file(self):
        root = self.get_temp_dir()
        path = os.path.join(
            root, "tensorboard", "credentials", "uploader-creds.json"
        )
        self.assertFalse(os.path.exists(path))
        auth.CredentialsStore(user_config_directory=root).clear()
        self.assertFalse(os.path.exists(path))

    def test_write_wrong_type(self):
        creds = google.auth.credentials.AnonymousCredentials()
        with self.assertRaisesRegex(TypeError, "google.auth.credentials"):
            auth.CredentialsStore(user_config_directory=None).write_credentials(
                creds
            )

    def test_write_creates_private_file(self):
        root = self.get_temp_dir()
        auth.CredentialsStore(user_config_directory=root).write_credentials(
            google.oauth2.credentials.Credentials(
                token=None, refresh_token="12345"
            )
        )
        path = os.path.join(
            root, "tensorboard", "credentials", "uploader-creds.json"
        )
        self.assertTrue(os.path.exists(path))
        # Skip permissions check on Windows.
        if os.name != "nt":
            self.assertEqual(0o600, os.stat(path).st_mode & 0o777)
        with open(path) as f:
            contents = json.load(f)
        self.assertEqual("12345", contents["refresh_token"])

    def test_write_overwrites_file(self):
        root = self.get_temp_dir()
        store = auth.CredentialsStore(user_config_directory=root)
        # Write twice to ensure that we're overwriting correctly.
        store.write_credentials(
            google.oauth2.credentials.Credentials(
                token=None, refresh_token="12345"
            )
        )
        store.write_credentials(
            google.oauth2.credentials.Credentials(
                token=None, refresh_token="67890"
            )
        )
        path = os.path.join(
            root, "tensorboard", "credentials", "uploader-creds.json"
        )
        self.assertTrue(os.path.exists(path))
        with open(path) as f:
            contents = json.load(f)
        self.assertEqual("67890", contents["refresh_token"])

    def test_write_and_read_roundtrip(self):
        orig_creds = google.oauth2.credentials.Credentials(
            token="12345",
            refresh_token="67890",
            token_uri="https://oauth2.googleapis.com/token",
            client_id="my-client",
            client_secret="123abc456xyz",
            scopes=["userinfo", "email"],
        )
        root = self.get_temp_dir()
        store = auth.CredentialsStore(user_config_directory=root)
        store.write_credentials(orig_creds)
        creds = store.read_credentials()
        self.assertEqual(orig_creds.refresh_token, creds.refresh_token)
        self.assertEqual(orig_creds.token_uri, creds.token_uri)
        self.assertEqual(orig_creds.client_id, creds.client_id)
        self.assertEqual(orig_creds.client_secret, creds.client_secret)

    def test_read_nonexistent_file(self):
        root = self.get_temp_dir()
        store = auth.CredentialsStore(user_config_directory=root)
        self.assertIsNone(store.read_credentials())

    def test_read_non_json_file(self):
        root = self.get_temp_dir()
        store = auth.CredentialsStore(user_config_directory=root)
        path = os.path.join(
            root, "tensorboard", "credentials", "uploader-creds.json"
        )
        os.makedirs(os.path.dirname(path))
        with open(path, mode="w") as f:
            f.write("foobar")
        with self.assertRaises(ValueError):
            store.read_credentials()

    def test_read_invalid_json_file(self):
        root = self.get_temp_dir()
        store = auth.CredentialsStore(user_config_directory=root)
        path = os.path.join(
            root, "tensorboard", "credentials", "uploader-creds.json"
        )
        os.makedirs(os.path.dirname(path))
        with open(path, mode="w") as f:
            f.write("{}")
        with self.assertRaises(ValueError):
            store.read_credentials()


if __name__ == "__main__":
    tb_test.main()
