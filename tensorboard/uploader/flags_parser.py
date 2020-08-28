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
"""Flags parser for TensorBoard.dev uploader."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


SUBCOMMAND_FLAG = "_uploader__subcommand"
SUBCOMMAND_KEY_UPLOAD = "UPLOAD"
SUBCOMMAND_KEY_DELETE = "DELETE"
SUBCOMMAND_KEY_LIST = "LIST"
SUBCOMMAND_KEY_EXPORT = "EXPORT"
SUBCOMMAND_KEY_UPDATE_METADATA = "UPDATEMETADATA"
SUBCOMMAND_KEY_AUTH = "AUTH"
AUTH_SUBCOMMAND_FLAG = "_uploader__subcommand_auth"
AUTH_SUBCOMMAND_KEY_REVOKE = "REVOKE"

DEFAULT_ORIGIN = "https://tensorboard.dev"


def define_flags(parser):
    """Configures flags on the provided argument parser.

    Integration point for `tensorboard.program`'s subcommand system.

    Args:
      parser: An `argparse.ArgumentParser` to be mutated.
    """

    subparsers = parser.add_subparsers()

    parser.add_argument(
        "--origin",
        type=str,
        default="",
        help="Experimental. Origin for TensorBoard.dev service to which "
        "to connect. If not set, defaults to %r." % DEFAULT_ORIGIN,
    )

    parser.add_argument(
        "--api_endpoint",
        type=str,
        default="",
        help="Experimental. Direct URL for the API server accepting "
        "write requests. If set, will skip initial server handshake "
        "unless `--origin` is also set.",
    )

    parser.add_argument(
        "--grpc_creds_type",
        type=str,
        default="ssl",
        choices=("local", "ssl", "ssl_dev"),
        help="The type of credentials to use for the gRPC client",
    )

    parser.add_argument(
        "--auth_force_console",
        action="store_true",
        help="Set to true to force authentication flow to use the "
        "--console rather than a browser redirect to localhost.",
    )

    upload = subparsers.add_parser(
        "upload", help="upload an experiment to TensorBoard.dev"
    )
    upload.set_defaults(**{SUBCOMMAND_FLAG: SUBCOMMAND_KEY_UPLOAD})
    upload.add_argument(
        "--logdir",
        metavar="PATH",
        type=str,
        default=None,
        help="Directory containing the logs to process",
    )
    upload.add_argument(
        "--name",
        type=str,
        default=None,
        help="Title of the experiment.  Max 100 characters.",
    )
    upload.add_argument(
        "--description",
        type=str,
        default=None,
        help="Experiment description. Markdown format.  Max 600 characters.",
    )
    upload.add_argument(
        "--verbose",
        type=int,
        default=1,
        help="Verbosity of the upload during data uploading. Supported values: "
        "0: no statistics printed during uploading. 1 (default): print data "
        "statistics as data is uploaded.",
    )
    upload.add_argument(
        "--dry_run",
        action="store_true",
        help="Perform a dry run of uploading. In a dry run, the data is read "
        "from the logdir as pointed to by the --logdir flag and statistics are "
        "displayed (if --verbose is not 0), but no data is actually uploaded "
        "to the server.",
    )
    upload.add_argument(
        "--one_shot",
        action="store_true",
        help="Upload only the existing data in the logdir and then exit "
        "immediately, instead of continuing to listen for new data in the "
        "logdir.",
    )
    upload.add_argument(
        "--plugins",
        type=lambda option: option.split(","),
        default=[],
        help="List of plugins for which data should be uploaded. If "
        "unspecified then data will be uploaded for all plugins supported by "
        "the server.",
    )

    update_metadata = subparsers.add_parser(
        "update-metadata",
        help="change the name, description, or other user "
        "metadata associated with an experiment.",
    )
    update_metadata.set_defaults(
        **{SUBCOMMAND_FLAG: SUBCOMMAND_KEY_UPDATE_METADATA}
    )
    update_metadata.add_argument(
        "--experiment_id",
        metavar="EXPERIMENT_ID",
        type=str,
        default=None,
        help="ID of the experiment on which to modify the metadata.",
    )
    update_metadata.add_argument(
        "--name",
        type=str,
        default=None,
        help="Title of the experiment.  Max 100 characters.",
    )
    update_metadata.add_argument(
        "--description",
        type=str,
        default=None,
        help="Experiment description. Markdown format.  Max 600 characters.",
    )

    delete = subparsers.add_parser(
        "delete",
        help="permanently delete an experiment",
        inherited_absl_flags=None,
    )
    delete.set_defaults(**{SUBCOMMAND_FLAG: SUBCOMMAND_KEY_DELETE})
    # We would really like to call this next flag `--experiment` rather
    # than `--experiment_id`, but this is broken inside Google due to a
    # long-standing Python bug: <https://bugs.python.org/issue14365>
    # (Some Google-internal dependencies define `--experimental_*` flags.)
    # This isn't exactly a principled fix, but it gets the job done.
    delete.add_argument(
        "--experiment_id",
        metavar="EXPERIMENT_ID",
        type=str,
        default=None,
        help="ID of an experiment to delete permanently",
    )

    list_parser = subparsers.add_parser(
        "list", help="list previously uploaded experiments"
    )
    list_parser.set_defaults(**{SUBCOMMAND_FLAG: SUBCOMMAND_KEY_LIST})
    list_parser.add_argument(
        "--json",
        action="store_true",
        help="print the experiments as JSON objects",
    )

    export = subparsers.add_parser(
        "export", help="download all your experiment data"
    )
    export.set_defaults(**{SUBCOMMAND_FLAG: SUBCOMMAND_KEY_EXPORT})
    export.add_argument(
        "--outdir",
        metavar="OUTPUT_PATH",
        type=str,
        default=None,
        help="Directory into which to download all experiment data; "
        "must not yet exist",
    )

    auth_parser = subparsers.add_parser("auth", help="log in, log out")
    auth_parser.set_defaults(**{SUBCOMMAND_FLAG: SUBCOMMAND_KEY_AUTH})
    auth_subparsers = auth_parser.add_subparsers()

    auth_revoke = auth_subparsers.add_parser(
        "revoke", help="revoke all existing credentials and log out"
    )
    auth_revoke.set_defaults(
        **{AUTH_SUBCOMMAND_FLAG: AUTH_SUBCOMMAND_KEY_REVOKE}
    )
