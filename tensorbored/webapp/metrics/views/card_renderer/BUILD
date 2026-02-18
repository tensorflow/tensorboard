load("//tensorbored/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorbored:internal"])

tf_sass_binary(
    name = "card_view_styles",
    src = "card_view_container.scss",
    deps = ["//tensorbored/webapp/theme"],
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
        ":superimposed_card",
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp:selectors",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/actions",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/types:ui",
        "//tensorbored/webapp/util:dom",
        "//tensorbored/webapp/widgets/intersection_observer",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "data_download_dialog_styles",
    src = "data_download_dialog_component.scss",
    deps = ["//tensorbored/webapp/theme"],
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
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp:selectors",
        "//tensorbored/webapp/angular:expect_angular_material_button",
        "//tensorbored/webapp/angular:expect_angular_material_dialog",
        "//tensorbored/webapp/angular:expect_angular_material_input",
        "//tensorbored/webapp/angular:expect_angular_material_select",
        "//tensorbored/webapp/feature_flag/directives",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/metrics/data_source:types",
        "//tensorbored/webapp/runs:types",
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
        "//tensorbored/webapp/metrics/views:metrics_common_styles",
        "//tensorbored/webapp/theme",
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
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp:selectors",
        "//tensorbored/webapp/angular:expect_angular_cdk_drag_drop",
        "//tensorbored/webapp/angular:expect_angular_material_button",
        "//tensorbored/webapp/angular:expect_angular_material_icon",
        "//tensorbored/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/actions",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/metrics/store",
        "//tensorbored/webapp/metrics/views:types",
        "//tensorbored/webapp/metrics/views:utils",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/types:ui",
        "//tensorbored/webapp/util:types",
        "//tensorbored/webapp/widgets/card_fob:types",
        "//tensorbored/webapp/widgets/histogram",
        "//tensorbored/webapp/widgets/histogram:types",
        "//tensorbored/webapp/widgets/text:truncated_path",
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
        "//tensorbored/webapp:angular_material_sass_deps",
        "//tensorbored/webapp/metrics/views:metrics_common_styles",
        "//tensorbored/webapp/theme",
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
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp/angular:expect_angular_cdk_drag_drop",
        "//tensorbored/webapp/angular:expect_angular_material_button",
        "//tensorbored/webapp/angular:expect_angular_material_icon",
        "//tensorbored/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorbored/webapp/angular:expect_angular_material_slider",
        "//tensorbored/webapp/feature_flag/directives",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/actions",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/metrics/store",
        "//tensorbored/webapp/metrics/views:types",
        "//tensorbored/webapp/metrics/views:utils",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/types:ui",
        "//tensorbored/webapp/util:types",
        "//tensorbored/webapp/widgets/text:truncated_path",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "run_name_styles",
    src = "run_name_component.scss",
    deps = ["//tensorbored/webapp/theme"],
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
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp:selectors",
        "//tensorbored/webapp/experiments:types",
        "//tensorbored/webapp/widgets/experiment_alias",
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
        "//tensorbored/webapp:angular_material_sass_deps",
        "//tensorbored/webapp/theme",
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
        "//tensorbored/webapp/angular:expect_angular_material_icon",
        "//tensorbored/webapp/metrics:types",
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
        "//tensorbored/webapp/experiments:types",
        "//tensorbored/webapp/widgets/data_table:types",
        "//tensorbored/webapp/widgets/line_chart_v2",
    ],
)

tf_ts_library(
    name = "utils",
    srcs = [
        "utils.ts",
    ],
    deps = [
        ":scalar_card_types",
        "//tensorbored/webapp/experiments:types",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/runs/store:types",
    ],
)

