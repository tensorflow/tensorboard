load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "effects",
    srcs = [
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/alert:alert_action",
        "//tensorboard/webapp/alert/actions",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
