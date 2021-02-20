load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "notification_center",
    srcs = [
        "_notification_center_module.ts",
        "index.ts",
    ],
    assets = [
        "//tensorboard/webapp/notification_center/_views:notification_center_styles",
        "//tensorboard/webapp/notification_center/_views:html",
    ],
    deps = [
        "//tensorboard/webapp/notification_center/_redux",
        "//tensorboard/webapp/notification_center/_views",
        "//tensorboard/webapp/notification_center/_redux:types",
        "@npm//@angular/core",
        "@npm//@angular/common",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "notification_center_test.ts",
    ],
    deps = [
        ":notification_center",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
