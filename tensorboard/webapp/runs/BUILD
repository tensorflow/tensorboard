load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "runs",
    srcs = [
        "runs_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/alert:alert_action",
        "//tensorboard/webapp/hparams",
        "//tensorboard/webapp/runs/actions",
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
