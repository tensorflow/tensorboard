load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "alert_snackbar",
    srcs = [
        "alert_snackbar_container.ts",
        "alert_snackbar_module.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/alert/store",
        "//tensorboard/webapp/angular:expect_angular_material_snackbar",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "views_test",
    testonly = True,
    srcs = [
        "alert_snackbar_test.ts",
    ],
    deps = [
        ":alert_snackbar",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/alert/store",
        "//tensorboard/webapp/alert/store:testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_snackbar",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
