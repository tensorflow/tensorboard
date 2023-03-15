load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ng_web_test_suite", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

genrule(
    name = "gen_tensor_widget_style",
    srcs = [
        "tensor-widget-style.uninlined.ts",
        "tensor-widget.css",
    ],
    outs = ["tensor-widget-style.ts"],
    cmd = "$(execpath //tensorboard/tools:inline_file_content) $(SRCS) >'$@'",
    tools = ["//tensorboard/tools:inline_file_content"],
)

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
        "tensor-widget-style.ts",
        "types.ts",
        "version.ts",
    ],
    deps = ["//tensorboard/components/polymer:register_style_dom_module"],
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
        "@npm//@types/jasmine",
    ],
)

tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        ":test_lib",
    ],
)
