load("@build_bazel_rules_nodejs//:index.bzl", "nodejs_binary")
load("@npm//@bazel/concatjs:index.bzl", "ts_library")
load("@rules_python//python:py_binary.bzl", "py_binary")
load("@rules_python//python:py_test.bzl", "py_test")
load("//tensorboard/defs:protos.bzl", "tb_proto_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

py_binary(
    name = "inline_images",
    srcs = ["inline_images.py"],
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
    compiler = ":tsc_wrapped",
)

# Custom ts_library compiler for non-Angular targets.
#
# Bazel's generated tsc_wrapped binary needs the `typescript` package at runtime,
# but does not include it in its runfiles. This may work locally because the
# execroot's node_modules directory is available, but fails in the sandbox.
# Define the binary here and add `typescript` explicitly so the compiler works
# reliably in both local and sandboxed builds.
#
# Angular targets use tsc_wrapped_with_angular below, which declares the Angular
# compiler dependencies separately.
nodejs_binary(
    name = "tsc_wrapped",
    data = [
        "@npm//@bazel/concatjs",
        "@npm//typescript",
    ],
    entry_point = "@npm//:node_modules/@bazel/concatjs/internal/tsc_wrapped/tsc_wrapped.js",
    visibility = ["//tensorboard:__subpackages__"],
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
        "@npm//typescript",
    ],
    entry_point = "@npm//:node_modules/@bazel/concatjs/internal/tsc_wrapped/tsc_wrapped.js",
    # Disables the Bazel node modules linker. The node module linker is unreliable for the
    # persistent worker executable, as it would rely on the `node_modules/` folder in the
    # execroot that can be shared in non-sandbox environments or for persistent workers.
    # https://docs.bazel.build/versions/main/command-line-reference.html#flag--worker_sandboxing.
    templated_args = ["--nobazel_run_linker"],
    visibility = ["//tensorboard:__subpackages__"],
)
