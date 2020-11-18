load("//tensorboard/defs:defs.bzl", "tf_sass_binary", "tf_ts_library")
load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "line_chart_interactive_view_styles",
    src = "line_chart_interactive_view.scss",
)

ng_module(
    name = "sub_view",
    srcs = [
        "axis_formatter.ts",
        "chart_view_utils.ts",
        "line_chart_axis_view.ts",
        "line_chart_grid_view.ts",
        "line_chart_interactive_utils.ts",
        "line_chart_interactive_view.ts",
        "sub_view_module.ts",
    ],
    assets = [
        ":line_chart_interactive_view_styles",
        "line_chart_interactive_view.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/third_party:d3",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "sub_view_tests",
    testonly = True,
    srcs = [
        "axis_formatter_test.ts",
        "line_chart_axis_view_test.ts",
        "line_chart_grid_view_test.ts",
        "line_chart_interactive_utils_test.ts",
        "line_chart_interactive_view_test.ts",
    ],
    deps = [
        ":sub_view",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:scale",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
