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
"""Provides authentication support for TensorBoardUploader."""


import datetime
import errno
import json
import os
import requests
import sys
import time
import webbrowser

import google_auth_oauthlib.flow as auth_flows
import grpc
import google.auth
import google.auth.transport.requests
import google.oauth2.credentials

from tensorboard.uploader import util
from tensorboard.util import tb_logging


logger = tb_logging.get_logger()


# OAuth2 scopes used for OpenID Connect:
# https://developers.google.com/identity/protocols/OpenIDConnect#scope-param
OPENID_CONNECT_SCOPES = (
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
)

# This config was downloaded from our GCP project at:
# console.cloud.google.com/apis/credentials?project=hosted-tensorboard-prod
# and in b/143316611.
#
# The client "secret" is considered public, as it's distributed to the devices
# where this runs. See:
# https://developers.google.com/identity/protocols/OAuth2?csw=1#installed
#
# See below for the config for another accepted credential.
_INSTALLED_APP_OAUTH_CLIENT_CONFIG = """
    {
        "installed":{
            "client_id":"373649185512-8v619h5kft38l4456nm2dj4ubeqsrvh6.apps.googleusercontent.com",
            "project_id":"hosted-tensorboard-prod",
            "auth_uri":"https://accounts.google.com/o/oauth2/auth",
            "token_uri":"https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs",
            "client_secret":"pOyAuU2yq2arsM98Bw5hwYtr",
            "redirect_uris":["http://localhost"]
        }
    }
"""


# These values can be updated with values from the well-known "discovery url":
# https://accounts.google.com/.well-known/openid-configuration
#
# See:
# developers.google.com/identity/openid-connect/openid-connect#discovery
_DEVICE_AUTH_CODE_URI = "https://oauth2.googleapis.com/device/code"


_LIMITED_INPUT_DEVICE_AUTH_GRANT_TYPE = (
    "urn:ietf:params:oauth:grant-type:device_code"
)

# This config was downloaded from our GCP project at:
# console.cloud.google.com/apis/credentials?project=hosted-tensorboard-prod
# and in b/262276562.
#
# Note that some of these fields are not really useful for this flow.
# It seems the limited-input device flow is not quite as well supported yet by
# neither the Google python oauth libraries, nor the GCP console, so this config
# does not match what we would need to authenticate this way (starting from the
# fact that it seems to be a config for an "installed" app), but we do use some
# of them (e.g. client_id and client_secret), along with other values defined in
# separate constants for this auth flow.
#
# The client "secret" is considered public, as it's distributed to the devices
# where this runs. See:
# https://developers.google.com/identity/protocols/oauth2/limited-input-device
#
# See above for the config for another accepted credential.
_LIMITED_INPUT_DEVICE_OAUTH_CLIENT_CONFIG = """
    {
        "installed":{
            "client_id":"373649185512-26ojik4u7dt0rdtfdmfnhpajqqh579qd.apps.googleusercontent.com",
            "project_id":"hosted-tensorboard-prod",
            "auth_uri":"https://accounts.google.com/o/oauth2/auth",
            "token_uri":"https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs",
            "client_secret":"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"
        }
    }
"""


# Components of the relative path (within the user settings directory) at which
# to store TensorBoard uploader credentials.
TENSORBOARD_CREDENTIALS_FILEPATH_PARTS = [
    "tensorboard",
    "credentials",
    "uploader-creds.json",
]


