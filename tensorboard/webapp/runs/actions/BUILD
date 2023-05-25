load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "actions",
    srcs = [
        "index.ts",
        "runs_actions.ts",
    ],
    deps = [
        "//tensorboard/webapp/runs:types",
        "//tensorboard/webapp/runs/data_source",
        "//tensorboard/webapp/types:ui",
        "//tensorboard/webapp/widgets/data_table:types",
        "@npm//@ngrx/store",
    ],
)
