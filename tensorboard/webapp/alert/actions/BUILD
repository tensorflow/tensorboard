load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "actions",
    srcs = [
        "index.ts",
    ],
    visibility = [
        "//tensorboard/webapp/alert:__subpackages__",
    ],
    deps = [
        "//tensorboard/webapp/alert:types",
        "@npm//@ngrx/store",
    ],
)
