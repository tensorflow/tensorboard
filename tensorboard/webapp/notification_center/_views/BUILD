load("//tensorboard/defs:defs.bzl", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/notification_center:__subpackages__"])

licenses(["notice"])

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
        "notification_center_component.ts",
        "notification_center_container.ts",
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
