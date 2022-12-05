load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "tbdev_upload",
    srcs = [
        "tbdev_upload_button_component.ts",
        "tbdev_upload_dialog_component.ts",
        "tbdev_upload_dialog_container.ts",
        "tbdev_upload_module.ts",
    ],
    assets = [
        ":tbdev_upload_button_component_css",
        ":tbdev_upload_dialog_component_css",
        "tbdev_upload_button_component.ng.html",
        "tbdev_upload_dialog_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_cdk_clipboard",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core/store",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_sass_binary(
    name = "tbdev_upload_button_component_css",
    src = "tbdev_upload_button_component.scss",
    deps = ["//tensorboard/webapp:angular_material_sass_deps"],
)

tf_sass_binary(
    name = "tbdev_upload_dialog_component_css",
    src = "tbdev_upload_dialog_component.scss",
    deps = ["//tensorboard/webapp:angular_material_sass_deps"],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "tbdev_upload_test.ts",
    ],
    deps = [
        ":tbdev_upload",
        "//tensorboard/webapp/angular:expect_angular_cdk_clipboard",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_dialog",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/testing:mat_icon",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
