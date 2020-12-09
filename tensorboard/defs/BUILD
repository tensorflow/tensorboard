load("//tensorboard/defs:protos.bzl", "tb_proto_library")
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_test(
    name = "tb_proto_library_test",
    srcs = ["tb_proto_library_test.py"],
    deps = [
        ":test_base_py_pb2",
        ":test_base_py_pb2_grpc",
        ":test_downstream_py_pb2",
        ":test_downstream_py_pb2_grpc",
        "//tensorboard:test",
    ],
)

tb_proto_library(
    name = "test_base",
    testonly = True,
    srcs = ["test_base.proto"],
    has_services = True,
)

tb_proto_library(
    name = "test_downstream",
    testonly = True,
    srcs = ["test_downstream.proto"],
    has_services = True,
    deps = [
        ":test_base",
    ],
)

exports_files(["web_test_python_stub.template.py"])

exports_files(["rollup_config.js"])

# Custom ts_library compiler that runs tsc_wrapped with angular/compiler-cli statically linked
# This can be used with worker mode because we don't need the linker at runtime to make
# the angular plugin loadable
# Just a clone of @npm//@bazel/typescript/bin:tsc_wrapped with added deps
nodejs_binary(
    name = "tsc_wrapped_with_angular",
    data = [
        "@npm//@angular/compiler-cli",
        "@npm//@bazel/typescript",
    ],
    entry_point = "@npm//:node_modules/@bazel/typescript/internal/tsc_wrapped/tsc_wrapped.js",
    visibility = ["//tensorboard:__subpackages__"],
)
