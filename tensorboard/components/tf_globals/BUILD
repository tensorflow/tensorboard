load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_globals",
    srcs = [
        "globals-polymer.ts",
    ],
    deps = [
        ":tf_globals_lib",
        "//tensorboard/webapp/angular_polymer_bridge",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)

tf_ts_library(
    name = "tf_globals_lib",
    srcs = [
        "globals.ts",
    ],
)
