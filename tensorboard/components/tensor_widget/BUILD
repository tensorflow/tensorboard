package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

load("@build_bazel_rules_nodejs//:defs.bzl", "rollup_bundle")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("@npm_bazel_typescript//:index.bzl", "ts_library")

load("@npm_bazel_karma//:index.bzl", "karma_web_test")

licenses(["notice"])  # Apache 2.0

rollup_bundle(
    name = "tensor_widget",
    entry_point = ":tensor-widget.ts",
    deps = [
        ":tensor_widget_lib",
    ]
)

ts_library(
    name = "tensor_widget_lib",
    srcs = glob([
        "dtype-utils.ts",
        "health-pill-types.ts",
        "tensor-widget.ts",
        "types.ts",
    ]),
)

ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "dtype-utils-test.ts",
    ],
    deps = [
	    ":tensor_widget_lib",
	    "@npm//@types/jasmine",
    ],
    tsconfig = "//:tsconfig-test",
)

jasmine_node_test(
    name = "test",
    deps = [":test_lib"],
)
