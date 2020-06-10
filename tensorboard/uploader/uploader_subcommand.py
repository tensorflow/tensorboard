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
"""Entry point and high-level logic for TensorBoard.dev uploader."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import abc
import json
import os
import sys
import textwrap

from absl import app
from absl import logging
import grpc
import six

from tensorboard.uploader.proto import experiment_pb2
from tensorboard.uploader.proto import export_service_pb2_grpc
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader import auth
from tensorboard.uploader import dry_run_stubs
from tensorboard.uploader import exporter as exporter_lib
from tensorboard.uploader import flags_parser
from tensorboard.uploader import formatters
from tensorboard.uploader import server_info as server_info_lib
from tensorboard.uploader import uploader as uploader_lib
from tensorboard.uploader import util
from tensorboard.uploader.proto import server_info_pb2
from tensorboard import program
from tensorboard.plugins import base_plugin


_MESSAGE_TOS = u"""\
Your use of this service is subject to Google's Terms of Service
<https://policies.google.com/terms> and Privacy Policy
<https://policies.google.com/privacy>, and TensorBoard.dev's Terms of Service
<https://tensorboard.dev/policy/terms/>.

This notice will not be shown again while you are logged into the uploader.
To log out, run `tensorboard dev auth revoke`.
"""


# Size limits for input fields not bounded at a wire level. "Chars" in this
# context refers to Unicode code points as stipulated by https://aip.dev/210.
_EXPERIMENT_NAME_MAX_CHARS = 100
_EXPERIMENT_DESCRIPTION_MAX_CHARS = 600


def _prompt_for_user_ack(intent):
    """Prompts for user consent, exiting the program if they decline."""
    body = intent.get_ack_message_body()
    header = "\n***** TensorBoard Uploader *****\n"
    user_ack_message = "\n".join((header, body, _MESSAGE_TOS))
    sys.stderr.write(user_ack_message)
    sys.stderr.write("\n")
    response = six.moves.input("Continue? (yes/NO) ")
    if response.lower() not in ("y", "yes"):
        sys.exit(0)
    sys.stderr.write("\n")


def _run(flags):
    """Runs the main uploader program given parsed flags.

    Args:
      flags: An `argparse.Namespace`.
    """

    logging.set_stderrthreshold(logging.WARNING)
    intent = _get_intent(flags)

    store = auth.CredentialsStore()
    if isinstance(intent, _AuthRevokeIntent):
        store.clear()
        sys.stderr.write("Logged out of uploader.\n")
        sys.stderr.flush()
        return
    # TODO(b/141723268): maybe reconfirm Google Account prior to reuse.
    credentials = store.read_credentials()
    if not credentials:
        _prompt_for_user_ack(intent)
        client_config = json.loads(auth.OAUTH_CLIENT_CONFIG)
        flow = auth.build_installed_app_flow(client_config)
        credentials = flow.run(force_console=flags.auth_force_console)
        sys.stderr.write("\n")  # Extra newline after auth flow messages.
        store.write_credentials(credentials)

    channel_options = None
    if flags.grpc_creds_type == "local":
        channel_creds = grpc.local_channel_credentials()
    elif flags.grpc_creds_type == "ssl":
        channel_creds = grpc.ssl_channel_credentials()
    elif flags.grpc_creds_type == "ssl_dev":
        # Configure the dev cert to use by passing the environment variable
        # GRPC_DEFAULT_SSL_ROOTS_FILE_PATH=path/to/cert.crt
        channel_creds = grpc.ssl_channel_credentials()
        channel_options = [("grpc.ssl_target_name_override", "localhost")]
    else:
        msg = "Invalid --grpc_creds_type %s" % flags.grpc_creds_type
        raise base_plugin.FlagsError(msg)

    try:
        server_info = _get_server_info(flags)
    except server_info_lib.CommunicationError as e:
        _die(str(e))
    _handle_server_info(server_info)
    logging.info("Received server info: <%r>", server_info)

    if not server_info.api_server.endpoint:
        logging.error("Server info response: %s", server_info)
        _die("Internal error: frontend did not specify an API server")
    composite_channel_creds = grpc.composite_channel_credentials(
        channel_creds, auth.id_token_call_credentials(credentials)
    )

    # TODO(@nfelt): In the `_UploadIntent` case, consider waiting until
    # logdir exists to open channel.
    channel = grpc.secure_channel(
        server_info.api_server.endpoint,
        composite_channel_creds,
        options=channel_options,
    )
    with channel:
        intent.execute(server_info, channel)


@six.add_metaclass(abc.ABCMeta)
class _Intent(object):
    """A description of the user's intent in invoking this program.

    Each valid set of CLI flags corresponds to one intent: e.g., "upload
    data from this logdir", or "delete the experiment with that ID".
    """

    @abc.abstractmethod
    def get_ack_message_body(self):
        """Gets the message to show when executing this intent at first login.

        This need not include the header (program name) or Terms of Service
        notice.

        Returns:
          A Unicode string, potentially spanning multiple lines.
        """
        pass

    @abc.abstractmethod
    def execute(self, server_info, channel):
        """Carries out this intent with the specified gRPC channel.

        Args:
          server_info: A `server_info_pb2.ServerInfoResponse` value.
          channel: A connected gRPC channel whose server provides the TensorBoard
            reader and writer services.
        """
        pass


class _AuthRevokeIntent(_Intent):
    """The user intends to revoke credentials."""

    def get_ack_message_body(self):
        """Must not be called."""
        raise AssertionError("No user ack needed to revoke credentials")

    def execute(self, server_info, channel):
        """Execute handled specially by `main`.

        Must not be called.
        """
        raise AssertionError(
            "_AuthRevokeIntent should not be directly executed"
        )


class _DeleteExperimentIntent(_Intent):
    """The user intends to delete an experiment."""

    _MESSAGE_TEMPLATE = textwrap.dedent(
        u"""\
        This will delete the experiment on https://tensorboard.dev with the
        following experiment ID:

        {experiment_id}

        You have chosen to delete an experiment. All experiments uploaded
        to TensorBoard.dev are publicly visible. Do not upload sensitive
        data.
        """
    )

    def __init__(self, experiment_id):
        self.experiment_id = experiment_id

    def get_ack_message_body(self):
        return self._MESSAGE_TEMPLATE.format(experiment_id=self.experiment_id)

    def execute(self, server_info, channel):
        api_client = write_service_pb2_grpc.TensorBoardWriterServiceStub(
            channel
        )
        experiment_id = self.experiment_id
        if not experiment_id:
            raise base_plugin.FlagsError(
                "Must specify a non-empty experiment ID to delete."
            )
        try:
            uploader_lib.delete_experiment(api_client, experiment_id)
        except uploader_lib.ExperimentNotFoundError:
            _die(
                "No such experiment %s. Either it never existed or it has "
                "already been deleted." % experiment_id
            )
        except uploader_lib.PermissionDeniedError:
            _die(
                "Cannot delete experiment %s because it is owned by a "
                "different user." % experiment_id
            )
        except grpc.RpcError as e:
            _die("Internal error deleting experiment: %s" % e)
        print("Deleted experiment %s." % experiment_id)


class _UpdateMetadataIntent(_Intent):
    """The user intends to update the metadata for an experiment."""

    _MESSAGE_TEMPLATE = textwrap.dedent(
        u"""\
        This will modify the metadata associated with the experiment on
        https://tensorboard.dev with the following experiment ID:

        {experiment_id}

        You have chosen to modify an experiment. All experiments uploaded
        to TensorBoard.dev are publicly visible. Do not upload sensitive
        data.
        """
    )

    def __init__(self, experiment_id, name=None, description=None):
        self.experiment_id = experiment_id
        self.name = name
        self.description = description

    def get_ack_message_body(self):
        return self._MESSAGE_TEMPLATE.format(experiment_id=self.experiment_id)

    def execute(self, server_info, channel):
        api_client = write_service_pb2_grpc.TensorBoardWriterServiceStub(
            channel
        )
        experiment_id = self.experiment_id
        _die_if_bad_experiment_name(self.name)
        _die_if_bad_experiment_description(self.description)
        if not experiment_id:
            raise base_plugin.FlagsError(
                "Must specify a non-empty experiment ID to modify."
            )
        try:
            uploader_lib.update_experiment_metadata(
                api_client,
                experiment_id,
                name=self.name,
                description=self.description,
            )
        except uploader_lib.ExperimentNotFoundError:
            _die(
                "No such experiment %s. Either it never existed or it has "
                "already been deleted." % experiment_id
            )
        except uploader_lib.PermissionDeniedError:
            _die(
                "Cannot modify experiment %s because it is owned by a "
                "different user." % experiment_id
            )
        except uploader_lib.InvalidArgumentError as e:
            _die("Server cannot modify experiment as requested: %s" % e)
        except grpc.RpcError as e:
            _die("Internal error modifying experiment: %s" % e)
        logging.info("Modified experiment %s.", experiment_id)
        if self.name is not None:
            logging.info("Set name to %r", self.name)
        if self.description is not None:
            logging.info("Set description to %r", repr(self.description))


class _ListIntent(_Intent):
    """The user intends to list all their experiments."""

    _MESSAGE = textwrap.dedent(
        u"""\
        This will list all experiments that you've uploaded to
        https://tensorboard.dev. TensorBoard.dev experiments are visible
        to everyone. Do not upload sensitive data.
        """
    )

    def __init__(self, json=None):
        """Constructor of _ListIntent.

        Args:
          json: If and only if `True`, will print the list as pretty-formatted
            JSON objects, one object for each experiment.
        """
        self.json = json

    def get_ack_message_body(self):
        return self._MESSAGE

    def execute(self, server_info, channel):
        api_client = export_service_pb2_grpc.TensorBoardExporterServiceStub(
            channel
        )
        fieldmask = experiment_pb2.ExperimentMask(
            create_time=True,
            update_time=True,
            num_runs=True,
            num_tags=True,
            num_scalars=True,
            total_tensor_bytes=True,
            total_blob_bytes=True,
        )
        gen = exporter_lib.list_experiments(api_client, fieldmask=fieldmask)
        count = 0

        if self.json:
            formatter = formatters.JsonFormatter()
        else:
            formatter = formatters.ReadableFormatter()
        for experiment in gen:
            count += 1
            experiment_id = experiment.experiment_id
            url = server_info_lib.experiment_url(server_info, experiment_id)
            print(formatter.format_experiment(experiment, url))
        sys.stdout.flush()
        if not count:
            sys.stderr.write(
                "No experiments. Use `tensorboard dev upload` to get started.\n"
            )
        else:
            sys.stderr.write("Total: %d experiment(s)\n" % count)
        sys.stderr.flush()


def _die_if_bad_experiment_name(name):
    if name and len(name) > _EXPERIMENT_NAME_MAX_CHARS:
        _die(
            "Experiment name is too long.  Limit is "
            "%s characters.\n"
            "%r was provided." % (_EXPERIMENT_NAME_MAX_CHARS, name)
        )


def _die_if_bad_experiment_description(description):
    if description and len(description) > _EXPERIMENT_DESCRIPTION_MAX_CHARS:
        _die(
            "Experiment description is too long.  Limit is %s characters.\n"
            "%r was provided."
            % (_EXPERIMENT_DESCRIPTION_MAX_CHARS, description)
        )


class UploadIntent(_Intent):
    """The user intends to upload an experiment from the given logdir."""

    _MESSAGE_TEMPLATE = textwrap.dedent(
        u"""\
        This will upload your TensorBoard logs to https://tensorboard.dev/ from
        the following directory:

        {logdir}

        This TensorBoard will be visible to everyone. Do not upload sensitive
        data.
        """
    )

    def __init__(
        self,
        logdir,
        name=None,
        description=None,
        verbosity=None,
        dry_run=None,
        one_shot=None,
    ):
        self.logdir = logdir
        self.name = name
        self.description = description
        self.verbosity = verbosity
        self.dry_run = False if dry_run is None else dry_run
        self.one_shot = False if one_shot is None else one_shot

    def get_ack_message_body(self):
        return self._MESSAGE_TEMPLATE.format(logdir=self.logdir)

    def execute(self, server_info, channel):
        if self.dry_run:
            api_client = dry_run_stubs.DryRunTensorBoardWriterStub()
        else:
            api_client = write_service_pb2_grpc.TensorBoardWriterServiceStub(
                channel
            )
        _die_if_bad_experiment_name(self.name)
        _die_if_bad_experiment_description(self.description)
        uploader = uploader_lib.TensorBoardUploader(
            api_client,
            self.logdir,
            allowed_plugins=server_info_lib.allowed_plugins(server_info),
            upload_limits=server_info_lib.upload_limits(server_info),
            name=self.name,
            description=self.description,
            verbosity=self.verbosity,
            one_shot=self.one_shot,
        )
        experiment_id = uploader.create_experiment()
        url = server_info_lib.experiment_url(server_info, experiment_id)
        print(
            "Upload started and will continue reading any new data as it's added"
        )
        print("to the logdir. To stop uploading, press Ctrl-C.")
        if self.dry_run:
            print(
                "\n** This is a dry run. "
                "No data will be sent to tensorboard.dev. **\n"
            )
        else:
            print("\nView your TensorBoard live at: %s\n" % url)
        interrupted = False
        try:
            uploader.start_uploading()
        except uploader_lib.ExperimentNotFoundError:
            print("Experiment was deleted; uploading has been cancelled")
            return
        except KeyboardInterrupt:
            interrupted = True
        finally:
            end_message = "\n"
            if interrupted:
                end_message += "Interrupted."
            else:
                end_message += "Done."
            if not self.dry_run:
                end_message += " View your TensorBoard at %s" % url
            sys.stdout.write(end_message + "\n")
            sys.stdout.flush()


class _ExportIntent(_Intent):
    """The user intends to download all their experiment data."""

    _MESSAGE_TEMPLATE = textwrap.dedent(
        u"""\
        This will download all your experiment data from https://tensorboard.dev
        and save it to the following directory:

        {output_dir}

        Downloading your experiment data does not delete it from the
        service. All experiments uploaded to TensorBoard.dev are publicly
        visible. Do not upload sensitive data.
        """
    )

    def __init__(self, output_dir):
        self.output_dir = output_dir

    def get_ack_message_body(self):
        return self._MESSAGE_TEMPLATE.format(output_dir=self.output_dir)

    def execute(self, server_info, channel):
        api_client = export_service_pb2_grpc.TensorBoardExporterServiceStub(
            channel
        )
        outdir = self.output_dir
        try:
            exporter = exporter_lib.TensorBoardExporter(api_client, outdir)
        except exporter_lib.OutputDirectoryExistsError:
            msg = "Output directory already exists: %r" % outdir
            raise base_plugin.FlagsError(msg)
        num_experiments = 0
        try:
            for experiment_id in exporter.export():
                num_experiments += 1
                print("Downloaded experiment %s" % experiment_id)
        except exporter_lib.GrpcTimeoutException as e:
            print(
                "\nUploader has failed because of a timeout error.  Please reach "
                "out via e-mail to tensorboard.dev-support@google.com to get help "
                "completing your export of experiment %s." % e.experiment_id
            )
        print(
            "Done. Downloaded %d experiments to: %s" % (num_experiments, outdir)
        )


def _get_intent(flags):
    """Determines what the program should do (upload, delete, ...).

    Args:
      flags: An `argparse.Namespace` with the parsed flags.

    Returns:
      An `_Intent` instance.

    Raises:
      base_plugin.FlagsError: If the command-line `flags` do not correctly
        specify an intent.
    """
    cmd = getattr(flags, flags_parser.SUBCOMMAND_FLAG, None)
    if cmd is None:
        raise base_plugin.FlagsError("Must specify subcommand (try --help).")
    if cmd == flags_parser.SUBCOMMAND_KEY_UPLOAD:
        if flags.logdir:
            return UploadIntent(
                os.path.expanduser(flags.logdir),
                name=flags.name,
                description=flags.description,
                verbosity=flags.verbose,
                dry_run=flags.dry_run,
                one_shot=flags.one_shot,
            )
        else:
            raise base_plugin.FlagsError(
                "Must specify directory to upload via `--logdir`."
            )
    if cmd == flags_parser.SUBCOMMAND_KEY_UPDATE_METADATA:
        if flags.experiment_id:
            if flags.name is not None or flags.description is not None:
                return _UpdateMetadataIntent(
                    flags.experiment_id,
                    name=flags.name,
                    description=flags.description,
                )
            else:
                raise base_plugin.FlagsError(
                    "Must specify either `--name` or `--description`."
                )
        else:
            raise base_plugin.FlagsError(
                "Must specify experiment to modify via `--experiment_id`."
            )
    elif cmd == flags_parser.SUBCOMMAND_KEY_DELETE:
        if flags.experiment_id:
            return _DeleteExperimentIntent(flags.experiment_id)
        else:
            raise base_plugin.FlagsError(
                "Must specify experiment to delete via `--experiment_id`."
            )
    elif cmd == flags_parser.SUBCOMMAND_KEY_LIST:
        return _ListIntent(json=flags.json)
    elif cmd == flags_parser.SUBCOMMAND_KEY_EXPORT:
        if flags.outdir:
            return _ExportIntent(flags.outdir)
        else:
            raise base_plugin.FlagsError(
                "Must specify output directory via `--outdir`."
            )
    elif cmd == flags_parser.SUBCOMMAND_KEY_AUTH:
        auth_cmd = getattr(flags, flags_parser.AUTH_SUBCOMMAND_FLAG, None)
        if auth_cmd is None:
            raise base_plugin.FlagsError("Must specify a subcommand to `auth`.")
        if auth_cmd == flags_parser.AUTH_SUBCOMMAND_KEY_REVOKE:
            return _AuthRevokeIntent()
        else:
            raise AssertionError("Unknown auth subcommand %r" % (auth_cmd,))
    else:
        raise AssertionError("Unknown subcommand %r" % (cmd,))


def _get_server_info(flags):
    origin = flags.origin or flags_parser.DEFAULT_ORIGIN
    plugins = getattr(flags, "plugins", [])

    if flags.api_endpoint and not flags.origin:
        return server_info_lib.create_server_info(
            origin, flags.api_endpoint, plugins
        )
    server_info = server_info_lib.fetch_server_info(origin, plugins)
    # Override with any API server explicitly specified on the command
    # line, but only if the server accepted our initial handshake.
    if flags.api_endpoint and server_info.api_server.endpoint:
        server_info.api_server.endpoint = flags.api_endpoint
    return server_info


def _handle_server_info(info):
    compat = info.compatibility
    if compat.verdict == server_info_pb2.VERDICT_WARN:
        sys.stderr.write("Warning [from server]: %s\n" % compat.details)
        sys.stderr.flush()
    elif compat.verdict == server_info_pb2.VERDICT_ERROR:
        _die("Error [from server]: %s" % compat.details)
    else:
        # OK or unknown; assume OK.
        if compat.details:
            sys.stderr.write("%s\n" % compat.details)
            sys.stderr.flush()


def _die(message):
    sys.stderr.write("%s\n" % (message,))
    sys.stderr.flush()
    sys.exit(1)


class UploaderSubcommand(program.TensorBoardSubcommand):
    """Integration point with `tensorboard` CLI."""

    def name(self):
        return "dev"

    def define_flags(self, parser):
        flags_parser.define_flags(parser)

    def run(self, flags):
        return _run(flags)

    def help(self):
        return "upload data to TensorBoard.dev"
