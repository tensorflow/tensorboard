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
"""Main program for the TensorBoard.dev uploader."""

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
from absl.flags import argparse_flags
import grpc
import six

from tensorboard.uploader import dev_creds
from tensorboard.uploader.proto import export_service_pb2
from tensorboard.uploader.proto import export_service_pb2_grpc
from tensorboard.uploader.proto import write_service_pb2_grpc
from tensorboard.uploader import auth
from tensorboard.uploader import exporter as exporter_lib
from tensorboard.uploader import server_info as server_info_lib
from tensorboard.uploader import uploader as uploader_lib
from tensorboard.uploader import util
from tensorboard.uploader.proto import server_info_pb2
from tensorboard import program
from tensorboard.plugins import base_plugin


# Temporary integration point for absl compatibility; will go away once
# migrated to TensorBoard subcommand.
_FLAGS = None


_MESSAGE_TOS = u"""\
Your use of this service is subject to Google's Terms of Service
<https://policies.google.com/terms> and Privacy Policy
<https://policies.google.com/privacy>, and TensorBoard.dev's Terms of Service
<https://tensorboard.dev/policy/terms/>.

This notice will not be shown again while you are logged into the uploader.
To log out, run `tensorboard dev auth revoke`.
"""


_SUBCOMMAND_FLAG = '_uploader__subcommand'
_SUBCOMMAND_KEY_UPLOAD = 'UPLOAD'
_SUBCOMMAND_KEY_DELETE = 'DELETE'
_SUBCOMMAND_KEY_LIST = 'LIST'
_SUBCOMMAND_KEY_EXPORT = 'EXPORT'
_SUBCOMMAND_KEY_AUTH = 'AUTH'
_AUTH_SUBCOMMAND_FLAG = '_uploader__subcommand_auth'
_AUTH_SUBCOMMAND_KEY_REVOKE = 'REVOKE'

_DEFAULT_ORIGIN = "https://tensorboard.dev"


def _prompt_for_user_ack(intent):
  """Prompts for user consent, exiting the program if they decline."""
  body = intent.get_ack_message_body()
  header = '\n***** TensorBoard Uploader *****\n'
  user_ack_message = '\n'.join((header, body, _MESSAGE_TOS))
  sys.stderr.write(user_ack_message)
  sys.stderr.write('\n')
  response = six.moves.input('Continue? (yes/NO) ')
  if response.lower() not in ('y', 'yes'):
    sys.exit(0)
  sys.stderr.write('\n')


def _define_flags(parser):
  """Configures flags on the provided argument parser.

  Integration point for `tensorboard.program`'s subcommand system.

  Args:
    parser: An `argparse.ArgumentParser` to be mutated.
  """

  subparsers = parser.add_subparsers()

  parser.add_argument(
      '--origin',
      type=str,
      default='',
      help='Experimental. Origin for TensorBoard.dev service to which '
      'to connect. If not set, defaults to %r.' % _DEFAULT_ORIGIN)

  parser.add_argument(
      '--api_endpoint',
      type=str,
      default='',
      help='Experimental. Direct URL for the API server accepting '
      'write requests. If set, will skip initial server handshake '
      'unless `--origin` is also set.')

  parser.add_argument(
      '--grpc_creds_type',
      type=str,
      default='ssl',
      choices=('local', 'ssl', 'ssl_dev'),
      help='The type of credentials to use for the gRPC client')

  parser.add_argument(
      '--auth_force_console',
      action='store_true',
      help='Set to true to force authentication flow to use the '
      '--console rather than a browser redirect to localhost.')

  upload = subparsers.add_parser(
      'upload', help='upload an experiment to TensorBoard.dev')
  upload.set_defaults(**{_SUBCOMMAND_FLAG: _SUBCOMMAND_KEY_UPLOAD})
  upload.add_argument(
      '--logdir',
      metavar='PATH',
      type=str,
      default=None,
      help='Directory containing the logs to process')

  delete = subparsers.add_parser(
      'delete',
      help='permanently delete an experiment',
      inherited_absl_flags=None)
  delete.set_defaults(**{_SUBCOMMAND_FLAG: _SUBCOMMAND_KEY_DELETE})
  # We would really like to call this next flag `--experiment` rather
  # than `--experiment_id`, but this is broken inside Google due to a
  # long-standing Python bug: <https://bugs.python.org/issue14365>
  # (Some Google-internal dependencies define `--experimental_*` flags.)
  # This isn't exactly a principled fix, but it gets the job done.
  delete.add_argument(
      '--experiment_id',
      metavar='EXPERIMENT_ID',
      type=str,
      default=None,
      help='ID of an experiment to delete permanently')

  list_parser = subparsers.add_parser(
      'list', help='list previously uploaded experiments')
  list_parser.set_defaults(**{_SUBCOMMAND_FLAG: _SUBCOMMAND_KEY_LIST})

  export = subparsers.add_parser(
      'export', help='download all your experiment data')
  export.set_defaults(**{_SUBCOMMAND_FLAG: _SUBCOMMAND_KEY_EXPORT})
  export.add_argument(
      '--outdir',
      metavar='OUTPUT_PATH',
      type=str,
      default=None,
      help='Directory into which to download all experiment data; '
      'must not yet exist')

  auth_parser = subparsers.add_parser('auth', help='log in, log out')
  auth_parser.set_defaults(**{_SUBCOMMAND_FLAG: _SUBCOMMAND_KEY_AUTH})
  auth_subparsers = auth_parser.add_subparsers()

  auth_revoke = auth_subparsers.add_parser(
      'revoke', help='revoke all existing credentials and log out')
  auth_revoke.set_defaults(
      **{_AUTH_SUBCOMMAND_FLAG: _AUTH_SUBCOMMAND_KEY_REVOKE})


