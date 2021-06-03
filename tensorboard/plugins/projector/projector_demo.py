# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
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
"""Generates demo data for the TensorBoard projector plugin.

For a more complete walkthrough, please see one of the following tutorials:

- https://www.tensorflow.org/tensorboard/tensorboard_projector_plugin
- https://www.tensorflow.org/tutorials/text/word_embeddings
"""

import os
import string

from absl import app
from absl import flags
from tensorboard.plugins import projector

flags.DEFINE_string(
    "logdir", "/tmp/projector_demo", "Directory to write data to."
)
FLAGS = flags.FLAGS


def tensor_for_label(label):
    """Fake embedding based on occurrence of 26 ASCII letters in the label."""
    return tuple(0.1 if c in label else -0.1 for c in string.ascii_lowercase)


def write_embedding(log_dir):
    """Writes embedding data and projector configuration to the logdir."""
    metadata_filename = "metadata.tsv"
    tensor_filename = "tensor.tsv"

    labels = ANIMALS.strip().splitlines()
    labels_to_tensors = {label: tensor_for_label(label) for label in labels}
    os.makedirs(log_dir, exist_ok=True)
    with open(os.path.join(log_dir, metadata_filename), "w") as f:
        for label in labels_to_tensors:
            f.write("{}\n".format(label))
    with open(os.path.join(log_dir, tensor_filename), "w") as f:
        for tensor in labels_to_tensors.values():
            f.write("{}\n".format("\t".join(str(x) for x in tensor)))

    config = projector.ProjectorConfig()
    embedding = config.embeddings.add()
    embedding.metadata_path = metadata_filename
    embedding.tensor_path = tensor_filename
    projector.visualize_embeddings(log_dir, config)


def main(unused_argv):
    print("Saving output to %s." % FLAGS.logdir)
    write_embedding(FLAGS.logdir)
    print("Done. Output saved to %s." % FLAGS.logdir)


ANIMALS = """
aardvark
alligator
antelope
armadillo
badger
bat
bear
beaver
bison
buffalo
camel
cheetah
cow
coyote
dog
dolphin
elephant
emu
fox
gerbil
giraffe
gnu
hamster
hedgehog
hippopotamus
hyena
kangaroo
koala
leopard
lion
mink
mole
moose
mouse
opossum
otter
ox
panda
pig
porpoise
raccoon
rat
reindeer
rhinoceros
seal
shark
snake
squid
squirrel
tiger
turtle
wallaby
walrus
whale
wolf
wombat
yak
"""


if __name__ == "__main__":
    app.run(main)
