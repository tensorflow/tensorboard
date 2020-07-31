load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_storage",
    srcs = [
        "index.ts",
        "listeners.ts",
        "storage.ts",
        "tf-storage-polymer.ts",
    ],
    strict_checks = False,
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components_polymer3/tf_globals",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)
