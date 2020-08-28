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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import errno
import json
import os
import sys
import webbrowser

import google_auth_oauthlib.flow
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


# The client "secret" is public by design for installed apps. See
# https://developers.google.com/identity/protocols/OAuth2?csw=1#installed
OAUTH_CLIENT_CONFIG = u"""
{
  "installed": {
    "client_id": "373649185512-8v619h5kft38l4456nm2dj4ubeqsrvh6.apps.googleusercontent.com",
    "project_id": "hosted-tensorboard-prod",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "pOyAuU2yq2arsM98Bw5hwYtr",
    "redirect_uris": [
      "urn:ietf:wg:oauth:2.0:oob",
      "http://localhost"
    ]
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
            return google.oauth2.credentials.Credentials.from_authorized_user_file(
                self._credentials_filepath
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


def build_installed_app_flow(client_config):
    """Returns a `CustomInstalledAppFlow` for the given config.

    Args:
      client_config (Mapping[str, Any]): The client configuration in the Google
          client secrets format.

    Returns:
      CustomInstalledAppFlow: the constructed flow.
    """
    return CustomInstalledAppFlow.from_client_config(
        client_config, scopes=OPENID_CONNECT_SCOPES
    )


class CustomInstalledAppFlow(google_auth_oauthlib.flow.InstalledAppFlow):
    """Customized version of the Installed App OAuth2 flow."""

    def run(self, force_console=False):
        """Run the flow using a local server if possible, otherwise the
        console."""
        # TODO(b/141721828): make auto-detection smarter, especially for macOS.
        if not force_console and os.getenv("DISPLAY"):
            try:
                return self.run_local_server(port=0)
            except webbrowser.Error:
                sys.stderr.write(
                    "Falling back to console authentication flow...\n"
                )
        return self.run_console()


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
