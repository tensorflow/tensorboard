load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ng_module", "tf_sass_binary", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "line_chart_styles",
    src = "line_chart_component.scss",
)

tf_ng_module(
    name = "line_chart_v2",
    srcs = [
        "line_chart_component.ts",
        "line_chart_module.ts",
    ],
    assets = [
        "line_chart_component.ng.html",
        ":line_chart_styles",
    ],
    deps = [
        ":internal_utils",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/widgets:resize_detector",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:chart",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:scale",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/worker:worker_chart",
        "//tensorboard/webapp/widgets/line_chart_v2/sub_view",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "internal_utils",
    srcs = [
        "line_chart_internal_utils.ts",
    ],
    visibility = ["//visibility:private"],
    deps = [
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:utils",
    ],
)

ng_module(
    name = "line_chart_demo",
    srcs = [
        "demo_main.ts",
        "line_chart_demo_component.ts",
        "line_chart_demo_module.ts",
    ],
    visibility = ["//visibility:private"],
    deps = [
        ":line_chart_v2",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
    ],
)

tf_js_binary(
    name = "demo_binary",
    compile = True,
    entry_point = ":demo_main.ts",
    visibility = ["//visibility:private"],
    deps = [":line_chart_demo"],
)

tf_web_library(
    name = "demo_server",
    srcs = [
        "demo.html",
        ":demo_binary.js",
        "//tensorboard/webapp/widgets/line_chart_v2/lib/worker:chart_worker.js",
    ],
    path = "/",
    visibility = ["//visibility:private"],
)

tf_ts_library(
    name = "line_chart_v2_tests",
    testonly = True,
    srcs = [
        "line_chart_component_test.ts",
        "line_chart_internal_utils_test.ts",
    ],
    deps = [
        ":internal_utils",
        ":line_chart_v2",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:chart",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:testing",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:utils",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