tf_sass_binary(
    name = "scalar_card_styles",
    src = "scalar_card_component.scss",
    deps = [
        "//tensorbored/webapp:angular_material_sass_deps",
        "//tensorbored/webapp/metrics/views:metrics_common_styles",
        "//tensorbored/webapp/theme",
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
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/runs:types",
        "//tensorbored/webapp/util:memoize",
        "//tensorbored/webapp/widgets/card_fob:types",
        "//tensorbored/webapp/widgets/data_table",
        "//tensorbored/webapp/widgets/data_table:types",
        "//tensorbored/webapp/widgets/line_chart_v2/sub_view",
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
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp:selectors",
        "//tensorbored/webapp/angular:expect_angular_cdk_drag_drop",
        "//tensorbored/webapp/angular:expect_angular_cdk_overlay",
        "//tensorbored/webapp/angular:expect_angular_material_button",
        "//tensorbored/webapp/angular:expect_angular_material_dialog",
        "//tensorbored/webapp/angular:expect_angular_material_icon",
        "//tensorbored/webapp/angular:expect_angular_material_menu",
        "//tensorbored/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorbored/webapp/experiments:types",
        "//tensorbored/webapp/feature_flag/store",
        "//tensorbored/webapp/hparams",
        "//tensorbored/webapp/hparams:types",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/actions",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/metrics/store",
        "//tensorbored/webapp/metrics/views:types",
        "//tensorbored/webapp/metrics/views:utils",
        "//tensorbored/webapp/metrics/views/main_view:common_selectors",
        "//tensorbored/webapp/runs:types",
        "//tensorbored/webapp/runs/store:types",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/types:ui",
        "//tensorbored/webapp/util:types",
        "//tensorbored/webapp/util:value_formatter",
        "//tensorbored/webapp/widgets:persist_resize",
        "//tensorbored/webapp/widgets:resize_detector",
        "//tensorbored/webapp/widgets/card_fob",
        "//tensorbored/webapp/widgets/card_fob:types",
        "//tensorbored/webapp/widgets/data_table:types",
        "//tensorbored/webapp/widgets/experiment_alias",
        "//tensorbored/webapp/widgets/intersection_observer",
        "//tensorbored/webapp/widgets/line_chart_v2",
        "//tensorbored/webapp/widgets/line_chart_v2:line_chart_utils",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:formatter",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorbored/webapp/widgets/line_chart_v2/sub_view",
        "//tensorbored/webapp/widgets/text:truncated_path",
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
    deps = ["//tensorbored/webapp/theme"],
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
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp:selectors",
        "//tensorbored/webapp/feature_flag/store",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/actions",
        "//tensorbored/webapp/metrics/store",
        "//tensorbored/webapp/metrics/views:types",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/widgets/card_fob",
        "//tensorbored/webapp/widgets/card_fob:types",
        "//tensorbored/webapp/widgets/line_chart_v2",
        "//tensorbored/webapp/widgets/line_chart_v2:line_chart_utils",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:formatter",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorbored/webapp/widgets/line_chart_v2/sub_view",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "superimposed_card_styles",
    src = "superimposed_card_component.scss",
    deps = [
        "//tensorbored/webapp/metrics/views:metrics_common_styles",
        "//tensorbored/webapp/theme",
    ],
)

tf_ng_module(
    name = "superimposed_card",
    srcs = [
        "superimposed_card_component.ts",
        "superimposed_card_container.ts",
        "superimposed_card_module.ts",
    ],
    assets = [
        ":superimposed_card_styles",
        "superimposed_card_component.ng.html",
    ],
    deps = [
        ":scalar_card_data_table",
        ":scalar_card_line_chart",
        ":scalar_card_types",
        ":utils",
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp:selectors",
        "//tensorbored/webapp/angular:expect_angular_cdk_drag_drop",
        "//tensorbored/webapp/angular:expect_angular_material_button",
        "//tensorbored/webapp/angular:expect_angular_material_icon",
        "//tensorbored/webapp/angular:expect_angular_material_menu",
        "//tensorbored/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorbored/webapp/experiments:types",
        "//tensorbored/webapp/feature_flag/store",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/actions",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/metrics/store",
        "//tensorbored/webapp/metrics/views/main_view:common_selectors",
        "//tensorbored/webapp/runs:types",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/types:ui",
        "//tensorbored/webapp/widgets:persist_resize",
        "//tensorbored/webapp/widgets/card_fob:types",
        "//tensorbored/webapp/widgets/data_table:types",
        "//tensorbored/webapp/widgets/experiment_alias",
        "//tensorbored/webapp/widgets/intersection_observer",
        "//tensorbored/webapp/widgets/line_chart_v2",
        "//tensorbored/webapp/widgets/line_chart_v2:line_chart_utils",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:formatter",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorbored/webapp/widgets/text:truncated_path",
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
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp:selectors",
        "//tensorbored/webapp/angular:expect_angular_cdk_overlay",
        "//tensorbored/webapp/angular:expect_angular_core_testing",
        "//tensorbored/webapp/angular:expect_angular_material_button",
        "//tensorbored/webapp/angular:expect_angular_material_dialog",
        "//tensorbored/webapp/angular:expect_angular_material_input",
        "//tensorbored/webapp/angular:expect_angular_material_menu",
        "//tensorbored/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorbored/webapp/angular:expect_angular_material_select",
        "//tensorbored/webapp/angular:expect_angular_material_slider",
        "//tensorbored/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorbored/webapp/angular:expect_ngrx_store_testing",
        "//tensorbored/webapp/experiments:types",
        "//tensorbored/webapp/hparams/_redux:hparams_actions",
        "//tensorbored/webapp/hparams/_redux:hparams_selectors",
        "//tensorbored/webapp/hparams/_redux:types",
        "//tensorbored/webapp/metrics:test_lib",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/actions",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/metrics/store",
        "//tensorbored/webapp/metrics/store:types",
        "//tensorbored/webapp/metrics/views/main_view:common_selectors",
        "//tensorbored/webapp/runs/store:selectors",
        "//tensorbored/webapp/runs/store:testing",
        "//tensorbored/webapp/runs/store:types",
        "//tensorbored/webapp/testing:mat_icon",
        "//tensorbored/webapp/testing:utils",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/types:ui",
        "//tensorbored/webapp/util:dom",
        "//tensorbored/webapp/widgets:resize_detector_testing",
        "//tensorbored/webapp/widgets/card_fob",
        "//tensorbored/webapp/widgets/card_fob:types",
        "//tensorbored/webapp/widgets/data_table",
        "//tensorbored/webapp/widgets/data_table:types",
        "//tensorbored/webapp/widgets/experiment_alias",
        "//tensorbored/webapp/widgets/histogram:types",
        "//tensorbored/webapp/widgets/intersection_observer:intersection_observer_testing",
        "//tensorbored/webapp/widgets/line_chart_v2",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:formatter",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:public_types",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:scale",
        "//tensorbored/webapp/widgets/text:truncated_path",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//@types/resize-observer-browser",
        "@npm//rxjs",
    ],
)
