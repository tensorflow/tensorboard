package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "plugin_host",
    srcs = [
        "index.ts",
        "plugin-host-ipc.ts",
        "runs-host-impl.ts",
    ],
    deps = [
        ":message",
        "//tensorboard/components/tf_backend",
    ],
)

tf_ts_library(
    name = "message",
    srcs = [
        "message.ts",
    ],
)
