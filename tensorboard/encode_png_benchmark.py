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

"""Benchmarks for the `tensorboard.util.encode_png` function.

Here are the results of running this benchmark on a workstation running
Ubuntu 14.04 with an Intel(R) Xeon(R) CPU E5-1650 v4 @ 3.60GHz:

    THREADS  TOTAL_TIME  UNIT_TIME  SPEEDUP  PARALLELISM
          1      2.6311     2.6311   1.0000       1.0000
          2      2.6070     1.3035   2.0185       1.0092
          4      2.7108     0.6777   3.8824       0.9706
          6      2.6347     0.4391   5.9917       0.9986
          8      3.3163     0.4145   6.3471       0.7934
         10      3.5899     0.3590   7.3290       0.7329
         12      3.7949     0.3162   8.3198       0.6933
         14      6.1140     0.4367   6.0248       0.4303
         16      6.2662     0.3916   6.7182       0.4199
         32     10.5142     0.3286   8.0077       0.2502

The total time for one thread is the "base time." Speedup is computed by
dividing the unit time by the base time. Effective parallelism is computed
by dividing the speedup by the number of threads used.

Note that the CPU used has six physical cores and twelve virtual cores;
correspondingly, the effective parallelism is excellent with up to six
threads, drops somewhat after six threads, and drops significantly after
twelve threads.

The above numbers are consistent across runs, within about 5%.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import datetime
import threading
import time

from six.moves import xrange

import numpy as np
import tensorflow as tf

from tensorboard import util


def bench(image, thread_count):
  """Encode `image` to PNG on `thread_count` threads in parallel.

  Returns:
    A `float` representing number of seconds that it takes all threads
    to finish encoding `image`.
  """
  threads = [threading.Thread(target=lambda: util.encode_png(image))
             for _ in xrange(thread_count)]
  start_time = datetime.datetime.now()
  for thread in threads:
    thread.start()
  for thread in threads:
    thread.join()
  end_time = datetime.datetime.now()
  delta = (end_time - start_time).total_seconds()
  return delta


def _image_of_size(image_size):
  """Generate a square RGB test image of the given side length."""
  return np.random.uniform(0, 256, [image_size, image_size, 3]).astype(np.uint8)


def _format_line(headers, fields):
  """Format a line of a table.

  Arguments:
    headers: A list of strings that are used as the table headers.
    fields: A list of the same length as `headers` where `fields[i]` is
      the entry for `headers[i]` in this row. Elements can be of
      arbitrary types. Pass `headers` to print the header row.

  Returns:
    A pretty string.
  """
  assert len(fields) == len(headers), (fields, headers)
  fields = ["%2.4f" % field if isinstance(field, float) else str(field)
            for field in fields]
  return '  '.join(' ' * max(0, len(header) - len(field)) + field
                   for (header, field) in zip(headers, fields))


def main(unused_argv):
  tf.logging.set_verbosity(tf.logging.INFO)
  np.random.seed(0)

  thread_counts = [1, 2, 4, 6, 8, 10, 12, 14, 16, 32]

  tf.logging.info("Warming up...")
  warmup_image = _image_of_size(256)
  for thread_count in thread_counts:
    bench(warmup_image, thread_count)

  tf.logging.info("Running...")
  results = {}
  image = _image_of_size(4096)
  headers = ('THREADS', 'TOTAL_TIME', 'UNIT_TIME', 'SPEEDUP', 'PARALLELISM')
  tf.logging.info(_format_line(headers, headers))
  for thread_count in thread_counts:
    time.sleep(1.0)
    total_time = min(bench(image, thread_count)
                     for _ in xrange(3))  # best-of-three timing
    unit_time = total_time / thread_count
    if total_time < 2.0:
      tf.logging.warning("This benchmark is running too quickly! This "
                         "may cause misleading timing data. Consider "
                         "increasing the image size until it takes at "
                         "least 2.0s to encode one image.")
    results[thread_count] = unit_time
    speedup = results[1] / results[thread_count]
    parallelism = speedup / thread_count
    fields = (thread_count, total_time, unit_time, speedup, parallelism)
    tf.logging.info(_format_line(headers, fields))


if __name__ == '__main__':
  tf.app.run()
