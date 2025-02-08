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
"""Proto match tests between `tensorboard.compat.proto` and TensorFlow.

These tests verify that the local copy of TensorFlow protos are the same
as those available directly from TensorFlow. Local protos are used to
build `tensorboard-notf` without a TensorFlow dependency.
"""


import difflib
import importlib

import tensorflow as tf
from google.protobuf import descriptor_pb2


# Keep this list synced with BUILD in current directory
PROTO_IMPORTS = [
    (
        "tensorflow.core.framework.allocation_description_pb2",
        "tensorboard.compat.proto.allocation_description_pb2",
    ),
    (
        "tensorflow.core.framework.api_def_pb2",
        "tensorboard.compat.proto.api_def_pb2",
    ),
    (
        "tensorflow.core.framework.attr_value_pb2",
        "tensorboard.compat.proto.attr_value_pb2",
    ),
    (
        "tensorflow.core.protobuf.cluster_pb2",
        "tensorboard.compat.proto.cluster_pb2",
    ),
    (
        "tensorflow.core.protobuf.config_pb2",
        "tensorboard.compat.proto.config_pb2",
    ),
    (
        "tensorflow.core.framework.cost_graph_pb2",
        "tensorboard.compat.proto.cost_graph_pb2",
    ),
    (
        "tensorflow.python.framework.cpp_shape_inference_pb2",
        "tensorboard.compat.proto.cpp_shape_inference_pb2",
    ),
    (
        "tensorflow.core.protobuf.debug_pb2",
        "tensorboard.compat.proto.debug_pb2",
    ),
    ("tensorflow.core.util.event_pb2", "tensorboard.compat.proto.event_pb2"),
    (
        "tensorflow.core.framework.function_pb2",
        "tensorboard.compat.proto.function_pb2",
    ),
    (
        "tensorflow.core.framework.graph_debug_info_pb2",
        "tensorboard.compat.proto.graph_debug_info_pb2",
    ),
    (
        "tensorflow.core.framework.graph_pb2",
        "tensorboard.compat.proto.graph_pb2",
    ),
    (
        "tensorflow.core.protobuf.meta_graph_pb2",
        "tensorboard.compat.proto.meta_graph_pb2",
    ),
    (
        "tensorflow.core.framework.node_def_pb2",
        "tensorboard.compat.proto.node_def_pb2",
    ),
    (
        "tensorflow.core.framework.op_def_pb2",
        "tensorboard.compat.proto.op_def_pb2",
    ),
    (
        "tensorflow.core.framework.resource_handle_pb2",
        "tensorboard.compat.proto.resource_handle_pb2",
    ),
    (
        "tensorflow.core.protobuf.rewriter_config_pb2",
        "tensorboard.compat.proto.rewriter_config_pb2",
    ),
    (
        "tensorflow.core.protobuf.saved_object_graph_pb2",
        "tensorboard.compat.proto.saved_object_graph_pb2",
    ),
    (
        "tensorflow.core.protobuf.saver_pb2",
        "tensorboard.compat.proto.saver_pb2",
    ),
    (
        "tensorflow.core.framework.step_stats_pb2",
        "tensorboard.compat.proto.step_stats_pb2",
    ),
    (
        "tensorflow.core.protobuf.struct_pb2",
        "tensorboard.compat.proto.struct_pb2",
    ),
    (
        "tensorflow.core.framework.summary_pb2",
        "tensorboard.compat.proto.summary_pb2",
    ),
    (
        "tensorflow.core.framework.tensor_pb2",
        "tensorboard.compat.proto.tensor_pb2",
    ),
    (
        "tensorflow.core.framework.tensor_description_pb2",
        "tensorboard.compat.proto.tensor_description_pb2",
    ),
    (
        "tensorflow.core.framework.tensor_shape_pb2",
        "tensorboard.compat.proto.tensor_shape_pb2",
    ),
    (
        "tensorflow.core.profiler.tfprof_log_pb2",
        "tensorboard.compat.proto.tfprof_log_pb2",
    ),
    (
        "tensorflow.core.protobuf.trackable_object_graph_pb2",
        "tensorboard.compat.proto.trackable_object_graph_pb2",
    ),
    (
        "tensorflow.core.framework.types_pb2",
        "tensorboard.compat.proto.types_pb2",
    ),
    (
        "tensorflow.core.framework.variable_pb2",
        "tensorboard.compat.proto.variable_pb2",
    ),
    (
        "tensorflow.core.framework.versions_pb2",
        "tensorboard.compat.proto.versions_pb2",
    ),
]

PROTO_REPLACEMENTS = [
    # Keep replacements here in sync with the sed command in update.sh.
    ("tensorflow/core/framework/", "tensorboard/compat/proto/"),
    ("tensorflow/core/profiler/", "tensorboard/compat/proto/"),
    ("tensorflow/core/protobuf/", "tensorboard/compat/proto/"),
    ("tensorflow/core/util/", "tensorboard/compat/proto/"),
    ("tensorflow/python/framework/", "tensorboard/compat/proto/"),
    ("xla/tsl/protobuf", "tensorboard/compat/proto"),
    ('package: "tensorflow.tfprof"', 'package: "tensorboard"'),
    ('package: "tensorflow"', 'package: "tensorboard"'),
    ('type_name: ".tensorflow.tfprof', 'type_name: ".tensorboard'),
    ('type_name: ".tensorflow', 'type_name: ".tensorboard'),
]


