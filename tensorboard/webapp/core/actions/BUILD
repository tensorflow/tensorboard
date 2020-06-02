load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "actions",
    srcs = [
        "core_actions.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/types",
        "@npm//@ngrx/store",
    ],
)
