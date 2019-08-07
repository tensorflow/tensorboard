package(default_visibility = ["//tensorboard:internal"])

load("@build_bazel_rules_nodejs//:defs.bzl", "rollup_bundle")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("@npm_bazel_typescript//:index.bzl", "ts_devserver", "ts_library")

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
    entry_point = ":tensor-widget.ts",
    deps = [
        ":tensor_widget_lib",
    ],
)

ts_library(
    name = "tensor_widget_lib",
    srcs = [
        "dtype-utils.ts",
        "health-pill-types.ts",
        "string-utils.ts",
        "tensor-widget.ts",
        "tensor-widget-impl.ts",
        "types.ts",
        "version.ts",
    ],
)

ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "dtype-utils-test.ts",
        "string-utils-test.ts",
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

ts_devserver(
    name = "dev_server",
    deps = [":tensor_widget_lib"],
    serving_path = "/bundle.js",
    entry_module = "tensor-widget",
    static_files = [
        "demo/demo.css",
        "demo/demo.html",
        "tensor-widget.css",
    ],
    index_html = "demo/demo.html",
)
