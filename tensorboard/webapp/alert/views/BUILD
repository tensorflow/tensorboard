load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "alert_display_snackbar_styles",
    src = "alert_display_snackbar_container.scss",
)

tf_ng_module(
    name = "alert_snackbar",
    srcs = [
        "alert_display_snackbar_container.ts",
        "alert_snackbar_container.ts",
        "alert_snackbar_module.ts",
    ],
    assets = [
        ":alert_display_snackbar_styles",
        "alert_display_snackbar_container.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/alert:types",
        "//tensorboard/webapp/alert/store",
        "//tensorboard/webapp/alert/store:types",
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
