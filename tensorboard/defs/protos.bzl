# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

load("@com_google_protobuf//bazel:py_proto_library.bzl", "py_proto_library")
load("@com_github_grpc_grpc//bazel:protobuf.bzl", "well_known_proto_libs")
load("@com_github_grpc_grpc//bazel:python_rules.bzl", "py_grpc_library")

# TODO(#6185): try to reduce the complexity in this rule.
def tb_proto_library(
        name,
        srcs = None,
        deps = [],
        visibility = None,
        testonly = None,
        has_services = False,
        # The `exports` arg is unused here, but required internally for compatibility.
        exports = []):
    proto_deps = [s + "_proto" for s in deps] + well_known_proto_libs()

    native.proto_library(
        name = name + "_proto",
        srcs = srcs,
        deps = proto_deps,
        testonly = testonly,
        visibility = ["//visibility:public"],
    )

    py_proto_library(
        name = name + "_py_pb2",
        deps = [name + "_proto"],
        testonly = testonly,
        visibility = visibility,
    )

    if has_services:
        py_grpc_library(
            name = name + "_py_pb2_grpc",
            srcs = [name + "_proto"],
            deps = [name + "_py_pb2"],
            grpc_library = "//tensorboard:expect_grpc_installed",
            testonly = testonly,
            visibility = visibility,
        )
