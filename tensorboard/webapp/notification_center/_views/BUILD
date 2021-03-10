load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/notification_center:__subpackages__"])

licenses(["notice"])

tf_sass_binary(
    name = "notification_center_styles",
    src = "notification_center_component.scss",
)

tf_ng_module(
    name = "_views",
    srcs = [
        "notification_center_component.ts",
        "notification_center_container.ts",
        "notification_notes.ts",
        "view_types.ts",
        "views_module.ts",
    ],
    assets = [
        ":notification_center_styles",
        "notification_center_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_menu",
        "//tensorboard/webapp/notification_center/_redux:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
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
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_snackbar",
        "@npm//@angular/common",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
        "@npm//rxjs",
        "//tensorboard/webapp/testing:mat_icon",
    ],
)
