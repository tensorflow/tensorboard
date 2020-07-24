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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import tensorflow as tf

from tensorboard.util import op_evaluator

# pylint: disable=not-context-manager


class PNGDecoder(op_evaluator.PersistentOpEvaluator):
    def __init__(self):
        super(PNGDecoder, self).__init__()
        self._image_placeholder = None
        self._decode_op = None

    def initialize_graph(self):
        self._image_placeholder = tf.compat.v1.placeholder(dtype=tf.string)
        self._decode_op = tf.image.decode_png(self._image_placeholder)

    # pylint: disable=arguments-differ
    def run(self, image):
        return self._decode_op.eval(feed_dict={self._image_placeholder: image,})


decode_png = PNGDecoder()
