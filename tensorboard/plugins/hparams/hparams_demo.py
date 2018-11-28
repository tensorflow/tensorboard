# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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
"""Write sample summary data for the hparams plugin.
Each training-session here is a temperature simulation and records temperature
related metric. See the function `run` below for more details.

This demo is a slightly modified version of
tensorboard/plugins/scalar/scalar_demo.py.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import os.path
import hashlib
import shutil

from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf
from google.protobuf import struct_pb2

from tensorboard.plugins.hparams import api_pb2
from tensorboard.plugins.hparams import summary
from tensorboard.plugins.scalar import summary as scalar_summary

# Directory into which to write tensorboard data.
LOGDIR = '/tmp/hparams_demo'

STEPS = 1000

TEMPERATURE_LIST = [270.0, 310.0, 350.0]
HEAT_COEFFICIENT_LIST = [0.001, 0.005]

def fingerprint(string):
  m = hashlib.md5()
  m.update(string)
  return m.hexdigest()

def create_experiment_summary():
  """Returns a summary proto buffer holding this experiment"""
  # Convert TEMPERATURE_LIST to google.protobuf.ListValue
  temperature_list = struct_pb2.ListValue()
  temperature_list.extend(TEMPERATURE_LIST)
  return summary.experiment_pb(
      hparam_infos=[
          api_pb2.HParamInfo(name="initial_temperature",
                             display_name="initial temperature",
                             type=api_pb2.DATA_TYPE_FLOAT64,
                             domain_discrete=temperature_list),
          api_pb2.HParamInfo(name="ambient_temperature",
                             display_name="ambient temperature",
                             type=api_pb2.DATA_TYPE_FLOAT64,
                             domain_discrete=temperature_list),
          api_pb2.HParamInfo(name="heat_coefficient",
                             display_name="heat coefficient",
                             type=api_pb2.DATA_TYPE_FLOAT64,
                             domain_discrete=temperature_list)
      ],
      metric_infos=[
          api_pb2.MetricInfo(
              name=api_pb2.MetricName(
                  tag="temperature/current/scalar_summary"),
              display_name="Current Temp."),
          api_pb2.MetricInfo(
              name=api_pb2.MetricName(
                  tag="temperature/difference_to_ambient/scalar_summary"),
              display_name="Difference To Ambient Temp."),
          api_pb2.MetricInfo(
              name=api_pb2.MetricName(
                  tag="delta/scalar_summary"),
              display_name="Delta T")
      ]
  )


def create_hparam_info(name, display_name, domain_discrete):
  result = api_pb2.HParamInfo(name=name, display_name=display_name)
  result.domain_discrete.extend(domain_discrete)
  return result


def run(logdir, session_id, hparams, group_name):
  """Runs a temperature simulation.

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
    session_id: an id for the session.
    hparams: A dictionary mapping an hyperparameter name to its value.
    group_name: an id for the session group this session belongs to.
  """
  tf.reset_default_graph()
  tf.set_random_seed(0)

  initial_temperature = hparams['initial_temperature']
  ambient_temperature = hparams['ambient_temperature']
  heat_coefficient = hparams['heat_coefficient']
  session_dir = os.path.join(logdir, session_id)
  writer = tf.summary.FileWriter(session_dir)
  writer.add_summary(summary.session_start_pb(hparams=hparams,
                                              group_name=group_name))
  writer.flush()
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
                      description=('The difference between the ambient '
                                   'temperature and the temperature of the '
                                   'object under simulation, in Kelvins.'))

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
  sess.run(tf.global_variables_initializer())
  for step in xrange(STEPS):
    # By asking TensorFlow to compute the update step, we force it to
    # change the value of the temperature variable. We don't actually
    # care about this value, so we discard it; instead, we grab the
    # summary data computed along the way.
    (s, _) = sess.run([summ, update_step])
    writer.add_summary(s, global_step=step)
  writer.add_summary(summary.session_end_pb(api_pb2.STATUS_SUCCESS))
  writer.close()


def run_all(logdir, verbose=False):
  """Run simulations on a reasonable set of parameters.

  Arguments:
    logdir: the directory into which to store all the runs' data
    verbose: if true, print out each run's name as it begins.
  """
  writer = tf.summary.FileWriter(logdir)
  writer.add_summary(create_experiment_summary())
  writer.close()
  session_num = 0
  for initial_temperature in TEMPERATURE_LIST:
    for ambient_temperature in TEMPERATURE_LIST:
      for heat_coefficient in HEAT_COEFFICIENT_LIST:
        hparams = {'initial_temperature' : initial_temperature,
                   'ambient_temperature' : ambient_temperature,
                   'heat_coefficient' : heat_coefficient}
        hparam_str = str(hparams)
        group_name = fingerprint(hparam_str)
        for repeat_idx in xrange(2):
          session_id = str(session_num)
          if verbose:
            print('--- Running training session')
            print(hparam_str)
            print('--- repeat #: %d' % (repeat_idx+1))
          run(logdir, session_id, hparams, group_name)
          session_num += 1


def main(unused_argv):
  shutil.rmtree(LOGDIR, ignore_errors=True)
  print('Saving output to %s.' % LOGDIR)
  run_all(LOGDIR, verbose=True)
  print('Done. Output saved to %s.' % LOGDIR)


if __name__ == '__main__':
  tf.app.run()
