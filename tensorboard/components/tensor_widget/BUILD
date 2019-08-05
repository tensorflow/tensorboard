package(default_visibility = ["//tensorboard:internal"])

load("@build_bazel_rules_nodejs//:defs.bzl", "rollup_bundle")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("@npm_bazel_typescript//:index.bzl", "ts_library")

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tensor_widget",
    srcs = [
        ":tensor_widget_binary.js",
    ],
    path = "/tensor-widget",
    deps = [
        ":tensor_widget_binary",
    ],
)

rollup_bundle(
    name = "tensor_widget_binary",
    entry_point = ":tensor-widget.js",
    deps = [
        ":tensor_widget_lib",
    ],
)

ts_library(
    name = "tensor_widget_lib",
    srcs = [
        "dtype-utils.js",
        "health-pill-types.js",
        "tensor-widget.js",
        "types.js",
    ],
)

ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "dtype-utils-test.js",
    ],
    deps = [
        ":tensor_widget_lib",
        "@npm//@types/chai",
        "@npm//@types/jasmine",
        "@npm//chai",
    ],
    tsconfig = "//:tsconfig-test",
)

jasmine_node_test(
    name = "test",
    deps = [":test_lib"],
)