def _parse_flags(argv=('',)):
  """Integration point for `absl.app`.

  Exits if flag values are invalid.

  Args:
    argv: CLI arguments, as with `sys.argv`, where the first argument is taken
      to be the name of the program being executed.

  Returns:
    Either argv[:1] if argv was non-empty, or [''] otherwise, as a mechanism
    for absl.app.run() compatibility.
  """
  parser = argparse_flags.ArgumentParser(
      prog='uploader',
      description=('Upload your TensorBoard experiments to TensorBoard.dev'))
  _define_flags(parser)
  arg0 = argv[0] if argv else ''
  global _FLAGS
  _FLAGS = parser.parse_args(argv[1:])
  return [arg0]


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
    sys.stderr.write('Logged out of uploader.\n')
    sys.stderr.flush()
    return
  # TODO(b/141723268): maybe reconfirm Google Account prior to reuse.
  credentials = store.read_credentials()
  if not credentials:
    _prompt_for_user_ack(intent)
    client_config = json.loads(auth.OAUTH_CLIENT_CONFIG)
    flow = auth.build_installed_app_flow(client_config)
    credentials = flow.run(force_console=flags.auth_force_console)
    sys.stderr.write('\n')  # Extra newline after auth flow messages.
    store.write_credentials(credentials)

  channel_options = None
  if flags.grpc_creds_type == 'local':
    channel_creds = grpc.local_channel_credentials()
  elif flags.grpc_creds_type == 'ssl':
    channel_creds = grpc.ssl_channel_credentials()
  elif flags.grpc_creds_type == 'ssl_dev':
    channel_creds = grpc.ssl_channel_credentials(dev_creds.DEV_SSL_CERT)
    channel_options = [('grpc.ssl_target_name_override', 'localhost')]
  else:
    msg = 'Invalid --grpc_creds_type %s' % flags.grpc_creds_type
    raise base_plugin.FlagsError(msg)

  try:
    server_info = _get_server_info(flags)
  except server_info_lib.CommunicationError as e:
    _die(str(e))
  _handle_server_info(server_info)

  if not server_info.api_server.endpoint:
    logging.error('Server info response: %s', server_info)
    _die('Internal error: frontend did not specify an API server')
  composite_channel_creds = grpc.composite_channel_credentials(
      channel_creds, auth.id_token_call_credentials(credentials))

  # TODO(@nfelt): In the `_UploadIntent` case, consider waiting until
  # logdir exists to open channel.
  channel = grpc.secure_channel(
      server_info.api_server.endpoint,
      composite_channel_creds,
      options=channel_options)
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
    raise AssertionError('No user ack needed to revoke credentials')

  def execute(self, server_info, channel):
    """Execute handled specially by `main`. Must not be called."""
    raise AssertionError('_AuthRevokeIntent should not be directly executed')


