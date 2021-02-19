load("//tensorboard/defs:defs.bzl", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/notification_center:__subpackages__"])

tf_sass_binary(
    name = "notification_center_styles",
    src = "notification_center_component.scss",
)

filegroup(
    name = "html",
    srcs = ["notification_center_component.ng.html"],
)

tf_ts_library(
    name = "_views",
    srcs = [
        "notification_center_container.ts",
        "notification_center_component.ts",
        "view_types.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_snackbar",
        "//tensorboard/webapp/util:string",
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
        "alert_snackbar_test.ts",
    ],
    deps = [
        ":alert_snackbar",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/alert/store",
        "//tensorboard/webapp/alert/store:testing",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_snackbar",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
