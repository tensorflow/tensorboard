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

def tb_proto_library(
        name,
        srcs = None,
        deps = [],
        visibility = None,
        testonly = None,
        has_services = False,
        exports = []):
    outs_proto = _PyOuts(srcs, grpc = False)
    outs_grpc = _PyOuts(srcs, grpc = True) if has_services else []
    outs_all = outs_proto + outs_grpc

    runtime = "@com_google_protobuf//:protobuf_python"

    proto_gen(
        name = name + "_genproto",
        srcs = srcs,
        deps = [s + "_genproto" for s in deps] + [runtime + "_genproto"],
        includes = [],
        protoc = "@com_google_protobuf//:protoc",
        gen_py = True,
        outs = outs_all,
        visibility = ["//visibility:public"],
        plugin = "//external:grpc_python_plugin" if has_services else None,
        plugin_language = "grpc",
    )

    py_deps = [s + "_py_pb2" for s in deps] + [runtime]
    native.py_library(
        name = name + "_py_pb2",
        srcs = outs_proto,
        imports = [],
        srcs_version = "PY3",
        deps = py_deps,
        testonly = testonly,
        visibility = visibility,
    )
    if has_services:
        native.py_library(
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
