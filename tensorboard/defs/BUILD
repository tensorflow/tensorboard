load("//tensorboard/defs:protos.bzl", "tb_proto_library")
load("@rules_python//python:py_binary.bzl", "py_binary")
load("@rules_python//python:py_test.bzl", "py_test")
load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")
load("@npm//@bazel/concatjs:index.bzl", "ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_binary(
    name = "inline_images",
    srcs = ["inline_images.py"],
    python_version = "PY3",
    srcs_version = "PY3",
)

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

ts_library(
    name = "strict_types",
    srcs = ["strict_type_check.d.ts"],
)

# Custom ts_library compiler that runs tsc_wrapped with angular/compiler-cli statically linked
# This can be used with worker mode because we don't need the linker at runtime to make
# the angular plugin loadable
# Just a clone of @npm//@bazel/concatjs/bin:tsc_wrapped with added deps
nodejs_binary(
    name = "tsc_wrapped_with_angular",
    data = [
        "@npm//@angular/compiler-cli",
        "@npm//@bazel/concatjs",
        "@npm//@bazel/typescript",
    ],
    entry_point = "@npm//:node_modules/@bazel/concatjs/internal/tsc_wrapped/tsc_wrapped.js",
    # Disables the Bazel node modules linker. The node module linker is unreliable for the
    # persistent worker executable, as it would rely on the `node_modules/` folder in the
    # execroot that can be shared in non-sandbox environments or for persistent workers.
    # https://docs.bazel.build/versions/main/command-line-reference.html#flag--worker_sandboxing.
    templated_args = ["--nobazel_run_linker"],
    visibility = ["//tensorboard:__subpackages__"],
)
