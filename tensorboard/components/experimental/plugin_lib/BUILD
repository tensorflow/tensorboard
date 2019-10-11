package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "message",
    srcs = [
        "message.ts",
    ],
)

# TODO(psybuzz): create a NPM package when a better requirement comes up using
# tf_js_binary.
tf_ts_library(
    name = "plugin_lib",
    srcs = [
        "index.ts",
        "plugin-guest.ts",
        "runs.ts",
    ],
    deps = [
        ":message",
    ],
)
