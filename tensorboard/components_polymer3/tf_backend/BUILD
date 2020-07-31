load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_backend",
    srcs = [
        "backend.ts",
        "baseStore.ts",
        "canceller.ts",
        "environmentStore.ts",
        "experimentsStore.ts",
        "requestManager.ts",
        "router.ts",
        "runsStore.ts",
        "tf-backend.ts",
        "tf-backend-polymer.ts",
        "urlPathHelpers.ts",
    ],
    strict_checks = False,
    visibility = ["//visibility:public"],
    deps = [
        ":type",
        "//tensorboard/components_polymer3/vz_sorting",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
        "@npm//plottable",
    ],
)

tf_ts_library(
    name = "type",
    srcs = [
        "type.ts",
    ],
)
