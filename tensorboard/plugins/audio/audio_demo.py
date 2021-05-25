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
"""Sample data exhibiting audio summaries, via a waveform generator."""

import inspect
import math
import os.path

from absl import app
from absl import flags
import tensorflow as tf

FLAGS = flags.FLAGS

flags.DEFINE_string(
    "logdir",
    "/tmp/audio_demo",
    "Directory into which to write TensorBoard data.",
)

flags.DEFINE_integer(
    "steps", 5, "Number of frequencies of each waveform to generate."
)

# Parameters for the audio output.
flags.DEFINE_integer("sample_rate", 44100, "Sample rate, in Hz.")
flags.DEFINE_float("duration", 2.0, "Duration of each waveform, in s.")


def _samples():
    """Compute how many samples should be included in each waveform."""
    return int(FLAGS.sample_rate * FLAGS.duration)


def run(wave_name, wave_constructor, step):
    """Generate an audio waveform and write it to summaries.

    Waves will be generated at frequencies ranging from A4 to A5.

    Args:
      wave_name: the name of the wave being generated
      wave_constructor: a function that accepts a float32 frequency (in Hz) at
        which to construct a wave, and returns a tensor of shape
        [1, _samples(), `n`] representing audio data (for some number of
        channels `n`).
      step: number step
    """
    # For the given step, linearly interpolate a frequency between A4 (440 Hz)
    # and A5 (880 Hz) and create its waveform.
    f_min = 440.0
    f_max = 880.0
    t = step / (FLAGS.steps - 1)
    frequency = f_min * (1.0 - t) + f_max * t
    waveform = wave_constructor(frequency)

    # Optionally generate a description that will appear in TensorBoard
    # next to the audio. This one includes the source code behind the
    # waveform for context.
    source = "\n".join(
        "    %s" % line.rstrip()
        for line in inspect.getsourcelines(wave_constructor)[0]
    )
    description = "A wave of type `%r`, generated via:\n\n%s" % (
        wave_name,
        source,
    )

    # Write the audio waveform summary. The `waveform` is a
    # [num_clips, num_frames, num_channels] shaped tensor.
    tf.summary.audio(
        "waveform",
        waveform,
        FLAGS.sample_rate,
        step=step,
        description=description,
    )


def sine_wave(frequency):
    """Emit a sine wave at the given frequency."""
    xs = tf.reshape(tf.range(_samples(), dtype=tf.float32), [1, _samples(), 1])
    ts = xs / FLAGS.sample_rate
    return tf.sin(2 * math.pi * frequency * ts)


def square_wave(frequency):
    """Emit a square wave at the given frequency."""
    # The square is just the sign of the sine!
    return tf.sign(sine_wave(frequency))


def bisine_wave(frequency):
    """Emit two sine waves, in stereo at different octaves."""
    # Generate 2 sine waves, each of which is a [1, _samples(), 1] shaped tensor.
    sine_hi = sine_wave(frequency)
    sine_lo = sine_wave(frequency / 2.0)

    # Concatenating along axis 2 produces a [1, _samples(), 2] shaped tensor, a
    # stereo (2 channel) audio waveform.
    sample1 = tf.concat([sine_lo, sine_hi], axis=2)
    sample2 = tf.concat([sine_hi, sine_lo], axis=2)

    # Return [2, _samples(), 2], representing 2 audio clips.
    return tf.concat([sample1, sample2], axis=0)


def run_all(base_logdir):
    """Generate waves of the shapes defined above.

    For each wave, creates a run that contains summaries.

    Arguments:
      base_logdir: the directory into which to store all the runs' data
    """
    waves = [
        ("sine_wave", sine_wave),
        ("square_wave", square_wave),
        ("bisine_wave", bisine_wave),
    ]
    for wave_name, wave_constructor in waves:
        logdir = os.path.join(base_logdir, wave_name)
        writer = tf.summary.create_file_writer(logdir)
        with writer.as_default():
            for step in range(FLAGS.steps):
                run(wave_name, wave_constructor, step)


def main(unused_argv):
    print("Saving output to %s." % FLAGS.logdir)
    print(
        "To view results in your browser, run `tensorboard --logdir %s`"
        % FLAGS.logdir
    )
    run_all(FLAGS.logdir)
    print("Done. Output saved to %s." % FLAGS.logdir)


if __name__ == "__main__":
    app.run(main)
