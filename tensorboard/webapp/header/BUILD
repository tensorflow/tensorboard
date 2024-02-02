load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "plugin_selector_styles",
    src = "plugin_selector_component.scss",
    deps = ["//tensorboard/webapp/theme"],
)

tf_sass_binary(
    name = "header_styles",
    src = "header_component.scss",
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "header",
    srcs = [
        "dark_mode_toggle_component.ts",
        "dark_mode_toggle_container.ts",
        "header_component.ts",
        "header_module.ts",
        "plugin_selector_component.ts",
        "plugin_selector_container.ts",
        "reload_container.ts",
        "types.ts",
    ],
    assets = [
        ":plugin_selector_styles",
        ":header_styles",
        "plugin_selector_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_select",
        "//tensorboard/webapp/angular:expect_angular_material_tabs",
        "//tensorboard/webapp/angular:expect_angular_material_toolbar",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/feature_flag/actions",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/feature_flag/store:types",
        "//tensorboard/webapp/settings",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "dark_mode_toggle_test.ts",
        "header_test.ts",
    ],
    deps = [
        ":header",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_select",
        "//tensorboard/webapp/angular:expect_angular_material_tabs",
        "//tensorboard/webapp/angular:expect_angular_material_toolbar",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/feature_flag/actions",
        "//tensorboard/webapp/settings",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
