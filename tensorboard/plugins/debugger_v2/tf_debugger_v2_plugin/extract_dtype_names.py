# Lint as: python3

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import sys
import os
import json

from tensorboard.compat.tensorflow_stub import dtypes


def write_file(out_path):
    with open(out_path, "w") as f:
        name_map = json.dumps(dtypes._TYPE_TO_STRING)
        f.write("export const ENUM_TO_NAME = %s" % name_map)


if __name__ == "__main__":
    write_file(sys.argv[1])

