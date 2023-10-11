load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "_views",
    srcs = [
        "polymer_interop_container.ts",
        "settings_button_component.ts",
        "settings_button_container.ts",
        "settings_dialog_component.ts",
        "settings_dialog_container.ts",
        "settings_module.ts",
    ],
    assets = [
        "settings_dialog_component.css",
        "settings_dialog_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:tb_polymer_interop_types",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/settings/_redux",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "polymer_interop_test.ts",
        "settings_test.ts",
    ],
    deps = [
        ":_views",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_input",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_dynamic_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/settings:testing",
        "//tensorboard/webapp/settings/_redux",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