class _DeleteExperimentIntent(_Intent):
  """The user intends to delete an experiment."""

  _MESSAGE_TEMPLATE = textwrap.dedent(u"""\
      This will delete the experiment on https://tensorboard.dev with the
      following experiment ID:

      {experiment_id}

      You have chosen to delete an experiment. All experiments uploaded
      to TensorBoard.dev are publicly visible. Do not upload sensitive
      data.
  """)

  def __init__(self, experiment_id):
    self.experiment_id = experiment_id

  def get_ack_message_body(self):
    return self._MESSAGE_TEMPLATE.format(experiment_id=self.experiment_id)

  def execute(self, server_info, channel):
    api_client = write_service_pb2_grpc.TensorBoardWriterServiceStub(channel)
    experiment_id = self.experiment_id
    if not experiment_id:
      raise base_plugin.FlagsError(
          'Must specify a non-empty experiment ID to delete.')
    try:
      uploader_lib.delete_experiment(api_client, experiment_id)
    except uploader_lib.ExperimentNotFoundError:
      _die(
          'No such experiment %s. Either it never existed or it has '
          'already been deleted.' % experiment_id)
    except uploader_lib.PermissionDeniedError:
      _die(
          'Cannot delete experiment %s because it is owned by a '
          'different user.' % experiment_id)
    except grpc.RpcError as e:
      _die('Internal error deleting experiment: %s' % e)
    print('Deleted experiment %s.' % experiment_id)


class _ListIntent(_Intent):
  """The user intends to list all their experiments."""

  _MESSAGE = textwrap.dedent(u"""\
      This will list all experiments that you've uploaded to
      https://tensorboard.dev. TensorBoard.dev experiments are visible
      to everyone. Do not upload sensitive data.
  """)

  def get_ack_message_body(self):
    return self._MESSAGE

  def execute(self, server_info, channel):
    api_client = export_service_pb2_grpc.TensorBoardExporterServiceStub(channel)
    fieldmask = export_service_pb2.ExperimentMask(
        create_time=True,
        update_time=True,
        num_scalars=True,
        num_runs=True,
        num_tags=True,
    )
    gen = exporter_lib.list_experiments(api_client, fieldmask=fieldmask)
    count = 0
    for experiment in gen:
      count += 1
      if not isinstance(experiment, export_service_pb2.Experiment):
        url = server_info_lib.experiment_url(server_info, experiment)
        print(url)
        continue
      experiment_id = experiment.experiment_id
      url = server_info_lib.experiment_url(server_info, experiment_id)
      print(url)
      data = [
          ('Id', experiment.experiment_id),
          ('Created', util.format_time(experiment.create_time)),
          ('Updated', util.format_time(experiment.update_time)),
          ('Scalars', str(experiment.num_scalars)),
          ('Runs', str(experiment.num_runs)),
          ('Tags', str(experiment.num_tags)),
      ]
      for (name, value) in data:
        print('\t%s %s' % (name.ljust(10), value))
    sys.stdout.flush()
    if not count:
      sys.stderr.write(
          'No experiments. Use `tensorboard dev upload` to get started.\n')
    else:
      sys.stderr.write('Total: %d experiment(s)\n' % count)
    sys.stderr.flush()


class _UploadIntent(_Intent):
  """The user intends to upload an experiment from the given logdir."""

  _MESSAGE_TEMPLATE = textwrap.dedent(u"""\
      This will upload your TensorBoard logs to https://tensorboard.dev/ from
      the following directory:

      {logdir}

      This TensorBoard will be visible to everyone. Do not upload sensitive
      data.
  """)

  def __init__(self, logdir):
    self.logdir = logdir

  def get_ack_message_body(self):
    return self._MESSAGE_TEMPLATE.format(logdir=self.logdir)

  def execute(self, server_info, channel):
    api_client = write_service_pb2_grpc.TensorBoardWriterServiceStub(channel)
    uploader = uploader_lib.TensorBoardUploader(api_client, self.logdir)
    experiment_id = uploader.create_experiment()
    url = server_info_lib.experiment_url(server_info, experiment_id)
    print("Upload started and will continue reading any new data as it's added")
    print("to the logdir. To stop uploading, press Ctrl-C.")
    print("View your TensorBoard live at: %s" % url)
    try:
      uploader.start_uploading()
    except uploader_lib.ExperimentNotFoundError:
      print('Experiment was deleted; uploading has been cancelled')
      return
    except KeyboardInterrupt:
      print()
      print('Upload stopped. View your TensorBoard at %s' % url)
      return
    # TODO(@nfelt): make it possible for the upload cycle to end once we
    #   detect that no more runs are active, so this code can be reached.
    print('Done! View your TensorBoard at %s' % url)


