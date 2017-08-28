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
"""Sample text summaries exhibiting all the text plugin features."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

from six.moves import xrange  # pylint: disable=redefined-builtin
import tensorflow as tf


# Directory into which to write tensorboard data.
LOGDIR = '/tmp/text_demo'

# Number of steps for which to write data.
STEPS = 16


def simple_example(step):
  # Text summaries log arbitrary text. This can be encoded with ASCII or
  # UTF-8. Here's a simple example, wherein we greet the user on each
  # step:
  step_string = tf.as_string(step)
  greeting = tf.string_join(['Hello from step ', step_string, '!'])
  tf.summary.text('greeting', greeting)


def markdown_table(step):
  # The text summary can also contain Markdown, including Markdown
  # tables. Markdown tables look like this:
  #
  #     | hello | there |
  #     |-------|-------|
  #     | this  | is    |
  #     | a     | table |
  #
  # The leading and trailing pipes in each row are optional, and the text
  # doesn't actually have to be neatly aligned, so we can create these
  # pretty easily. Let's do so.
  header_row = 'Pounds of chocolate | Happiness'
  chocolate = tf.range(step)
  happiness = tf.square(chocolate + 1)
  chocolate_column = tf.as_string(chocolate)
  happiness_column = tf.as_string(happiness)
  table_rows = tf.string_join([chocolate_column, " | ", happiness_column])
  table_body = tf.reduce_join(table_rows, separator='\n')
  table = tf.string_join([header_row, "---|---", table_body], separator='\n')
  preamble = 'We conducted an experiment and found the following data:\n\n'
  result = tf.string_join([preamble, table])
  tf.summary.text('chocolate_study', result)


def higher_order_tensors(step):
  # We're not limited to passing scalar tensors to the summary
  # operation. If we pass a rank-1 or rank-2 tensor, it'll be visualized
  # as a table in TensorBoard. (For higher-ranked tensors, you'll see
  # just a 2D slice of the data.)
  #
  # To demonstrate this, let's create a multiplication table.

  # First, we'll create the table body, a `step`-by-`step` array of
  # strings.
  numbers = tf.range(step)
  numbers_row = tf.expand_dims(numbers, 0)  # shape: [1, step]
  numbers_column = tf.expand_dims(numbers, 1)  # shape: [step, 1]
  products = tf.matmul(numbers_column, numbers_row)  # shape: [step, step]
  table_body = tf.as_string(products)

  # Next, we'll create a header row and column, and a little
  # multiplication sign to put in the corner.
  bold_numbers = tf.string_join(['**', tf.as_string(numbers), '**'])
  bold_row = tf.expand_dims(bold_numbers, 0)
  bold_column = tf.expand_dims(bold_numbers, 1)
  corner_cell = tf.constant(u'\u00d7'.encode('utf-8'))  # MULTIPLICATION SIGN

  # Now, we have to put the pieces together. Using `axis=0` stacks
  # vertically; using `axis=1` juxtaposes horizontally.
  table_body_and_top_row = tf.concat([bold_row, table_body], axis=0)
  table_left_column = tf.concat([[[corner_cell]], bold_column], axis=0)
  table_full = tf.concat([table_left_column, table_body_and_top_row], axis=1)

  # The result, `table_full`, is a rank-2 string tensor of shape
  # `[step + 1, step + 1]`. We can pass it directly to the summary, and
  # we'll get a nicely formatted table in TensorBoard.
  tf.summary.text('multiplication_table', table_full)


def run_all(logdir):
  tf.reset_default_graph()
  step_placeholder = tf.placeholder(tf.int32)

  with tf.name_scope('simple_example'):
    simple_example(step_placeholder)
  with tf.name_scope('markdown_table'):
    markdown_table(step_placeholder)
  with tf.name_scope('higher_order_tensors'):
    higher_order_tensors(step_placeholder)
  all_summaries = tf.summary.merge_all()

  with tf.Session() as sess:
    writer = tf.summary.FileWriter(logdir)
    writer.add_graph(sess.graph)
    for step in xrange(STEPS):
      s = sess.run(all_summaries, feed_dict={step_placeholder: step})
      writer.add_summary(s, global_step=step)
    writer.close()


def main(unused_argv):
  tf.logging.set_verbosity(tf.logging.INFO)
  tf.logging.info('Saving output to %s.' % LOGDIR)
  run_all(LOGDIR)
  tf.logging.info('Done. Output saved to %s.' % LOGDIR)


if __name__ == '__main__':
  tf.app.run()
