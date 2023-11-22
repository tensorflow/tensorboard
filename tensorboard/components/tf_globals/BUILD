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
        "//tensorboard/webapp:tb_polymer_interop_types",
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
