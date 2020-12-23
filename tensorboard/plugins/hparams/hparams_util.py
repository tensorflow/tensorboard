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
"""A CLI for writing hparams experiment and session summaries into event files.

Usage examples: (See hparams_util.proto and api.proto for the definitions of the
protobufs used below).

(1) Creating experiment:
hparams_util \
     --action=create_experiment \
     --logdir=/my/experiment \
     --hparam_infos=<text-formatted HParamsInfosList protobuf> \
     --metric_infos=<text-formatted MetricInfosList protobuf> \
     --description="My experiment description"

(2) Starting a session:
hparams_util \
     --action=start_session \
     --logdir=/my/experiment/session \
     --hparams=<text-formatted HParams protobuf> \
     --group_name="my session group"

(3) Ending a session:
hparams_util \
     --action=end_session \
     --logdir=/my/experiment/session \
     --status=<A string containing a member of the Status protobuffer enum>
"""


import getpass
import time

from absl import app
from absl import flags
from google.protobuf import struct_pb2
from google.protobuf import text_format
import tensorflow as tf

from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import hparams_util_pb2
from tensorboard.plugins.hparams import summary

FLAGS = flags.FLAGS

flags.DEFINE_string(
    "action",
    "",
    "The action to perform. One of {'create_experiment',"
    " 'start_session', 'end_session'}.",
)
flags.DEFINE_string("logdir", "", "The log directory to write the summary to.")

# --action=create_experiment flags.
flags.DEFINE_string(
    "hparam_infos",
    "",
    "Only used when --action=create_experiment."
    " A text-formatted HParamsInfoList protobuf describing"
    " the hyperparameters used in the experiment.",
)
flags.DEFINE_string(
    "metric_infos",
    "",
    "Only used when --action=create_experiment."
    " A text-formatted MetricInfosList protobuf describing"
    " the metrics used in the experiment.",
)
flags.DEFINE_string(
    "description",
    "",
    "(Optional) only used when --action=create_experiment."
    " The description for the experiment.",
)
flags.DEFINE_string(
    "user",
    getpass.getuser(),
    "(Optional) only used when --action=create_experiment."
    " The name of the user creating the experiment.",
)
flags.DEFINE_float(
    "time_created_secs",
    time.time(),
    "(Optional) only used when --action=create_experiment."
    " The creation time of the experiment in seconds since"
    " epoch.",
)

# --action=start_session flags.
flags.DEFINE_string(
    "hparams",
    "",
    "Only used when --action=start_session."
    " A text-formatted HParams protobuf describing"
    " the hyperparameter values used in the session.",
)
flags.DEFINE_string(
    "model_uri",
    "",
    "(Optional) only used when --action=start_session."
    " A uri describing the location where model checkpoints"
    " are saved.",
)
flags.DEFINE_string(
    "monitor_url",
    "",
    "(Optional) only used when --action=start_session."
    " A url for a webpage showing monitoring information on"
    " the session job.",
)
flags.DEFINE_string(
    "group_name",
    "",
    "(Optional) only used when --action=start_session."
    " The name of the group this session belongs to"
    " (empty group means the session is the only one in its"
    " group).",
)
flags.DEFINE_float(
    "start_time_secs",
    time.time(),
    "(Optional) only used when --action=start_session."
    " The time the session started in seconds since epoch.",
)

# --action=end_session flags.
flags.DEFINE_string(
    "status",
    "",
    "Only used when --action=end_session."
    " A string representation of a member of the Status enum."
    " The status the session ended at.",
)
flags.DEFINE_float(
    "end_time_secs",
    time.time(),
    "(Optional) only used when --action=end_session."
    " The time the session ended in seconds since epoch.",
)


def main(argv):
    del argv  # Unused.
    if FLAGS.action == "create_experiment":
        create_experiment()
    elif FLAGS.action == "start_session":
        start_session()
    elif FLAGS.action == "end_session":
        end_session()
    else:
        raise ValueError("Invalid action requested: '%s'" % FLAGS.action)


def create_experiment():
    hparam_infos = hparams_util_pb2.HParamInfosList()
    text_format.Merge(FLAGS.hparam_infos, hparam_infos)
    metric_infos = hparams_util_pb2.MetricInfosList()
    text_format.Merge(FLAGS.metric_infos, metric_infos)
    write_summary(
        summary.experiment_pb(
            hparam_infos.hparam_infos,
            metric_infos.metric_infos,
            FLAGS.user,
            FLAGS.description,
            FLAGS.time_created_secs,
        )
    )


def start_session():
    hparams = hparams_util_pb2.HParams()
    text_format.Merge(FLAGS.hparams, hparams)
    # Convert hparams.hparams values from google.protobuf.Value to Python native
    # objects.
    hparams = {
        key: value_to_python(value) for (key, value) in hparams.hparams.items()
    }
    write_summary(
        summary.session_start_pb(
            hparams,
            FLAGS.model_uri,
            FLAGS.monitor_url,
            FLAGS.group_name,
            FLAGS.start_time_secs,
        )
    )


def value_to_python(value):
    """Converts a google.protobuf.Value to a native python object."""

    # We use the ListValue Well Known Type Value-to-native Python conversion
    # logic to avoid depending on value's protobuf representation.
    l = struct_pb2.ListValue(values=[value])
    return l[0]


def end_session():
    write_summary(
        summary.session_end_pb(
            api_pb2.Status.Value(FLAGS.status), FLAGS.end_time_secs
        )
    )


def write_summary(summary_pb):
    tf.compat.v1.enable_eager_execution()
    writer = tf.compat.v2.summary.create_file_writer(FLAGS.logdir)
    with writer.as_default():
        if hasattr(tf.compat.v2.summary.experimental, "write_raw_pb"):
            tf.compat.v2.summary.experimental.write_raw_pb(
                summary_pb.SerializeToString(), step=0
            )
        else:
            # TODO(https://github.com/tensorflow/tensorboard/issues/2109): remove the
            #   fallback to import_event().
            event = tf.compat.v1.Event(summary=summary_pb)
            tf.compat.v2.summary.import_event(
                tf.constant(event.SerializeToString(), dtype=tf.string)
            )
        # The following may not be required since the context manager may
        # already flush on __exit__, but it doesn't hurt to do it here, as well.
        tf.compat.v2.summary.flush()


if __name__ == "__main__":
    app.run(main)
