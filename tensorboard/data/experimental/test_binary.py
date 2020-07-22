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
"""A test binary that can be used to test ExperimentFromDev features."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse

from tensorboard.data.experimental import experiment_from_dev


def parse_args():
    parser = argparse.ArgumentParser("Test run of ExperimentFromDev")
    parser.add_argument(
        "--experiment_id",
        type=str,
        default="AdYd1TgeTlaLWXx6I8JUbA",
        help="Experiment ID",
    )
    parser.add_argument(
        "--api_endpoint",
        type=str,
        default=None,
        help="Optional API endpoint used to override the default",
    )
    parser.add_argument(
        "--pivot",
        action="store_true",
        help="Pivot the DataFrame, so that the tags become columns "
        "of the DataFrame.",
    )
    parser.add_argument(
        "--include_wall_time",
        action="store_true",
        help="Include wall_time column(s) in the DataFrame",
    )
    return parser.parse_args()


def main(args):
    experiment = experiment_from_dev.ExperimentFromDev(
        args.experiment_id, api_endpoint=args.api_endpoint
    )
    dataframe = experiment.get_scalars(
        pivot=args.pivot, include_wall_time=args.include_wall_time
    )
    print(dataframe)


if __name__ == "__main__":
    main(parse_args())
