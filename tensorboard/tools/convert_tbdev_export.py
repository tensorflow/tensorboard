#! /usr/bin/env python3
# Copyright 2023 The TensorFlow Authors. All Rights Reserved.
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

"""
This script converts experiment data exported from TensorBoard.dev back into
the "event file" format that TensorBoard traditionally consumes.

================================================================================

To use this script, first export your TensorBoard.dev data as follows:

    $ tensorboard dev export --outdir <YOUR-OUTPUT-DIRECTORY-HERE>

This will produce one subdirectory per experiment, each in the form
experiment_<EXPERIMENT_ID>. This script converts a single experiment at a time.
Invoke it and pass the experiment subdirectory, as follows:

    $ python convert_tbdev_export.py <EXPORTED-EXPERIMENT-DIRECTORY>

The converted data will be written to a temporary directory on your system by
default. To specify the output directory, pass the additional flag --outdir:

    $ python convert_tbdev_export.py <EXP-DIRECTORY> --outdir <OUT-DIRECTORY>

Lastly, the resulting data can be viewed by passing the output directory to
open source TensorBoard as a log directory, as follows:

    $ tensorboard --logdir <OUT-DIRECTORY>

================================================================================

Important notes:

1) This script will not recreate the same event files that were uploaded to
   TensorBoard.dev. In particular, only the data that was actually hosted
   (i.e. only certain plugins) will be preserved, and the data will be
   emitted in a different order and partitioned into different files.

   That said, the intent of the script is to produce event files that when
   viewed with open source TensorBoard show the same data as the original
   TensorBoard.dev experiment.

2) This script intends to convert all exported data, but is not guaranteed
   to do so, and the original exported data should be retained if needed.

3) This script must be run in an environment that has the `tensorboard` Python
   package installed. Please use the most recent available such package.

4) This script is not an official Google product. Any support is best effort.

"""

import argparse
import base64
import collections
import json
import logging
import os
import re
import tempfile

try:
    import numpy as np
except ImportError:
    logging.error("Could not import numpy. Please pip install numpy")
    exit(1)

try:
    import tensorboard  # noqa: F401
except ImportError:
    logging.error(
        "Could not import tensorboard. Please pip install tensorboard"
    )
    exit(1)

from tensorboard.compat.proto.event_pb2 import Event
from tensorboard.compat.proto.summary_pb2 import Summary
from tensorboard.summary.writer.event_file_writer import EventFileWriter
from tensorboard.util import tensor_util


# Constants for expected format of output directory.
_BLOBS_DIR = "blobs"
_BLOBS_FILE = "blob_sequences.json"
_METADATA_FILE = "metadata.json"
_SCALARS_FILE = "scalars.json"
_TENSORS_DIR = "tensors"
_TENSORS_FILE = "tensors.json"


# Regex for matching exported directory names, formatted as `experiment_<ID>`.
# Experiment IDs are UUIDs (16 bytes) encoded with URL-safe base64 without
# padding characters, which means they are always 22 characters long.
_EXP_DIR_REGEX = re.compile("experiment_[-_A-Za-z0-9]{22}")


def convert(exp_dir, out_dir):
    convert_metadata(exp_dir, out_dir)
    convert_scalars(exp_dir, out_dir)
    convert_tensors(exp_dir, out_dir)
    convert_blobs(exp_dir, out_dir)


def convert_metadata(exp_dir, out_dir):
    # Store the directory name this was converted from (which typically
    # would contain the experiment ID), but othewrise copy unchanged.
    with open(os.path.join(exp_dir, _METADATA_FILE)) as f:
        metadata = json.load(f)
    metadata["converted_from"] = os.path.basename(exp_dir)
    with open(os.path.join(out_dir, "converted_metadata.json"), mode="w") as f:
        json.dump(metadata, f)


def convert_scalars(exp_dir, out_dir):
    run_to_series = load_run_to_series(os.path.join(exp_dir, _SCALARS_FILE))
    for run, series_list in run_to_series.items():
        w = create_writer_for_run(out_dir, run, "scalars")
        for series in series_list:
            tag = series["tag"]
            summary_metadata = base64.b64decode(series["summary_metadata"])
            points = zip(
                series["points"]["steps"],
                series["points"]["wall_times"],
                series["points"]["values"],
            )
            first = True
            for step, wall_time, value in points:
                e = Event(step=step, wall_time=wall_time)
                e.summary.value.add(tag=tag, simple_value=value)
                # For scalars, only write summary metadata once per tag.
                # This keeps the file more compact and unlike tensors or blobs,
                # scalars are easy to interpret even without any metadata.
                if first:
                    e.summary.value[0].metadata.MergeFromString(
                        summary_metadata
                    )
                    first = False
                w.add_event(e)
        w.close()


