load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "card_view_styles",
    src = "card_view_container.scss",
    deps = ["//tensorboard/webapp/theme"],
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
    deps = ["//tensorboard/webapp/theme"],
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
        "//tensorboard/webapp/feature_flag/directives",
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
        "//tensorboard/webapp/theme",
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
        ":vis_linked_time_selection_warning",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views:types",
        "//tensorboard/webapp/metrics/views:utils",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/widgets/card_fob:types",
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
        "//tensorboard/webapp/theme",
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
        ":utils",
        ":vis_linked_time_selection_warning",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/angular:expect_angular_material_slider",
        "//tensorboard/webapp/feature_flag/directives",
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
    deps = ["//tensorboard/webapp/theme"],
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
    name = "vis_linked_time_selection_warning_styles",
    src = "vis_linked_time_selection_warning_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_ng_module(
    name = "vis_linked_time_selection_warning",
    srcs = [
        "vis_linked_time_selection_warning_component.ts",
        "vis_linked_time_selection_warning_module.ts",
    ],
    assets = [
        ":vis_linked_time_selection_warning_styles",
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
        "//tensorboard/webapp/widgets/data_table:types",
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
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "scalar_card_fob_controller_styles",
    src = "scalar_card_fob_controller.scss",
)

tf_sass_binary(
    name = "scalar_card_data_table_styles",
    src = "scalar_card_data_table.scss",
)

tf_ng_module(
    name = "scalar_card_data_table",
    srcs = [
        "scalar_card_data_table.ts",
        "scalar_card_data_table_module.ts",
    ],
    assets = [
        ":scalar_card_data_table_styles",
        "scalar_card_data_table.ng.html",
    ],
    deps = [
        ":scalar_card_types",
        ":utils",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/runs:types",
        "//tensorboard/webapp/util:memoize",
        "//tensorboard/webapp/widgets/card_fob:types",
        "//tensorboard/webapp/widgets/data_table",
        "//tensorboard/webapp/widgets/data_table:types",
        "//tensorboard/webapp/widgets/line_chart_v2/sub_view",
        "@npm//@angular/common",
        "@npm//@angular/core",
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
        ":scalar_card_data_table",
        ":scalar_card_line_chart",
        ":scalar_card_types",
        ":utils",
        ":vis_linked_time_selection_warning",
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
        "//tensorboard/webapp/hparams",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views:types",
        "//tensorboard/webapp/metrics/views:utils",
        "//tensorboard/webapp/metrics/views/main_view:common_selectors",
        "//tensorboard/webapp/runs:types",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/util:value_formatter",
        "//tensorboard/webapp/widgets:resize_detector",
        "//tensorboard/webapp/widgets/card_fob",
        "//tensorboard/webapp/widgets/card_fob:types",
        "//tensorboard/webapp/widgets/data_table:types",
        "//tensorboard/webapp/widgets/experiment_alias",
        "//tensorboard/webapp/widgets/intersection_observer",
        "//tensorboard/webapp/widgets/line_chart_v2",
        "//tensorboard/webapp/widgets/line_chart_v2:line_chart_utils",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:formatter",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorboard/webapp/widgets/line_chart_v2/sub_view",
        "//tensorboard/webapp/widgets/text:truncated_path",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//@types/resize-observer-browser",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "scalar_card_line_chart_styles",
    src = "scalar_card_line_chart_component.scss",
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "scalar_card_line_chart",
    srcs = [
        "scalar_card_fob_controller.ts",
        "scalar_card_line_chart_component.ts",
        "scalar_card_line_chart_container.ts",
        "scalar_card_line_chart_module.ts",
    ],
    assets = [
        ":scalar_card_line_chart_styles",
        ":scalar_card_fob_controller_styles",
        "scalar_card_line_chart_component.ng.html",
    ],
    deps = [
        ":scalar_card_types",
        ":utils",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views:types",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/widgets/card_fob",
        "//tensorboard/webapp/widgets/card_fob:types",
        "//tensorboard/webapp/widgets/line_chart_v2",
        "//tensorboard/webapp/widgets/line_chart_v2:line_chart_utils",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:formatter",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorboard/webapp/widgets/line_chart_v2/sub_view",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
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
        "scalar_card_fob_test.ts",
        "scalar_card_line_chart_test.ts",
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
        ":scalar_card_data_table",
        ":scalar_card_line_chart",
        ":scalar_card_types",
        ":utils",
        ":vis_linked_time_selection_warning",
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
        "//tensorboard/webapp/hparams/_redux:hparams_actions",
        "//tensorboard/webapp/hparams/_redux:hparams_selectors",
        "//tensorboard/webapp/hparams/_redux:types",
        "//tensorboard/webapp/metrics:test_lib",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/store:types",
        "//tensorboard/webapp/metrics/views/main_view:common_selectors",
        "//tensorboard/webapp/runs/store:selectors",
        "//tensorboard/webapp/runs/store:testing",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/util:dom",
        "//tensorboard/webapp/widgets:resize_detector_testing",
        "//tensorboard/webapp/widgets/card_fob",
        "//tensorboard/webapp/widgets/card_fob:types",
        "//tensorboard/webapp/widgets/data_table",
        "//tensorboard/webapp/widgets/data_table:types",
        "//tensorboard/webapp/widgets/experiment_alias",
        "//tensorboard/webapp/widgets/histogram:types",
        "//tensorboard/webapp/widgets/intersection_observer:intersection_observer_testing",
        "//tensorboard/webapp/widgets/line_chart_v2",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:formatter",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:scale",
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
