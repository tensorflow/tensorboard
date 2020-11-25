load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "card_view_styles",
    src = "card_view_container.scss",
)

tf_ng_module(
    name = "card_renderer",
    srcs = [
        "card_lazy_loader.ts",
        "card_renderer_module.ts",
        "card_view_component.ts",
        "card_view_container.ts",
    ],
    assets = [
        ":card_view_styles",
        "card_view_component.ng.html",
    ],
    deps = [
        ":histogram_card",
        ":image_card",
        ":scalar_card",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/types:ui",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "histogram_card_styles",
    src = "histogram_card_component.scss",
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
    ],
)

tf_ng_module(
    name = "histogram_card",
    srcs = [
        "histogram_card_component.ts",
        "histogram_card_container.ts",
        "histogram_card_module.ts",
    ],
    assets = [
        ":histogram_card_styles",
        "histogram_card_component.ng.html",
    ],
    deps = [
        ":run_name",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views:types",
        "//tensorboard/webapp/metrics/views:utils",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/widgets:resize_detector",
        "//tensorboard/webapp/widgets/histogram",
        "//tensorboard/webapp/widgets/histogram:types",
        "//tensorboard/webapp/widgets/text:truncated_path",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//@types/resize-observer-browser",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "image_card_styles",
    src = "image_card_component.scss",
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
    ],
)

tf_ng_module(
    name = "image_card",
    srcs = [
        "image_card_component.ts",
        "image_card_container.ts",
        "image_card_module.ts",
    ],
    assets = [
        ":image_card_styles",
        "image_card_component.ng.html",
    ],
    deps = [
        ":run_name",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/angular:expect_angular_material_slider",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views:types",
        "//tensorboard/webapp/metrics/views:utils",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/widgets/text:truncated_path",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "run_name",
    srcs = [
        "run_name_component.ts",
        "run_name_container.ts",
        "run_name_module.ts",
    ],
    deps = [
        ":utils",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "utils",
    srcs = [
        "utils.ts",
    ],
    deps = [
        "//tensorboard/webapp/runs/store:types",
    ],
)

tf_sass_binary(
    name = "scalar_card_styles",
    src = "scalar_card_component.scss",
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
    ],
)

tf_ng_module(
    name = "scalar_card",
    srcs = [
        "scalar_card_component.ts",
        "scalar_card_container.ts",
        "scalar_card_module.ts",
        "scalar_card_types.ts",
    ],
    assets = [
        ":scalar_card_styles",
        "scalar_card_component.ng.html",
    ],
    deps = [
        ":utils",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views:types",
        "//tensorboard/webapp/metrics/views:utils",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/util:value_formatter",
        "//tensorboard/webapp/widgets:resize_detector",
        "//tensorboard/webapp/widgets/line_chart",
        "//tensorboard/webapp/widgets/line_chart_v2",
        "//tensorboard/webapp/widgets/line_chart_v2:line_chart_utils",
        "//tensorboard/webapp/widgets/text:truncated_path",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//@types/resize-observer-browser",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "card_renderer_tests",
    testonly = True,
    srcs = [
        "card_lazy_loader_test.ts",
        "card_view_test.ts",
        "histogram_card_test.ts",
        "image_card_test.ts",
        "run_name_test.ts",
        "scalar_card_test.ts",
        "utils_test.ts",
    ],
    deps = [
        ":card_renderer",
        ":histogram_card",
        ":image_card",
        ":run_name",
        ":scalar_card",
        ":utils",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/angular:expect_angular_material_slider",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/metrics:test_lib",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/runs/store:testing",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/widgets:resize_detector_testing",
        "//tensorboard/webapp/widgets/histogram:types",
        "//tensorboard/webapp/widgets/line_chart",
        "//tensorboard/webapp/widgets/line_chart_v2",
        "//tensorboard/webapp/widgets/text:truncated_path",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//@types/resize-observer-browser",
        "@npm//rxjs",
    ],
)