MATCH_FAIL_MESSAGE_TEMPLATE = """
{}

NOTE!
====
This is expected to happen when TensorFlow updates their proto definitions.
We pin copies of the protos, but TensorFlow can freely update them at any
time.

To get this test passing, follow these steps:

1. Identify the version of TensorFlow that you want to update the protos to
   match. Typically, this is the version of TF that is in the environment
   that you are using when running this test. For releases, this is typically
   the TF release candidate that we are testing against for our own release.

2. Clone the TensorFlow git repo and check out the commit that aligns with the
   TF version from step 1. For tagged release candidates this is typically just
   checking out the tag (e.g., `git checkout v2.2.0-rc0`). If the target TF
   version is untagged (e.g. a tf-nightly release), you'll need to pick a
   commit close in time to when that release was cut.

3. In your tensorboard repo, run:

    ./tensorboard/compat/proto/update.sh PATH_TO_TENSORFLOW_REPO

4. Verify the updates build. In your tensorboard repo, run:

    bazel build //tensorboard/compat/proto/...

  If they fail with an error message like the following:

    '//tensorboard/compat/proto:full_type_genproto' does not exist

  Then create the file in the tensorboard repo:

    touch tensorboard/compat/proto/full_type.proto

  And rerun `update.sh`. The script will only copy files that already exist in
  the tensorboard repo.

5. Verify that this test now passes. Ensure that the target version of TF from
   step 1 is the version in your virtual environment, and then run:

    bazel test //tensorboard/compat/proto:proto_test

   If it doesn't pass, the possible reasons might be:
     - Skew between the TF version in your environment, and the TF commit you
       selected in step 2. Adjust the commit as necessary to resolve the skew.
     - Logic in the update script and/or this test might be outdated if the TF
       proto behavior has changed in ways that are valid, but not yet supported
       by the script and/or test. Update the script and/or test as necessary.

   Ensure the test passes before proceeding.

5. Update the rust data server proto binaries. In your tensorboard repo, run:

    bazel run //tensorboard/data/server:update_protos

6. The source file from TF seems to have a formatting that differs from the one
   we use on our repo, so you might need to reformat the BUILD file.
   The instructions below reproduce the check our CI workflow does, for
   convenience, but they might need to be updated if this process is updated
   in our CI workflow.

   To reformat the file the way our lint will check, you'll need to copy the
   values for the `BUILDTOOLS_VERSION` and `BUILDIFIER_SHA256SUM` from our CI
   workflow, and then download the buildifier binary to a local directory,
   e.g. `~/tb_buildifier/buildifier`:

    ```
    $ BUILDTOOLS_VERSION='3.0.0'
    $ BUILDIFIER_SHA256SUM='e92a6793c7134c5431c58fbc34700664f101e5c9b1c1fcd93b97978e8b7f88db'
    $ ci/download_buildifier.sh "${{BUILDTOOLS_VERSION}}" "${{BUILDIFIER_SHA256SUM}}" ~/tb_buildifier/buildifier
    ```

    If a file needs reformatting, you'll see the file that needs to be
    reformatted as the output of this command (the same one that is run by CI
    workflow):

    ```
    $ git ls-files -z '*BUILD' third_party/js.bzl third_party/workspace.bzl WORKSPACE | xargs -0 ~/tb_buildifier/buildifier --mode=check --lint=warn --warnings=-native-py,-native-java
    ```

    To reformat, execute the command without the "mode" and "lint" parameters:

    ```
    $ git ls-files -z '*BUILD' third_party/js.bzl third_party/workspace.bzl WORKSPACE | xargs -0 ~/tb_buildifier/buildifier
    ```

7. Review and commit any changes.

"""


class ProtoMatchTest(tf.test.TestCase):
    def test_each_proto_matches_tensorflow(self):
        failed_diffs = []
        for tf_path, tb_path in PROTO_IMPORTS:
            tf_pb2 = importlib.import_module(tf_path)
            tb_pb2 = importlib.import_module(tb_path)
            tf_descriptor = descriptor_pb2.FileDescriptorProto()
            tb_descriptor = descriptor_pb2.FileDescriptorProto()
            tf_pb2.DESCRIPTOR.CopyToProto(tf_descriptor)
            tb_pb2.DESCRIPTOR.CopyToProto(tb_descriptor)

            # Convert expected to be actual since this matches the
            # replacements done in proto/update.sh
            tb_string = str(tb_descriptor)
            tf_string = str(tf_descriptor)
            for orig, repl in PROTO_REPLACEMENTS:
                tf_string = tf_string.replace(orig, repl)

            diff = difflib.unified_diff(
                tb_string.splitlines(1),
                tf_string.splitlines(1),
                fromfile=tb_path,
                tofile=tf_path,
            )
            diff = "".join(diff)

            if diff:
                failed_diffs.append(diff)
        if failed_diffs:
            self.fail(MATCH_FAIL_MESSAGE_TEMPLATE.format("".join(failed_diffs)))


if __name__ == "__main__":
    tf.test.main()
