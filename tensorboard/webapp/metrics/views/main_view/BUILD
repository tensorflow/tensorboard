load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "main_view_styles",
    src = "main_view_component.scss",
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
    ],
)

tf_sass_binary(
    name = "filter_input_component_styles",
    src = "filter_input_component.scss",
)

tf_sass_binary(
    name = "filtered_view_component_styles",
    src = "filtered_view_component.scss",
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
    ],
)

tf_sass_binary(
    name = "pinned_view_component_styles",
    src = "pinned_view_component.scss",
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
    ],
)

tf_sass_binary(
    name = "card_grid_component_styles",
    src = "card_grid_component.scss",
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
    ],
)

tf_sass_binary(
    name = "card_groups_component_styles",
    src = "card_groups_component.scss",
    deps = [
        "//tensorboard/webapp/metrics/views:metrics_common_styles",
    ],
)

tf_ng_module(
    name = "main_view",
    srcs = [
        "card_grid_component.ts",
        "card_grid_container.ts",
        "card_groups_component.ts",
        "card_groups_container.ts",
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
        ":card_groups_component_styles",
        ":filter_input_component_styles",
        ":filtered_view_component_styles",
        ":main_view_styles",
        ":pinned_view_component_styles",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_material_autocomplete",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/store:types",
        "//tensorboard/webapp/metrics/views:types",
        "//tensorboard/webapp/metrics/views:utils",
        "//tensorboard/webapp/metrics/views/card_renderer",
        "//tensorboard/webapp/metrics/views/right_pane",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/util:string",
        "//tensorboard/webapp/util:types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "main_view_tests",
    testonly = True,
    srcs = [
        "filter_input_test.ts",
        "main_view_test.ts",
    ],
    deps = [
        ":main_view",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_autocomplete",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/metrics:test_lib",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views/card_renderer",
        "//tensorboard/webapp/testing:dom",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/testing:material",
        "//tensorboard/webapp/types:ui",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
