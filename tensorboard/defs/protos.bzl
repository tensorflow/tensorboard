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

load("@com_google_protobuf//:protobuf.bzl", "proto_gen")
load("@rules_python//python:py_library.bzl", "py_library")

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
    outs_proto = _PyOuts(srcs, grpc = False)
    outs_grpc = _PyOuts(srcs, grpc = True) if has_services else []
    outs_all = outs_proto + outs_grpc

    # Dependencies we need to operate protoc (the protobuf compiler), including
    # protoc itself, the intermediate generated proto output from the runtime
    # bundled with protoc (to provide proto types used during the protoc code
    # generation process itself), and the grpc plugin to protoc used for gRPC
    # service generation.
    protoc = "@com_google_protobuf//:protoc"
    protoc_runtime_genproto = "@com_google_protobuf//:protobuf_python_genproto"
    grpc_python_plugin = "//external:grpc_python_plugin"

    # Python generated code relies on a Python protobuf runtime to be present.
    # The runtime version must be compatible (typically, >=) with the protoc
    # that was used to generate the code. There is a runtime provided along
    # with protoc as part of our build-time dependency on protobuf (the target
    # is "@com_google_protobuf//:protobuf_python"), but we deliberately don't
    # use it, because our tests may need to use a protobuf runtime that is
    # higher than our protoc version in order to be compatible with generated
    # protobuf code used by our dependencies (namely, TensorFlow). Instead, we
    # rely on picking up protobuf ambiently from the virtual environment, the
    # same way that it will behave when released in our pip package.
    runtime = "//tensorboard:expect_protobuf_installed"

    proto_gen(
        name = name + "_genproto",
        srcs = srcs,
        deps = [s + "_genproto" for s in deps] + [protoc_runtime_genproto],
        includes = [],
        protoc = protoc,
        gen_py = True,
        outs = outs_all,
        visibility = ["//visibility:public"],
        plugin = grpc_python_plugin if has_services else None,
        plugin_language = "grpc",
    )

    py_deps = [s + "_py_pb2" for s in deps] + [runtime]
    py_library(
        name = name + "_py_pb2",
        srcs = outs_proto,
        imports = [],
        srcs_version = "PY3",
        deps = py_deps,
        testonly = testonly,
        visibility = visibility,
    )
    if has_services:
        py_library(
            name = name + "_py_pb2_grpc",
            srcs = outs_grpc,
            imports = [],
            srcs_version = "PY3",
            deps = [name + "_py_pb2"] + py_deps,
            testonly = testonly,
            visibility = visibility,
        )

def _PyOuts(srcs, grpc):
    # Adapted from @com_google_protobuf//:protobuf.bzl.
    ext = "_pb2.py" if not grpc else "_pb2_grpc.py"
    return [s[:-len(".proto")] + ext for s in srcs]