class CredentialsStore(object):
    """Private file store for a `google.oauth2.credentials.Credentials`."""

    _DEFAULT_CONFIG_DIRECTORY = object()  # Sentinel value.

    def __init__(self, user_config_directory=_DEFAULT_CONFIG_DIRECTORY):
        """Creates a CredentialsStore.

        Args:
          user_config_directory: Optional absolute path to the root directory for
            storing user configs, under which to store the credentials file. If not
            set, defaults to a platform-specific location. If set to None, the
            store is disabled (reads return None; write and clear are no-ops).
        """
        if user_config_directory is CredentialsStore._DEFAULT_CONFIG_DIRECTORY:
            user_config_directory = util.get_user_config_directory()
            if user_config_directory is None:
                logger.warning(
                    "Credentials caching disabled - no private config directory found"
                )
        if user_config_directory is None:
            self._credentials_filepath = None
        else:
            self._credentials_filepath = os.path.join(
                user_config_directory, *TENSORBOARD_CREDENTIALS_FILEPATH_PARTS
            )

    def read_credentials(self):
        """Returns the current `google.oauth2.credentials.Credentials`, or
        None."""
        if self._credentials_filepath is None:
            return None
        if os.path.exists(self._credentials_filepath):
            return (
                google.oauth2.credentials.Credentials.from_authorized_user_file(
                    self._credentials_filepath
                )
            )
        return None

    def write_credentials(self, credentials):
        """Writes a `google.oauth2.credentials.Credentials` to the store."""
        if not isinstance(credentials, google.oauth2.credentials.Credentials):
            raise TypeError(
                "Cannot write credentials of type %s" % type(credentials)
            )
        if self._credentials_filepath is None:
            return
        # Make the credential file private if not on Windows; on Windows we rely on
        # the default user config settings directory being private since we don't
        # have a straightforward way to make an individual file private.
        private = os.name != "nt"
        util.make_file_with_directories(
            self._credentials_filepath, private=private
        )
        data = {
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes,
            "type": "authorized_user",
        }
        with open(self._credentials_filepath, "w") as f:
            json.dump(data, f)

    def clear(self):
        """Clears the store of any persisted credentials information."""
        if self._credentials_filepath is None:
            return
        try:
            os.remove(self._credentials_filepath)
        except OSError as e:
            if e.errno != errno.ENOENT:
                raise


def authenticate_user(
    force_console=False,
) -> google.oauth2.credentials.Credentials:
    """Makes the user authenticate to retrieve auth credentials.

    The default behavior is to use the [installed app flow](
    http://developers.google.com/identity/protocols/oauth2/native-app), in which
    a browser is started for the user to authenticate, along with a local web
    server. The authentication in the browser would produce a redirect response
    to `localhost` with an authorization code that would then be received by the
    local web server started here.

    The two most notable cases where the default flow is not well supported are:
    - When the uploader is run from a colab notebook.
    - Then the uploader is run via a remote terminal (SSH).

    If any of the following is true, a different auth flow will be used:
    - the flag `--auth_force_console` is set to true, or
    - a browser is not available, or
    - a local web server cannot be started

    In this case, a [limited-input device flow](
    http://developers.google.com/identity/protocols/oauth2/limited-input-device)
    will be used, in which the user is presented with a URL and a short code
    that they'd need to use to authenticate and authorize access in a separate
    browser or device. The uploader will poll for access until the access is
    granted or rejected, or the initiated authorization request expires.
    """
    scopes = OPENID_CONNECT_SCOPES
    # TODO(b/141721828): make auto-detection smarter, especially for macOS.
    if not force_console and os.getenv("DISPLAY"):
        try:
            client_config = json.loads(_INSTALLED_APP_OAUTH_CLIENT_CONFIG)
            flow = auth_flows.InstalledAppFlow.from_client_config(
                client_config, scopes=scopes
            )
            return flow.run_local_server(port=0)
        except webbrowser.Error:
            sys.stderr.write("Falling back to remote authentication flow...\n")

    client_config = json.loads(_LIMITED_INPUT_DEVICE_OAUTH_CLIENT_CONFIG)
    flow = _LimitedInputDeviceAuthFlow(client_config, scopes=scopes)
    return flow.run()


