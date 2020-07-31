load("//tensorboard/defs:defs.bzl", "tf_ts_library")
load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "effects",
    srcs = [
        "npmi_effects.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/data_source",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/core/actions",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
