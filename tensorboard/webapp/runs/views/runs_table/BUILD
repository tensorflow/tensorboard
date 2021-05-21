load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "runs_table_styles",
    src = "runs_table_component.scss",
)

tf_sass_binary(
    name = "runs_group_menu_button_styles",
    src = "runs_group_menu_button_component.scss",
)

tf_ng_module(
    name = "runs_table",
    srcs = [
        "runs_group_menu_button_component.ts",
        "runs_group_menu_button_container.ts",
        "runs_table_component.ts",
        "runs_table_container.ts",
        "runs_table_module.ts",
        "types.ts",
    ],
    assets = [
        ":runs_group_menu_button_styles",
        ":runs_table_styles",
        "runs_table_component.ng.html",
        "runs_group_menu_button.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/alert",
        "//tensorboard/webapp/alert/actions",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_paginator",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/angular:expect_angular_material_sort",
        "//tensorboard/webapp/angular:expect_angular_material_table",
        "//tensorboard/webapp/hparams",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/runs:types",
        "//tensorboard/webapp/runs/actions",
        "//tensorboard/webapp/runs/data_source",
        "//tensorboard/webapp/runs/store:selectors",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/widgets/filter_input",
        "//tensorboard/webapp/widgets/range_input",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//ngx-color-picker",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "runs_table_test",
    testonly = True,
    srcs = [
        "runs_table_test.ts",
    ],
    deps = [
        ":runs_table",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/alert/actions",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_paginator",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/angular:expect_angular_material_sort",
        "//tensorboard/webapp/angular:expect_angular_material_table",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/experiments/store:testing",
        "//tensorboard/webapp/hparams",
        "//tensorboard/webapp/hparams:testing",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/runs:types",
        "//tensorboard/webapp/runs/actions",
        "//tensorboard/webapp/runs/data_source",
        "//tensorboard/webapp/runs/store:testing",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/testing:dom",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/widgets/filter_input",
        "//tensorboard/webapp/widgets/range_input",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
