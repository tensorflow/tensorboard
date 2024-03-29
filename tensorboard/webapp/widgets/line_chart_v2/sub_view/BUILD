load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "line_chart_axis_view_styles",
    src = "line_chart_axis_view.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "line_chart_interactive_view_styles",
    src = "line_chart_interactive_view.scss",
)

tf_ng_module(
    name = "sub_view",
    srcs = [
        "chart_view_utils.ts",
        "line_chart_axis_utils.ts",
        "line_chart_axis_view.ts",
        "line_chart_grid_view.ts",
        "line_chart_interactive_utils.ts",
        "line_chart_interactive_view.ts",
        "sub_view_module.ts",
    ],
    assets = [
        ":line_chart_axis_view_styles",
        ":line_chart_interactive_view_styles",
        "line_chart_axis_view.ng.html",
        "line_chart_interactive_view.ng.html",
    ],
    deps = [
        ":internal_types",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/third_party:d3",
        "//tensorboard/webapp/util:dom",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:scale",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "internal_types",
    srcs = ["internal_types.ts"],
    visibility = ["//visibility:private"],
)

tf_ts_library(
    name = "sub_view_tests",
    testonly = True,
    srcs = [
        "line_chart_axis_utils_test.ts",
        "line_chart_axis_view_test.ts",
        "line_chart_grid_view_test.ts",
        "line_chart_interactive_utils_test.ts",
        "line_chart_interactive_view_test.ts",
        "testing.ts",
    ],
    deps = [
        ":internal_types",
        ":sub_view",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_cdk_testing_testbed",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_menu_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:scale",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
