package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_js_binary")
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

tf_js_binary(
    name = "tensor_widget_binary",
    compile = 1,
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
        "tensor-widget.ts",
        "types.ts",
        "version.ts",
    ],
)

ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "dtype-utils-test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":tensor_widget_lib",
        "@npm//@types/chai",
        "@npm//@types/jasmine",
        "@npm//chai",
    ],
)

jasmine_node_test(
    name = "test",
    deps = [":test_lib"],
)

ts_devserver(
    name = "dev_server",
    entry_module = "tensor-widget",
    index_html = "demo/demo.html",
    serving_path = "/bundle.js",
    static_files = [
        "demo/demo.css",
        "demo/demo.html",
    ],
    deps = [":tensor_widget_lib"],
)
