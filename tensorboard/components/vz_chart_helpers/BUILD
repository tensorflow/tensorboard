load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "vz_chart_helpers",
    srcs = [
        "plottable-interactions.ts",
        "vz-chart-helpers.ts",
        "vz-chart-tooltip.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:legacy_element_mixin",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
        "@npm//plottable",
    ],
)
