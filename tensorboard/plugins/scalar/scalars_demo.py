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
"""Sample data exhibiting scalar summaries, via a temperature simulation."""


import os.path

from absl import app
import tensorflow as tf

# Directory into which to write tensorboard data.
LOGDIR = "/tmp/scalars_demo"

# Duration of the simulation.
STEPS = 1000


@tf.function
def one_step(writer, temp, ambient_temperature, heat_coefficient, step):
    """Runs one step of the temperature simulation.

    Will update the `temperature` argument with one step of heat diffusion.

    Arguments:
      writer: The tf.summary.SummaryWriter object.
      temp: The tf.Variable containing the value being updated.  Akin
        to a weight in a model.
      ambient_temperature: The `tf.Constant` value the temperature is being
        drawn towards.
      heat_coefficient: tf.Constant describing rate of diffusion.
      step: tf.int64 value of the current step number.  Used in the
        `summary.scalar` API.
    """
    with writer.as_default():
        with tf.name_scope("temperature"):
            tf.summary.scalar(
                name="current",
                data=temp,
                step=step,
                description="The temperature of the object, in Kelvins.",
            )
            # Compute how much the object's temperature differs from that of
            #  its environment, and track this, too: likewise, as
            # "temperature/difference_to_ambient".
            ambient_difference = temp - ambient_temperature
            tf.summary.scalar(
                name="difference_to_ambient",
                data=ambient_difference,
                step=step,
                description="The difference between the ambient "
                "temperature and the temperature of the "
                "object under simulation, in Kelvins.",
            )
        # Newton suggested that the rate of change of the temperature of
        # an object is directly proportional to this
        # `ambient_difference` above, where the proportionality constant
        # is what we called the heat coefficient. But in real life, not
        # everything is quite so clean, so we'll add in some noise. (The
        # value of 50 is arbitrary, chosen to
        # make the data look somewhat interesting. :-) )
        noise = 50 * tf.random.normal([])
        delta = -heat_coefficient * (ambient_difference + noise)
        tf.summary.scalar(
            name="delta",
            data=delta,
            step=step,
            description="The change in temperature from the previous "
            "step, in Kelvins.",
        )
        temp.assign_add(delta)


def run(writer, initial_temperature, ambient_temperature, heat_coefficient):
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
      writer: tf.summary.SummaryWriter; summary writer object
      initial_temperature: float; the object's initial temperature
      ambient_temperature: float; the temperature of the enclosing room
      heat_coefficient: float; a measure of the object's thermal
        conductivity
    """
    tf.random.set_seed(0)
    temp = tf.Variable(initial_temperature)
    for step in tf.range(STEPS, dtype=tf.int64):
        one_step(writer, temp, ambient_temperature, heat_coefficient, step)


def run_all(logdir, verbose=False):
    """Run simulations on a reasonable set of parameters.

    Arguments:
      logdir: the directory into which to store all the runs' data
      verbose: if true, print out each run's name as it begins
    """
    for initial_temperature in [270.0, 310.0, 350.0]:
        for ambient_temperature in [270.0, 310.0, 350.0]:
            for heat_coefficient in [0.001, 0.005]:
                run_name = "t0=%g,tA=%g,kH=%g" % (
                    initial_temperature,
                    ambient_temperature,
                    heat_coefficient,
                )
                if verbose:
                    print("--- Running: %s" % run_name)
                writer = tf.summary.create_file_writer(
                    os.path.join(logdir, run_name)
                )
                # Arguments wrapped in tf.constant to prevent unwanted
                # retracing.  See retracing logic details at
                # https://www.tensorflow.org/guide/function
                run(
                    writer,
                    tf.constant(initial_temperature),
                    tf.constant(ambient_temperature),
                    tf.constant(heat_coefficient),
                )


def main(unused_argv):
    print("Saving output to %s." % LOGDIR)
    run_all(LOGDIR, verbose=True)
    print(
        """
You can now view the scalars in this logdir:

Run TensorBoard locally:

    tensorboard --logdir=%s

Upload to TensorBoard.dev:

    tensorboard dev upload \\
      --logdir=%s \\
      --name=\"Scalars demo.\" \\
      --one_shot
"""
        % (LOGDIR, LOGDIR)
    )
    print("Done. Output saved to %s." % LOGDIR)


if __name__ == "__main__":
    app.run(main)
