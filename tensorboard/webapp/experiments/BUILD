load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "experiments",
    srcs = [
        "experiments_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/experiments/store",
        "//tensorboard/webapp/experiments/store:types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
)
