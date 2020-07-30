load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_globals",
    srcs = [
        "globals.ts",
        "globals-polymer.ts",
    ],
    deps = [
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
