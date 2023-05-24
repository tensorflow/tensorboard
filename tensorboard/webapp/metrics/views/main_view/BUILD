load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "main_view_styles",
    src = "main_view_component.scss",
    strict_deps = False,
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "filter_input_component_styles",
    src = "filter_input_component.scss",
    strict_deps = False,
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "filtered_view_component_styles",
    src = "filtered_view_component.scss",
    strict_deps = False,
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "pinned_view_component_styles",
    src = "pinned_view_component.scss",
    strict_deps = False,
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "card_grid_component_styles",
    src = "card_grid_component.scss",
    strict_deps = False,
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "card_groups_component_styles",
    src = "card_groups_component.scss",
    strict_deps = False,
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "card_group_toolbar_component_styles",
    src = "card_group_toolbar_component.scss",
    strict_deps = False,
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
        "//tensorboard/webapp/theme",
    ],
)

tf_ts_library(
    name = "common_selectors",
    srcs = ["common_selectors.ts"],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/hparams/_redux:hparams_selectors",
        "//tensorboard/webapp/metrics:utils",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views:types",
        "//tensorboard/webapp/metrics/views:utils",
        "//tensorboard/webapp/metrics/views/card_renderer:scalar_card_types",
        "//tensorboard/webapp/runs:types",
        "//tensorboard/webapp/runs/views/runs_table:types",
        "//tensorboard/webapp/util:matcher",
        "//tensorboard/webapp/util:memoize",
        "//tensorboard/webapp/util:types",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "main_view",
    srcs = [
        "card_grid_component.ts",
        "card_grid_container.ts",
        "card_group_toolbar_component.ts",
        "card_group_toolbar_container.ts",
        "card_groups_component.ts",
        "card_groups_container.ts",
        "empty_tag_match_message_component.ts",
        "empty_tag_match_message_container.ts",
        "filter_input_component.ts",
        "filter_input_container.ts",
        "filtered_view_component.ts",
        "filtered_view_container.ts",
        "main_view_component.ts",
        "main_view_container.ts",
        "main_view_module.ts",
        "pinned_view_component.ts",
        "pinned_view_container.ts",
    ],
    assets = [
        "card_grid_component.ng.html",
        "filter_input_component.ng.html",
        "main_view_component.ng.html",
        ":card_grid_component_styles",
        ":card_group_toolbar_component_styles",
        ":card_groups_component_styles",
        ":filter_input_component_styles",
        ":filtered_view_component_styles",
        ":main_view_styles",
        ":pinned_view_component_styles",
    ],
    deps = [
        ":common_selectors",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_cdk_scrolling",
        "//tensorboard/webapp/angular:expect_angular_material_autocomplete",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_button_toggle",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/customization",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics:utils",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/store:types",
        "//tensorboard/webapp/metrics/views:types",
        "//tensorboard/webapp/metrics/views:utils",
        "//tensorboard/webapp/metrics/views/card_renderer",
        "//tensorboard/webapp/metrics/views/right_pane",
        "//tensorboard/webapp/metrics/views/right_pane/scalar_column_editor",
        "//tensorboard/webapp/settings",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/util:string",
        "//tensorboard/webapp/util:types",
        "//tensorboard/webapp/widgets/filter_input",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "main_view_tests",
    testonly = True,
    srcs = [
        "card_grid_test.ts",
        "common_selectors_test.ts",
        "filter_input_test.ts",
        "main_view_test.ts",
    ],
    deps = [
        ":common_selectors",
        ":main_view",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_cdk_scrolling",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_autocomplete",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing",
        "//tensorboard/webapp/app_routing:testing",
        "//tensorboard/webapp/app_routing/store:testing",
        "//tensorboard/webapp/customization",
        "//tensorboard/webapp/experiments/store:testing",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/hparams/_redux:testing",
        "//tensorboard/webapp/metrics:test_lib",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views:types",
        "//tensorboard/webapp/metrics/views/card_renderer",
        "//tensorboard/webapp/metrics/views/card_renderer:scalar_card_types",
        "//tensorboard/webapp/runs/store:selectors",
        "//tensorboard/webapp/runs/store:testing",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/runs/views/runs_table:types",
        "//tensorboard/webapp/settings",
        "//tensorboard/webapp/testing:dom",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/testing:material",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/widgets/filter_input",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
