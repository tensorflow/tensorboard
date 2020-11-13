load("//tensorboard/defs:defs.bzl", "tf_ts_library")
load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "sub_view",
    srcs = [
        "axis_formatter.ts",
        "chart_view_utils.ts",
        "line_chart_axis_view.ts",
        "line_chart_grid_view.ts",
        "sub_view_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/third_party:d3",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "sub_view_tests",
    testonly = True,
    srcs = [
        "axis_formatter_test.ts",
        "line_chart_axis_view_test.ts",
        "line_chart_grid_view_test.ts",
    ],
    deps = [
        ":sub_view",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:scale",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
