load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

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
    deps = [
        ":type",
        "//tensorboard/components/tf_feature_flags",
        "//tensorboard/components/vz_sorting",
        "//tensorboard/webapp/feature_flag/http:const",
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
