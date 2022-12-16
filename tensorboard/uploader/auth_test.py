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
from distutils.log import error
import json
import os
import webbrowser
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


class FakeInstalledAppFlow:
    """A minimal fake for the InstalledApp flow with the function we call.

    This is a fake of a publicly available class that should already be tested,
    so we mostly want to test high-level interactions with it.
    """

    def __init__(self, credentials=None, raiseError=False):
        if not credentials and not raiseError:
            ValueError("credentials cannot be None when raiseError is False")
        if credentials and raiseError:
            ValueError("credentials must be None when raiseError is True")
        self.run_local_server_was_called = False
        self._creds = credentials
        self._raiseError = raiseError

    def run_local_server(self, port=8080):
        self.run_local_server_was_called = True
        if self._raiseError:
            raise webbrowser.Error()
        return self._creds


class AuthenticateUserTest(tb_test.TestCase):
    def setUp(self):
        super().setUp()
        # Used to estimate if a browser is available in this env.
        self.os_env_display_fn = self.enter_context(
            mock.patch.object(os, "getenv")
        )

        self.mocked_installed_auth_flow_creator_fn = self.enter_context(
            mock.patch.object(auth_flows.InstalledAppFlow, "from_client_config")
        )

        self.mocked_device_auth_flow = self.enter_context(
            mock.patch.object(
                auth, "_LimitedInputDeviceAuthFlow", autospec=True
            )
        )

    def test_authenticate_user__no_force_console_override__has_display__uses_installed_app_flow(
        self,
    ):
        self.os_env_display_fn.return_value = "some_display"

        fake_auth_flow = FakeInstalledAppFlow(
            credentials=Credentials("fake_access_token")
        )
        self.mocked_installed_auth_flow_creator_fn.return_value = fake_auth_flow

        auth.authenticate_user()

        self.mocked_installed_auth_flow_creator_fn.assert_called_once()
        self.assertTrue(fake_auth_flow.run_local_server_was_called)
        self.mocked_device_auth_flow.assert_not_called()

    def test_authenticate_user__no_force_console_override__no_display__uses_device_flow(
        self,
    ):
        self.os_env_display_fn.return_value = None

        auth.authenticate_user()

        self.mocked_installed_auth_flow_creator_fn.assert_not_called()
        self.mocked_device_auth_flow.assert_called_once()
        self.mocked_device_auth_flow.return_value.run.assert_called_once()

    def test_authenticate_user__no_force_console_override__has_display__webbrowser_error__uses_device_flow(
        self,
    ):
        fake_auth_flow = FakeInstalledAppFlow(raiseError=True)
        self.mocked_installed_auth_flow_creator_fn.return_value = fake_auth_flow
        self.os_env_display_fn.return_value = "some_display"

        auth.authenticate_user()

        # "installed app" flow was instantiated and ran, which raied an exception,
        # so the other flow also ran.
        self.mocked_installed_auth_flow_creator_fn.assert_called_once()
        self.assertTrue(fake_auth_flow.run_local_server_was_called)
        self.mocked_device_auth_flow.assert_called_once()
        self.mocked_device_auth_flow.return_value.run.assert_called_once()

    def test_authenticate_user__force_console_override__uses_device_flow(self):
        auth.authenticate_user(force_console=True)
        self.mocked_installed_auth_flow_creator_fn.assert_not_called()
        self.mocked_device_auth_flow.assert_called_once()
        self.mocked_device_auth_flow.return_value.run.assert_called_once()


class FakeHttpResponse:
    """A fake implementation of the response from the requests library."""

    def __init__(self, data: Dict, status: int = 200):
        self.status_code = status
        self._data = data

    def json(self):
        return self._data


