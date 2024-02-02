load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "scalar_column_editor_styles",
    src = "scalar_column_editor_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_ng_module(
    name = "scalar_column_editor",
    srcs = [
        "scalar_column_editor_component.ts",
        "scalar_column_editor_container.ts",
        "scalar_column_editor_module.ts",
    ],
    assets = [
        ":scalar_column_editor_styles",
        "scalar_column_editor_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_tabs",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views/main_view:common_selectors",
        "//tensorboard/webapp/widgets/data_table:data_table_header",
        "//tensorboard/webapp/widgets/data_table:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "scalar_column_editor_test",
    testonly = True,
    srcs = [
        "scalar_column_editor_test.ts",
    ],
    deps = [
        ":scalar_column_editor",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_tabs",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/widgets/data_table:data_table_header",
        "//tensorboard/webapp/widgets/data_table:types",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
