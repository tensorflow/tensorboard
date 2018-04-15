# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""Writes sample summary data for the HParams Explorer plugin.
Each training-session here is a temperature simulation and records temperature
related metric. See the function `run` below for more details.

This demo is a slightly modified version of tensorboard/plugins/scalar/scalar_demo.py.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import md5
import os.path

from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf
from tensorboard.plugins.scalar import summary as scalar_summary
from tensorboard.plugins.hparams_explorer import summary
from tensorboard.plugins.hparams_explorer import metadata_pb2
from google.protobuf import text_format

# Directory into which to write tensorboard data.
LOGDIR = '/tmp/hparams_explorer_demo'

# Our experiment id.
EXP_ID = 'sample_exp'

STEPS = 1000

def fingerprint(str):
  m = md5.new()
  m.update(str)
  return m.hexdigest()


def write_experiment_metadata(logdir, exp_id):
  """Writes the metadata associated with this sample experiment"""
  exp_metadata=metadata_pb2.ExperimentMetadata()
  exp_metadata.name="Demo Experiment"
  exp_metadata.owner="Bart Simpson"
  exp_metadata.description="Initial hyperparams search"
  exp_metadata.config_type.param_defs["initial_temperature"] = (
      metadata_pb2.FLOAT64)
  exp_metadata.config_type.param_defs["ambient_temperature"] = (
      metadata_pb2.FLOAT64)
  exp_metadata.config_type.param_defs["heat_coefficient"] = (
      metadata_pb2.FLOAT64)
  writer = tf.summary.FileWriter(os.path.join(logdir, exp_id))
  writer.add_summary(summary.experiment_metadata_summary_pb(exp_metadata))
  writer.close()

def write_session_metadata(session_dir, config, group_id):
  """Writes the metadata associated with a session"""
  session_metadata=metadata_pb2.SessionMetadata()
  session_metadata.config.CopyFrom(config)
  session_metadata.group_id = group_id
  writer = tf.summary.FileWriter(session_dir)
  writer.add_summary(summary.session_metadata_summary_pb(session_metadata))
  writer.close()

def get_hparam_from_config(config, hparam):
  assert hparam in config.param_values, (
      "Can't find hparam %s in config: %s" %
      (hparam, text_format.MessageToString(config)))
  param_value = config.param_values[hparam]
  oneof_field_name = param_value.WhichOneof("value")
  assert oneof_field_name is not None
  return getattr(param_value, oneof_field_name)


def build_config(initial_temperature, ambient_temperature, heat_coefficient):
  config = metadata_pb2.Config()
  config.param_values["initial_temperature"].float64_val = initial_temperature
  config.param_values["ambient_temperature"].float64_val = ambient_temperature
  config.param_values["heat_coefficient"].float64_val = heat_coefficient
  return config


def run(logdir, exp_id, session_id, config, group_id):
  """Run a temperature simulation.

  This will simulate an object at temperature `initial_temperature`
  sitting at rest in a large room at temperature `ambient_temperature`.
  The object has some intrinsic `heat_coefficient`, which indicates
  how much thermal conductivity it has: for instance, metals have high
  thermal conductivity, while the thermal conductivity of water is low.

  Over time, the object's temperature will adjust to match the
  temperature of its environment. We'll track the object's temperature,
  how far it is from the room's temperature, and how much it changes at
  each time step.

  Arguments:
    logdir: the top-level directory into which to write summary data
    exp_id: the experiment id of the experiment this session belongs to.
    session_id: an id for the session.
    config: a tensorboard.hparams_explorer.Config object containing the
      hyperparameters for this session.
    group_id: an id for the session group this session belongs to.
  """
  tf.reset_default_graph()
  tf.set_random_seed(0)

  initial_temperature = get_hparam_from_config(config, "initial_temperature")
  ambient_temperature = get_hparam_from_config(config, "ambient_temperature")
  heat_coefficient = get_hparam_from_config(config, "heat_coefficient")
  session_dir = os.path.join(logdir, exp_id, session_id)
  write_session_metadata(session_dir, config, group_id)
  with tf.name_scope('temperature'):
    # Create a mutable variable to hold the object's temperature, and
    # create a scalar summary to track its value over time. The name of
    # the summary will appear as "temperature/current" due to the
    # name-scope above.
    temperature = tf.Variable(tf.constant(initial_temperature),
                              name='temperature')
    scalar_summary.op('current', temperature,
                      display_name='Temperature',
                      description='The temperature of the object under '
                                  'simulation, in Kelvins.')

    # Compute how much the object's temperature differs from that of its
    # environment, and track this, too: likewise, as
    # "temperature/difference_to_ambient".
    ambient_difference = temperature - ambient_temperature
    scalar_summary.op('difference_to_ambient', ambient_difference,
                      display_name='Difference to ambient temperature',
                      description='The difference between the ambient '
                           'temperature and the temperature of the '
                           'object under simulation, in Kelvins.')

  # Newton suggested that the rate of change of the temperature of an
  # object is directly proportional to this `ambient_difference` above,
  # where the proportionality constant is what we called the heat
  # coefficient. But in real life, not everything is quite so clean, so
  # we'll add in some noise. (The value of 50 is arbitrary, chosen to
  # make the data look somewhat interesting. :-) )
  noise = 50 * tf.random_normal([])
  delta = -heat_coefficient * (ambient_difference + noise)
  scalar_summary.op('delta', delta,
                    description='The change in temperature from the previous '
                                'step, in Kelvins.')

  # Collect all the scalars that we want to keep track of.
  summ = tf.summary.merge_all()

  # Now, augment the current temperature by this delta that we computed,
  # blocking the assignment on summary collection to avoid race conditions
  # and ensure that the summary always reports the pre-update value.
  with tf.control_dependencies([summ]):
    update_step = temperature.assign_add(delta)

  sess = tf.Session()
  task_dir = os.path.join(session_dir, "sample_task")
  writer = tf.summary.FileWriter(task_dir)
  sess.run(tf.global_variables_initializer())
  for step in xrange(STEPS):
    # By asking TensorFlow to compute the update step, we force it to
    # change the value of the temperature variable. We don't actually
    # care about this value, so we discard it; instead, we grab the
    # summary data computed along the way.
    (s, _) = sess.run([summ, update_step])
    writer.add_summary(s, global_step=step)
  writer.close()


def run_all(logdir, verbose=False):
  """Run simulations on a reasonable set of parameters.

  Arguments:
    logdir: the directory into which to store all the runs' data
    verbose: if true, print out each run's name as it begins
  """
  write_experiment_metadata(logdir, EXP_ID)
  session_num = 0
  for initial_temperature in [270.0, 310.0, 350.0]:
    for ambient_temperature in [270.0, 310.0, 350.0]:
      for heat_coefficient in [0.001, 0.005]:
        for repeat_idx in xrange(2):
          config = build_config(initial_temperature,
                                ambient_temperature,
                                heat_coefficient)
          config_str = text_format.MessageToString(config)
          group_id = fingerprint(config_str)
          session_id = str(session_num)
          if verbose:
            print('--- Running training session for config')
            print(config_str)
            print('--- repeat #: %d' % (repeat_idx+1))
          run(logdir, EXP_ID, session_id, config, group_id)
          session_num += 1


def main(unused_argv):
  print('Saving output to %s.' % LOGDIR)
  run_all(LOGDIR, verbose=True)
  print('Done. Output saved to %s.' % LOGDIR)


if __name__ == '__main__':
  tf.app.run()
