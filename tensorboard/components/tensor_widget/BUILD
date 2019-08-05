package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

# load("@build_bazel_rules_nodejs//:defs.bzl", "rollup_bundle")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("@npm_bazel_typescript//:index.bzl", "ts_library")
# load("@npm_bazel_karma//:package.bzl", "rules_karma_dependencies")
# rules_karma_dependencies()

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tensor_widget",
    srcs = [
        "dtype-utils.ts",
        "health-pill-types.ts",
        "tensor-widget.html",
        "tensor-widget.ts",
        "types.ts",
    ],
    path = "/tensor-widget",
    visibility = ["//visibility:public"],
    deps = [],
)

ts_library(
    name = "tensor_widget_lib",
    srcs = glob([
        "*.ts",
    ]),
)

jasmine_node_test(
    name = "dtypes-utils-test",
    srcs = ["dtypes-utils-test.js"],
    deps = [
        ":tensor_widget_lib",
    ]
)