package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_ts_library")

tf_ts_library(
    name = "actions",
    srcs = [
        "core_actions.ts",
        "index.ts"
    ],
    deps = [
        "//tensorboard/webapp/types",
        "@npm//@ngrx/store",
    ]
)
