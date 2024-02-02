load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/notification_center:__subpackages__"])

licenses(["notice"])

tf_sass_binary(
    name = "notification_center_styles",
    src = "notification_center_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_ng_module(
    name = "_views",
    srcs = [
        "notification_center_component.ts",
        "notification_center_container.ts",
        "view_types.ts",
        "views_module.ts",
    ],
    assets = [
        ":notification_center_styles",
        "notification_center_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/notification_center/_redux",
        "//tensorboard/webapp/notification_center/_redux:actions",
        "//tensorboard/webapp/notification_center/_redux:types",
        "//tensorboard/webapp/widgets/markdown_renderer",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "_views_test",
    testonly = True,
    srcs = [
        "notification_center_test.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":_views",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/angular:expect_angular_material_snackbar",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/notification_center/_redux",
        "//tensorboard/webapp/notification_center/_redux:actions",
        "//tensorboard/webapp/notification_center/_redux:types",
        "//tensorboard/webapp/testing:mat_icon",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
