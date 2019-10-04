package(default_visibility = ["//tensorboard:internal"])

load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("//tensorboard/defs:defs.bzl", "tf_ts_config", "tf_js_binary", "tf_ts_devserver", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tensor_widget",
    srcs = [
        "tensor-widget.css",
        "tensor-widget.html",
        ":tensor_widget_binary.js",
    ],
    path = "/tensor-widget",
    deps = [
        ":tensor_widget_binary",
    ],
)

tf_js_binary(
    name = "tensor_widget_binary",
    srcs = [
        "externs.js",
    ],
    compile = 1,
    entry_point = ":tensor-widget-interop.ts",
    deps = [
        ":tensor_widget_binary_lib",
    ],
)

tf_ts_library(
    name = "tensor_widget_binary_lib",
    srcs = [
        "tensor-widget-interop.ts",
    ],
    tsconfig = ":tsconfig",
    deps = [
        ":tensor_widget_lib",
    ],
)

tf_ts_library(
    name = "tensor_widget_lib",
    srcs = [
        "colormap.ts",
        "dtype-utils.ts",
        "health-pill-types.ts",
        "menu.ts",
        "selection.ts",
        "shape-utils.ts",
        "slicing-control.ts",
        "string-utils.ts",
        "tensor-widget.ts",
        "tensor-widget-impl.ts",
        "types.ts",
        "version.ts",
    ],
    tsconfig = ":tsconfig",
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "colormap-test.ts",
        "dtype-utils-test.ts",
        "selection-test.ts",
        "shape-utils-test.ts",
        "string-utils-test.ts",
    ],
    deps = [
        ":tensor_widget_lib",
        "@npm//@types/chai",
        "@npm//@types/jasmine",
        "@npm//chai",
    ],
)

jasmine_node_test(
    name = "test",
    srcs = [":test_lib"],
    deps = [
        "@npm//chai",
    ],
)

tf_ts_library(
    name = "demo_lib",
    srcs = [
        "demo/demo.ts",
    ],
    tsconfig = ":tsconfig",
    deps = [
        ":tensor_widget_lib",
    ],
)

tf_ts_devserver(
    name = "dev_server",
    index_html = "demo/demo.html",
    serving_path = "/bundle.js",
    static_files = [
        "demo/demo.css",
        "demo/demo.html",
        "tensor-widget.css",
    ],
    deps = [
        ":demo_lib",
    ],
)

tf_ts_config(
    name = "tsconfig",
    src = "tsconfig.json",
    deps = [],
)
