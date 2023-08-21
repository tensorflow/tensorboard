load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "alert",
    srcs = [
        "alert_module.ts",
    ],
    deps = [
        ":alert_action",
        "//tensorboard/webapp/alert/effects",
        "//tensorboard/webapp/alert/store",
        "//tensorboard/webapp/alert/store:types",
        "//tensorboard/webapp/alert/views:alert_snackbar",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "alert_action",
    srcs = [
        "alert_action_module.ts",
    ],
    deps = [
        ":types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = [
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "alert_action_test.ts",
    ],
    deps = [
        ":alert_action",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/alert/actions",
        "//tensorboard/webapp/alert/effects",
        "//tensorboard/webapp/alert/store",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