class LimitedInputDeviceAuthFlowTest(tb_test.TestCase):
    _OAUTH_CONFIG = {
        "limited-input device": {
            "client_id": "console_client_id",
            "device_uri": "https://google.com/device",
            "token_uri": "https://google.com/token",
            "client_secret": "console_client_secret",
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
        }
    }

    _SCOPES = ["email", "openid"]

    _DEVICE_RESPONSE = FakeHttpResponse(
        {
            "device_code": "resp_device_code",
            "verification_url": "auth.google.com/device",
            "user_code": "resp_user_code",
            "interval": 5,
            "expires_in": 300,
        }
    )

    _AUTH_PENDING_RESPONSE = FakeHttpResponse(
        {"error": "authorization_pending"}, status=428
    )

    _AUTH_GRANTED_RESPONSE = FakeHttpResponse(
        {
            "access_token": "some_access_token",
            "refresh_token": "some_refresh_token",
            "id_token": "some_id_token",
            "expires_in": 3600,
        }
    )

    def setUp(self):
        super().setUp()

        self.mocked_time = self.enter_context(
            mock.patch.object(
                time,
                "time",
                # Timestamps from a fake clock.
                # The values don't matter in most tests.
                side_effect=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            )
        )

        self.mocked_sleep = self.enter_context(
            mock.patch.object(time, "sleep", autospec=True)
        )

        self.mocked_post = self.enter_context(
            mock.patch.object(requests, "post", autospec=True)
        )

        self.flow = auth._LimitedInputDeviceAuthFlow(
            self._OAUTH_CONFIG,
            self._SCOPES,
        )

    def test_auth_flow__console__device_request_fails__raises(self):
        self.mocked_post.return_value = FakeHttpResponse(
            {"error": "quota exceeded"}, status=403
        )

        with self.assertRaisesRegex(
            RuntimeError, "Auth service temporarily unavailable"
        ):
            self.flow.run()

    def test_auth_flow__console__polling__auth_pending_response__keeps_polling(
        self,
    ):
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            self._AUTH_PENDING_RESPONSE,
            self._AUTH_GRANTED_RESPONSE,
        ]

        self.flow.run()

        device_params = {
            "client_id": "console_client_id",
            "scope": "email openid",
        }
        polling_params = {
            "client_id": "console_client_id",
            "client_secret": "console_client_secret",
            "device_code": "resp_device_code",
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
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
            expected_post_requests, self.mocked_post.call_args_list
        )
        # `interval` in _DEVICE_RESPONSE is 5
        self.mocked_sleep.assert_called_once_with(5)

    def test_auth_flow__console__polling__access_granted__returns_credentials(
        self,
    ):
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            self._AUTH_GRANTED_RESPONSE,
        ]
        # Based on these mocked responses, time.time() is called 3 times:
        # 1. To generate an expiration time for polling
        # 2. While polling to check if we reached the expiration time
        # 3. To calculate an expiration time for the credentials (useful below)
        now_timestamp = 3
        self.mocked_time.side_effect = [1, 2, now_timestamp]

        creds = self.flow.run()

        credentials_ttl = self._AUTH_GRANTED_RESPONSE.json()["expires_in"]
        expected_expiration_timestamp = datetime.utcfromtimestamp(
            now_timestamp + credentials_ttl
        )

        expected_credentials = Credentials(
            "some_access_token",
            refresh_token="some_refresh_token",
            id_token="some_id_token",
            token_uri="https://google.com/token",
            client_id="console_client_id",
            client_secret="console_client_secret",
            scopes=self._SCOPES,
            expiry=expected_expiration_timestamp,
        )
        self.assertEqual(creds.to_json(), expected_credentials.to_json())

    def test_auth_flow__console__polling__access_denied__raises(self):
        access_denied_response = FakeHttpResponse(
            {"error": "access_denied"}, 403
        )
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            access_denied_response,
        ]

        with self.assertRaisesRegex(PermissionError, "Auth was denied."):
            self.flow.run()

    def test_auth_flow__console__polling__slow_down_response__waits_longer(
        self,
    ):
        slow_down_response = FakeHttpResponse({"error": "slow_down"})
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            slow_down_response,
            self._AUTH_GRANTED_RESPONSE,
        ]

        self.flow.run()

        # `interval`` in _DEVICE_RESPONSE is 5, which is multiplied by 1.5 and
        # parsed to int() when a slow_down error is received while polling.
        sleep_time = 7
        self.mocked_sleep.assert_called_once_with(sleep_time)

    def test_auth_flow__console__polling__bad_request_response__raises(self):
        bad_request_response = FakeHttpResponse({"error": "bad_request"}, 401)
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            bad_request_response,
        ]

        with self.assertRaisesRegex(
            ValueError, "There must be an error in the request."
        ):
            self.flow.run()

    def test_auth_flow__console__polling__timed_out__raises(self):
        self.mocked_post.return_value = self._DEVICE_RESPONSE
        # Not very realistic, but before starting to poll, the time increased
        # more than the expiration time from the _DEVICE_RESPONSE.
        self.mocked_time.side_effect = [1, 5000]

        with self.assertRaisesRegex(
            TimeoutError, "Timed out waiting for authorization."
        ):
            self.flow.run()

    def test_auth_flow__console__polling__unexpected_error__raises(self):
        unexpected_response = FakeHttpResponse({"error": "unexpected 500"}, 500)
        self.mocked_post.side_effect = [
            self._DEVICE_RESPONSE,
            unexpected_response,
        ]

        with self.assertRaisesRegex(
            RuntimeError, "An unexpected error occurred while authenticating."
        ):
            self.flow.run()


if __name__ == "__main__":
    tb_test.main()
