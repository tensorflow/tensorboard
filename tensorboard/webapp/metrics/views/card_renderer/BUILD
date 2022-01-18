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
        "//tensorboard/webapp/util:dom",
        "//tensorboard/webapp/widgets/intersection_observer",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "data_download_dialog_styles",
    src = "data_download_dialog_component.scss",
)

tf_ng_module(
    name = "data_download_dialog",
    srcs = [
        "data_download_dialog_component.ts",
        "data_download_dialog_container.ts",
        "data_download_module.ts",
    ],
    assets = [
        ":data_download_dialog_styles",
        "data_download_dialog_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/angular:expect_angular_material_select",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/data_source:types",
        "//tensorboard/webapp/runs:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/forms",
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
        ":utils",
        ":vis_selected_time_clipped",
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
        "//tensorboard/webapp/widgets/histogram",
        "//tensorboard/webapp/widgets/histogram:types",
        "//tensorboard/webapp/widgets/text:truncated_path",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "image_card_styles",
    src = "image_card_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
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
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "run_name_styles",
    src = "run_name_component.scss",
)

tf_ng_module(
    name = "run_name",
    srcs = [
        "run_name_component.ts",
        "run_name_container.ts",
        "run_name_module.ts",
    ],
    assets = [
        ":run_name_styles",
    ],
    deps = [
        ":utils",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/experiments:types",
        "//tensorboard/webapp/widgets/experiment_alias",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "vis_selected_time_clipped_styles",
    src = "vis_selected_time_clipped_component.scss",
    deps = ["//tensorboard/webapp:angular_material_sass_deps"],
)

tf_ng_module(
    name = "vis_selected_time_clipped",
    srcs = [
        "vis_selected_time_clipped_component.ts",
        "vis_selected_time_clipped_module.ts",
    ],
    assets = [
        ":vis_selected_time_clipped_styles",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/metrics:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "scalar_card_types",
    srcs = [
        "scalar_card_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/experiments:types",
        "//tensorboard/webapp/widgets/line_chart_v2",
    ],
)

tf_ts_library(
    name = "utils",
    srcs = [
        "utils.ts",
    ],
    deps = [
        ":scalar_card_types",
        "//tensorboard/webapp/experiments:types",
        "//tensorboard/webapp/metrics:types",
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
    ],
    assets = [
        ":scalar_card_styles",
        "scalar_card_component.ng.html",
    ],
    deps = [
        ":data_download_dialog",
        ":scalar_card_types",
        ":utils",
        ":vis_selected_time_clipped",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/experiments:types",
        "//tensorboard/webapp/feature_flag/store",
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
        "//tensorboard/webapp/widgets/experiment_alias",
        "//tensorboard/webapp/widgets/intersection_observer",
        "//tensorboard/webapp/widgets/line_chart_v2",
        "//tensorboard/webapp/widgets/line_chart_v2:line_chart_utils",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:formatter",
        "//tensorboard/webapp/widgets/linked_time_fob",
        "//tensorboard/webapp/widgets/text:truncated_path",
        "@npm//@angular/common",
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
        "data_download_dialog_test.ts",
        "histogram_card_test.ts",
        "image_card_test.ts",
        "run_name_test.ts",
        "scalar_card_test.ts",
        "utils_test.ts",
    ],
    deps = [
        ":card_renderer",
        ":data_download_dialog",
        ":histogram_card",
        ":image_card",
        ":run_name",
        ":scalar_card",
        ":scalar_card_types",
        ":utils",
        ":vis_selected_time_clipped",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/angular:expect_angular_material_select",
        "//tensorboard/webapp/angular:expect_angular_material_slider",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/experiments:types",
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
        "//tensorboard/webapp/util:dom",
        "//tensorboard/webapp/widgets:resize_detector_testing",
        "//tensorboard/webapp/widgets/experiment_alias",
        "//tensorboard/webapp/widgets/histogram:types",
        "//tensorboard/webapp/widgets/intersection_observer:intersection_observer_testing",
        "//tensorboard/webapp/widgets/line_chart_v2",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:formatter",
        "//tensorboard/webapp/widgets/linked_time_fob",
        "//tensorboard/webapp/widgets/text:truncated_path",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//@types/resize-observer-browser",
        "@npm//rxjs",
    ],
)