class _LimitedInputDeviceAuthFlow:
    """OAuth flow to authenticate using the limited-input device flow.

    See:
    http://developers.google.com/identity/protocols/oauth2/limited-input-device
    """

    def __init__(self, client_config, scopes):
        # The config is loaded from a json string from the GCP project, which
        # comes with an "installed" wrapper layer on the values we need.
        self._client_config = client_config["installed"]
        self._scopes = scopes

    def run(self) -> google.oauth2.credentials.Credentials:
        device_response = self._send_device_auth_request()
        prompt_message = (
            "To sign in with the TensorBoard uploader:\n"
            "\n"
            "1. On your computer or phone, visit:\n"
            "\n"
            "   {url}\n"
            "\n"
            "2. Sign in with your Google account, then enter:\n"
            "\n"
            "   {code}\n".format(
                url=device_response["verification_url"],
                code=device_response["user_code"],
            )
        )
        print(prompt_message)

        auth_response = self._poll_for_auth_token(
            device_code=device_response["device_code"],
            polling_interval=device_response["interval"],
            expiration_seconds=device_response["expires_in"],
        )

        return self._build_credentials(auth_response)

    def _send_device_auth_request(self):
        params = {
            "client_id": self._client_config["client_id"],
            "scope": " ".join(self._scopes),
        }
        r = requests.post(_DEVICE_AUTH_CODE_URI, data=params).json()
        if "device_code" not in r:
            raise RuntimeError(
                "There was an error while contacting Google's authorization "
                "server. Please try again later."
            )
        return r

    def _poll_for_auth_token(
        self, device_code: str, polling_interval: int, expiration_seconds: int
    ):
        token_uri = self._client_config["token_uri"]
        params = {
            "client_id": self._client_config["client_id"],
            "client_secret": self._client_config["client_secret"],
            "device_code": device_code,
            "grant_type": _LIMITED_INPUT_DEVICE_AUTH_GRANT_TYPE,
        }
        expiration_time = time.time() + expiration_seconds
        # Error cases documented in
        # https://developers.google.com/identity/protocols/oauth2/limited-input-device#step-6:-handle-responses-to-polling-requests
        while time.time() < expiration_time:
            resp = requests.post(token_uri, data=params)
            r = resp.json()
            if "access_token" in r:
                return r
            elif "error" in r and r["error"] == "authorization_pending":
                # Not really an error. This is the expected response when the
                # user has not yet granted access to this app.
                time.sleep(polling_interval)
            elif "error" in r and r["error"] == "slow_down":
                # We should be polling at the specified interval from the
                # previous response, so this error would be unexpected.
                # However, it is just a temporary/retryable error, so we can
                # poll a bit more slowly.
                polling_interval = int(polling_interval * 1.5)
                time.sleep(polling_interval)
            elif "error" in r and r["error"] == "access_denied":
                raise PermissionError("Access was denied by user.")
            elif resp.status_code in {400, 401}:
                raise ValueError("There must be an error in the request.")
            else:
                raise RuntimeError(
                    "An unexpected error occurred while waiting for "
                    "authorization."
                )
        raise TimeoutError("Timed out waiting for authorization.")

    def _build_credentials(
        self, auth_response
    ) -> google.oauth2.credentials.Credentials:

        expiration_datetime = datetime.datetime.utcfromtimestamp(
            int(time.time()) + auth_response["expires_in"]
        )
        return google.oauth2.credentials.Credentials(
            auth_response["access_token"],
            refresh_token=auth_response["refresh_token"],
            id_token=auth_response["id_token"],
            token_uri=self._client_config["token_uri"],
            client_id=self._client_config["client_id"],
            client_secret=self._client_config["client_secret"],
            scopes=self._scopes,
            expiry=expiration_datetime,
        )


class IdTokenAuthMetadataPlugin(grpc.AuthMetadataPlugin):
    """A `gRPC AuthMetadataPlugin` that uses ID tokens.

    This works like the existing `google.auth.transport.grpc.AuthMetadataPlugin`
    except that instead of always using access tokens, it preferentially uses the
    `Credentials.id_token` property if available (and logs an error otherwise).

    See http://www.grpc.io/grpc/python/grpc.html#grpc.AuthMetadataPlugin
    """

    def __init__(self, credentials, request):
        """Constructs an IdTokenAuthMetadataPlugin.

        Args:
          credentials (google.auth.credentials.Credentials): The credentials to
            add to requests.
          request (google.auth.transport.Request): A HTTP transport request object
            used to refresh credentials as needed.
        """
        super(IdTokenAuthMetadataPlugin, self).__init__()
        if not isinstance(credentials, google.oauth2.credentials.Credentials):
            raise TypeError(
                "Cannot get ID tokens from credentials type %s"
                % type(credentials)
            )
        self._credentials = credentials
        self._request = request

    def __call__(self, context, callback):
        """Passes authorization metadata into the given callback.

        Args:
          context (grpc.AuthMetadataContext): The RPC context.
          callback (grpc.AuthMetadataPluginCallback): The callback that will
            be invoked to pass in the authorization metadata.
        """
        headers = {}
        self._credentials.before_request(
            self._request, context.method_name, context.service_url, headers
        )
        id_token = getattr(self._credentials, "id_token", None)
        if id_token:
            self._credentials.apply(headers, token=id_token)
        else:
            logger.error("Failed to find ID token credentials")
        # Pass headers as key-value pairs to match CallCredentials metadata.
        callback(list(headers.items()), None)


def id_token_call_credentials(credentials):
    """Constructs `grpc.CallCredentials` using
    `google.auth.Credentials.id_token`.

    Args:
      credentials (google.auth.credentials.Credentials): The credentials to use.

    Returns:
      grpc.CallCredentials: The call credentials.
    """
    request = google.auth.transport.requests.Request()
    return grpc.metadata_call_credentials(
        IdTokenAuthMetadataPlugin(credentials, request)
    )
