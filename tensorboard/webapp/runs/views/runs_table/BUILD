load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "runs_table_styles",
    src = "runs_table_component.scss",
)

ng_module(
    name = "runs_table",
    srcs = [
        "runs_table_component.ts",
        "runs_table_container.ts",
        "runs_table_module.ts",
        "types.ts",
    ],
    assets = [
        ":runs_table_styles",
        "runs_table_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/runs:types",
        "//tensorboard/webapp/runs/actions",
        "//tensorboard/webapp/runs/data_source",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/types:data",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/widgets/range_input",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_paginator",
        "//tensorboard/webapp/angular:expect_angular_material_progress_spinner",
        "//tensorboard/webapp/angular:expect_angular_material_sort",
        "//tensorboard/webapp/angular:expect_angular_material_table",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//ngx-color-picker",
        "@npm//rxjs",
    ],
)

ng_module(
    name = "runs_table_test",
    testonly = True,
    srcs = [
        "runs_table_test.ts",
    ],
    deps = [
        ":runs_table",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/experiments/store:testing",
        "//tensorboard/webapp/runs:types",
        "//tensorboard/webapp/runs/actions",
        "//tensorboard/webapp/runs/data_source",
        "//tensorboard/webapp/runs/store:testing",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/testing:dom",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/widgets/range_input",
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
        "//tensorboard/webapp/types",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
