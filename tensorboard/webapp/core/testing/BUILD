package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_ts_library")

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = ["index.ts"],
    deps = [
        "//tensorboard/components/tf_ng_tensorboard/core",
        "//tensorboard/components/tf_ng_tensorboard/types",
    ],
)
