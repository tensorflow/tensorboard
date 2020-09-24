load("//tensorboard/defs:defs.bzl", "tf_ts_library")
load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

ng_module(
    name = "runs",
    srcs = [
        "runs_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/runs/data_source",
        "//tensorboard/webapp/runs/effects",
        "//tensorboard/webapp/runs/store",
        "//tensorboard/webapp/runs/store:types",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = ["//tensorboard/webapp/runs/data_source"],
)
