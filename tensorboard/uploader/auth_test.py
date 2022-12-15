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

from datetime import datetime
import json
import os
import requests
import time
from typing import Dict
from unittest import mock

import google_auth_oauthlib.flow as auth_flows
import google.auth.credentials
from google.oauth2.credentials import Credentials

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


class FakeHttpResponse():
    """A fake implementation of the response from the requests library."""

    def __init__(self, data: Dict, status:int = 200):
        self.status_code = status
        self._data = data

    def json(self):
        return self._data


class AuthFlowTest(tb_test.TestCase):

    # Original config passed to the auth flow for the "browser" auth flow (aka
    # installed app flow).
    _INSTALLED_APP_AUTH_CONFIG_JSON = """
        {
            "installed": {
                "client_id": "installed_client_id",
                "auth_uri": "https://google.com/auth",
                "token_uri": "https://google.com/token",
                "client_secret": "installed_client_secret",
                "redirect_uris": ["http://localhost"]
            }
        }
        """

    # Original config passed to the auth flow for the "no browser" auth flow
    # (aka "console" or "limited-input device" flow).
    _CONSOLE_AUTH_CONFIG_JSON = """
        {
            "client_id": "console_client_id",
            "device_uri": "https://google.com/device",
            "token_uri": "https://google.com/token",
            "client_secret": "console_client_secret",
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
        }
        """

    _SCOPES = ["email", "openid"]

    _DEVICE_RESPONSE = FakeHttpResponse({
            "device_code": "resp_device_code",
            "verification_url": "auth.google.com/device",
            "user_code": "resp_user_code",
            "interval": 5,
            "expires_in": 300
        })

    _AUTH_PENDING_RESPONSE = FakeHttpResponse({
            "error": "authorization_pending"
        }, status=428)

    _AUTH_GRANTED_RESPONSE = FakeHttpResponse({
        "access_token": "some_access_token",
        "refresh_token": "some_refresh_token",
        "id_token": "some_id_token",
        "expires_in": 3600,
    })

    def setUp(self):
        super().setUp()

        # The faked installed app flow that we use from the common library.
        # That class should already be tested, so we mostly want to test
        # high-level interactions with it.
        self.fake_auth_flow = FakeInstalledAppFlow(Credentials("access_token"))

        self.mocked_time = self.enter_context(
            mock.patch.object(time, 'time', autospec=True))
        # Timestamps from a fake clock. The values don't matter in most tests.
        self.mocked_time.side_effect = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

        self.mocked_sleep = self.enter_context(
            mock.patch.object(time, 'sleep', autospec=True))

        self.mocked_post = self.enter_context(
            mock.patch.object(requests, 'post', autospec=True))

        self.mocked_auth_flow_creator_fn = self.enter_context(
            mock.patch.object(
                auth_flows.InstalledAppFlow,
                'from_client_config',
                return_value=self.fake_auth_flow))

        # Used to estimate if a browser is available in this env.
        self.mocked_getenv = self.enter_context(
            mock.patch.object(os, 'getenv', return_value="some_display"))

        self.flow = auth._TbUploaderAuthFlow(
            self._INSTALLED_APP_AUTH_CONFIG_JSON,
            self._CONSOLE_AUTH_CONFIG_JSON,
            self._SCOPES)

    def test_auth_flow__browser__uses_intalled_app_flow(self):
        self.flow.run()
        self.mocked_auth_flow_creator_fn.assert_called_once()
        self.assertTrue(self.fake_auth_flow.run_local_server_was_called)

    def test_auth_flow__console__device_request_fails__raises(self):
        mocked_post = self.enter_context(
            mock.patch.object(requests, 'post', autospec=True))
        mocked_post.return_value = (
            FakeHttpResponse({"error": "quota exceeded"}, status=403))

        with self.assertRaisesRegex(
            RuntimeError, "Auth service temporarily unavailable"):
            self.flow.run(force_console=True)

    def test_auth_flow__console__polling__auth_pending_response__keeps_polling(
        self):
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            self._AUTH_PENDING_RESPONSE,
            self._AUTH_GRANTED_RESPONSE,
        ]

        self.flow.run(force_console=True)

        device_params = {
            "client_id": "console_client_id",
            "scope": "email openid"
        }
        polling_params = {
            "client_id": "console_client_id",
            "client_secret": "console_client_secret",
            "device_code": "resp_device_code",
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code"
        }
        device_uri = "https://google.com/device"
        token_uri = "https://google.com/token"
        # One device code request, then two polling calls:
        # the first poll returned auth_pending, the second one returned success.
        expected_post_requests = [
            mock.call(device_uri, data=device_params),
            mock.call(token_uri, data=polling_params),
            mock.call(token_uri, data=polling_params),
        ]
        self.assertSequenceEqual(
            expected_post_requests,
            self.mocked_post.call_args_list)
        sleep_time = self._DEVICE_RESPONSE.json()["interval"]
        self.mocked_sleep.assert_called_once_with(sleep_time)

    def test_auth_flow__console__polling__access_granted__returns_credentials(
        self):
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            self._AUTH_GRANTED_RESPONSE,
        ]
        # Based on these mocked responses, time.time() is called 3 times:
        # 1. To generate an expiration time for polling
        # 2. While polling to check if we reached the expiration time
        # 3. To calculate an expiration time for the credentials (useful below)
        #
        # The third timestamp corresponds to: 2022/12/13 16:00:00Z
        #
        # Note that I could have simply used 3, it doesn't really matter if this
        # is a realistic timestamp, but for the sake of clarity and having a
        # realistic setup, I decided to use this.
        now_timestamp = 1670947200
        self.mocked_time.side_effect = [1, 2, now_timestamp]

        creds = self.flow.run(force_console=True)

        auth_response = self._AUTH_GRANTED_RESPONSE.json()
        console_config = json.loads(self._CONSOLE_AUTH_CONFIG_JSON)

        expected_expiration_timestamp = datetime.utcfromtimestamp(
            now_timestamp + auth_response["expires_in"])

        expected_credentials = Credentials(
            auth_response["access_token"],
            refresh_token=auth_response["refresh_token"],
            id_token=auth_response["id_token"],
            token_uri=console_config["token_uri"],
            client_id=console_config["client_id"],
            client_secret= console_config["client_secret"],
            scopes=self._SCOPES,
            expiry=expected_expiration_timestamp
        )
        self.assertEqual(creds.to_json(), expected_credentials.to_json())

    def test_auth_flow__console__polling__access_denied__raises(self):
        access_denied_response = FakeHttpResponse(
            {"error": "access_denied"}, 403)
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            access_denied_response,
        ]

        with self.assertRaisesRegex(PermissionError, "Auth was denied."):
            self.flow.run(force_console=True)

    def test_auth_flow__console__polling__slow_down_response__waits_longer(
        self):
        slow_down_response = FakeHttpResponse({"error": "slow_down"})
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            slow_down_response,
            self._AUTH_GRANTED_RESPONSE
        ]

        self.flow.run(force_console=True)

        interval = self._DEVICE_RESPONSE.json()["interval"]
        sleep_time = int(interval * 1.5)
        self.mocked_sleep.assert_called_once_with(sleep_time)

    def test_auth_flow__console__polling__bad_request_response__raises(self):
        bad_request_response = FakeHttpResponse(
            {"error": "bad_request"}, 401)
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            bad_request_response,
        ]

        with self.assertRaisesRegex(
            ValueError, "There must be an error in the request."):
            self.flow.run(force_console=True)

    def test_auth_flow__console__polling__timed_out__raises(self):
        self.mocked_post.return_value = self._DEVICE_RESPONSE
        # Before polling, the time increased more than the expiration time from
        # the device response.
        self.mocked_time.side_effect = [1, 5000]

        with self.assertRaisesRegex(
            TimeoutError, "Timed out waiting for authorization."):
            self.flow.run(force_console=True)

    def test_auth_flow__console__polling__unexpected_error__raises(self):
        unexpected_response = FakeHttpResponse({"error": "unexpected 500"}, 500)
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            unexpected_response,
        ]

        with self.assertRaisesRegex(
            RuntimeError, "An unexpected error occurred while authenticating."):
            self.flow.run(force_console=True)


class FakeInstalledAppFlow():
    """A minimal fake for the InstalledApp flow with the function we call."""
    def __init__(self, credentials):
        self.run_local_server_was_called = False
        self._creds = credentials

    def run_local_server(self, port=8080):
        self.run_local_server_was_called = True
        return self._creds


if __name__ == "__main__":
    tb_test.main()