def convert_tensors(exp_dir, out_dir):
    def convert_tensors(tensors_file_path):
        # Exported value is a path to a .npz file, holding tensor values for all
        # points in the entire series.
        if os.path.dirname(tensors_file_path) != _TENSORS_DIR:
            logging.warning(
                "Skipping invalid tensor file path %r", tensors_file_path
            )
            return None
        npz = np.load(os.path.join(exp_dir, tensors_file_path))
        return [tensor_util.make_tensor_proto(npz[key]) for key in npz.files]

    run_to_series = load_run_to_series(os.path.join(exp_dir, _TENSORS_FILE))
    for run, series_list in run_to_series.items():
        w = create_writer_for_run(out_dir, run, "tensors")
        for series in series_list:
            tag = series["tag"]
            summary_metadata = base64.b64decode(series["summary_metadata"])
            tensors = convert_tensors(series["points"]["tensors_file_path"])
            if tensors is None:
                continue
            if len(tensors) != len(series["points"]["steps"]):
                logging.warning(
                    "Skipping tag %r in run %r with incomplete tensor data",
                    tag,
                    run,
                )
            points = zip(
                series["points"]["steps"],
                series["points"]["wall_times"],
                tensors,
            )
            for step, wall_time, tensor in points:
                e = Event(step=step, wall_time=wall_time)
                e.summary.value.add(tag=tag, tensor=tensor)
                e.summary.value[0].metadata.MergeFromString(summary_metadata)
                w.add_event(e)
        w.close()


def convert_blobs(exp_dir, out_dir):
    def convert_blob_value(blob_file_paths):
        # Exported values are lists of paths to .bin binary files, representing
        # the blobs in each sequence, for each blob sequence in the series.
        blobs = []
        for blob_file_path in blob_file_paths:
            if os.path.dirname(blob_file_path) != _BLOBS_DIR:
                logging.warning(
                    "Skipping invalid blob file path %r", blob_file_path
                )
                continue
            with open(os.path.join(exp_dir, blob_file_path), mode="rb") as f:
                blobs.append(f.read())
        # Omit dtype; that's fine since read path ignores it anyway.
        blob_tensor = tensor_util.make_tensor_proto(
            values=blobs, shape=[len(blobs)]
        )
        return Summary.Value(tensor=blob_tensor)

    run_to_series = load_run_to_series(os.path.join(exp_dir, _BLOBS_FILE))
    for run, series_list in run_to_series.items():
        w = create_writer_for_run(out_dir, run, "blobs")
        for series in series_list:
            tag = series["tag"]
            summary_metadata = base64.b64decode(series["summary_metadata"])
            points = zip(
                series["points"]["steps"],
                series["points"]["wall_times"],
                series["points"]["blob_file_paths"],
            )
            for step, wall_time, blob_file_paths in points:
                e = Event(step=step, wall_time=wall_time)
                value = convert_blob_value(blob_file_paths)
                if value is None:
                    continue
                e.summary.value.append(value)
                e.summary.value[0].tag = tag
                e.summary.value[0].metadata.MergeFromString(summary_metadata)
                w.add_event(e)
        w.close()


def load_run_to_series(filename):
    run_to_series = collections.defaultdict(list)
    with open(filename) as f:
        for line in f:
            series = json.loads(line)
            run_to_series[series["run"]].append(series)
    return run_to_series


def create_writer_for_run(out_dir, run, suffix):
    # Special case: the "." run corresponds to the root directory.
    if run == ".":
        dir = out_dir
    else:
        # Convert path separators in run names to be platform-specific.
        translated_run = run.replace("/", os.path.sep)
        dir = os.path.join(out_dir, translated_run)
    return EventFileWriter(
        dir,
        max_queue_size=1000,
        filename_suffix=".tbdev-converter-" + suffix,
    )


def main():
    # Generate help from module docstring.
    description = __doc__
    summary, _, details = description.partition("\n\n")
    parser = argparse.ArgumentParser(
        prog="convert_tbdev_export.py",
        description=summary,
        epilog=details,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "exp_dir",
        metavar="EXPERIMENT-DIRECTORY",
        help="Exported experiment directory to convert",
    )
    parser.add_argument(
        "-o", "--outdir", help="Optional output directory to write to"
    )
    parser.add_argument(
        "-f",
        "--force",
        action="store_true",
        help=(
            "If True, continue even if input directory name is not in"
            "the expected format"
        ),
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="If True, print a list of the resulting files",
    )
    args = parser.parse_args()
    # Normalize, and in particular strip trailing slash if provided.
    exp_dir = os.path.normpath(args.exp_dir)
    if not os.path.exists(exp_dir):
        logging.error("Input directory not found: %s", exp_dir)
        exit(1)
    if not os.path.isdir(exp_dir):
        logging.error("Input is not a directory: %s", exp_dir)
        exit(1)
    exp_dir_base = os.path.basename(exp_dir)
    if not _EXP_DIR_REGEX.fullmatch(exp_dir_base):
        msg = "Input directory name %r does not match expected format %r. " % (
            exp_dir_base,
            _EXP_DIR_REGEX.pattern,
        )
        if args.force:
            logging.warning(msg + "Continuing anyway due to --force.")
        if not args.force:
            logging.error(msg + "Pass --force to attempt conversion anyway.")
            exit(1)
    out_dir = args.outdir
    if not out_dir:
        out_dir = tempfile.mkdtemp(
            prefix="tbdev-export-converter-%s-" % exp_dir_base
        )
    if not os.path.exists(out_dir):
        logging.error("Output directory must exist: %s", out_dir)
        exit(1)
    if not os.path.isdir(out_dir):
        logging.error("Output is not a directory: %s", out_dir)
        exit(1)

    convert(exp_dir, out_dir)

    if not args.outdir:
        print(f"Results of conversion in: {out_dir}")
    if args.verbose:
        for dirpath, dirnames, filenames in os.walk(out_dir):
            print(dirpath)
            for name in filenames:
                print(os.path.join(dirpath, name))


if __name__ == "__main__":
    main()
