load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "vz_distribution_chart",
    srcs = [
        "vz-distribution-chart.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/polymer:plottable_style",
        "//tensorboard/components/vz_chart_helpers",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
        "@npm//plottable",
    ],
)
