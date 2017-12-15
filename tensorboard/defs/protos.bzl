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

load("@protobuf//:protobuf.bzl", "cc_proto_library", "py_proto_library")

def tb_proto_library(name, srcs = [], visibility = []):
  cc_proto_library(
    name = name + '_cc_proto',
    srcs = srcs,
    deps = ["@protobuf//:protobuf_proto"],
    protoc = "@protobuf//:protoc",
    visibility = visibility)
  
  py_proto_library(
    name = name + "_py_pb2",
    srcs = srcs,
    srcs_version = "PY2AND3",
    deps = ["@protobuf//:protobuf_python"],
    protoc = "@protobuf//:protoc",
    visibility = visibility,
    default_runtime = "@protobuf//:protobuf_python",
    testonly = 0,
  )