class _ExportIntent(_Intent):
  """The user intends to download all their experiment data."""

  _MESSAGE_TEMPLATE = textwrap.dedent(u"""\
      This will download all your experiment data from https://tensorboard.dev
      and save it to the following directory:

      {output_dir}

      Downloading your experiment data does not delete it from the
      service. All experiments uploaded to TensorBoard.dev are publicly
      visible. Do not upload sensitive data.
  """)

  def __init__(self, output_dir):
    self.output_dir = output_dir

  def get_ack_message_body(self):
    return self._MESSAGE_TEMPLATE.format(output_dir=self.output_dir)

  def execute(self, server_info, channel):
    api_client = export_service_pb2_grpc.TensorBoardExporterServiceStub(channel)
    outdir = self.output_dir
    try:
      exporter = exporter_lib.TensorBoardExporter(api_client, outdir)
    except exporter_lib.OutputDirectoryExistsError:
      msg = 'Output directory already exists: %r' % outdir
      raise base_plugin.FlagsError(msg)
    num_experiments = 0
    try:
      for experiment_id in exporter.export():
        num_experiments += 1
        print('Downloaded experiment %s' % experiment_id)
    except exporter_lib.GrpcTimeoutException as e:
      print(
        '\nUploader has failed because of a timeout error.  Please reach '
        'out via e-mail to tensorboard.dev-support@google.com to get help '
        'completing your export of experiment %s.' % e.experiment_id)
    print('Done. Downloaded %d experiments to: %s' % (num_experiments, outdir))


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
  cmd = getattr(flags, _SUBCOMMAND_FLAG, None)
  if cmd is None:
    raise base_plugin.FlagsError('Must specify subcommand (try --help).')
  if cmd == _SUBCOMMAND_KEY_UPLOAD:
    if flags.logdir:
      return _UploadIntent(os.path.expanduser(flags.logdir))
    else:
      raise base_plugin.FlagsError(
          'Must specify directory to upload via `--logdir`.')
  elif cmd == _SUBCOMMAND_KEY_DELETE:
    if flags.experiment_id:
      return _DeleteExperimentIntent(flags.experiment_id)
    else:
      raise base_plugin.FlagsError(
          'Must specify experiment to delete via `--experiment_id`.')
  elif cmd == _SUBCOMMAND_KEY_LIST:
    return _ListIntent()
  elif cmd == _SUBCOMMAND_KEY_EXPORT:
    if flags.outdir:
      return _ExportIntent(flags.outdir)
    else:
      raise base_plugin.FlagsError(
          'Must specify output directory via `--outdir`.')
  elif cmd == _SUBCOMMAND_KEY_AUTH:
    auth_cmd = getattr(flags, _AUTH_SUBCOMMAND_FLAG, None)
    if auth_cmd is None:
      raise base_plugin.FlagsError('Must specify a subcommand to `auth`.')
    if auth_cmd == _AUTH_SUBCOMMAND_KEY_REVOKE:
      return _AuthRevokeIntent()
    else:
      raise AssertionError('Unknown auth subcommand %r' % (auth_cmd,))
  else:
    raise AssertionError('Unknown subcommand %r' % (cmd,))


def _get_server_info(flags):
  origin = flags.origin or _DEFAULT_ORIGIN
  if flags.api_endpoint and not flags.origin:
    return server_info_lib.create_server_info(origin, flags.api_endpoint)
  server_info = server_info_lib.fetch_server_info(origin)
  # Override with any API server explicitly specified on the command
  # line, but only if the server accepted our initial handshake.
  if flags.api_endpoint and server_info.api_server.endpoint:
    server_info.api_server.endpoint = flags.api_endpoint
  return server_info


def _handle_server_info(info):
  compat = info.compatibility
  if compat.verdict == server_info_pb2.VERDICT_WARN:
    sys.stderr.write('Warning [from server]: %s\n' % compat.details)
    sys.stderr.flush()
  elif compat.verdict == server_info_pb2.VERDICT_ERROR:
    _die('Error [from server]: %s' % compat.details)
  else:
    # OK or unknown; assume OK.
    if compat.details:
      sys.stderr.write('%s\n' % compat.details)
      sys.stderr.flush()


def _die(message):
  sys.stderr.write('%s\n' % (message,))
  sys.stderr.flush()
  sys.exit(1)


def main(unused_argv):
  global _FLAGS
  flags = _FLAGS
  # Prevent accidental use of `_FLAGS` until migration to TensorBoard
  # subcommand is complete, at which point `_FLAGS` goes away.
  del _FLAGS
  return _run(flags)


class UploaderSubcommand(program.TensorBoardSubcommand):
  """Integration point with `tensorboard` CLI."""

  def name(self):
    return 'dev'

  def define_flags(self, parser):
    _define_flags(parser)

  def run(self, flags):
    return _run(flags)

  def help(self):
    return 'upload data to TensorBoard.dev'


if __name__ == '__main__':
  app.run(main, flags_parser=_parse_flags)
