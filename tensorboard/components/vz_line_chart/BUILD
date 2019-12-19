load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "vz_line_chart",
    srcs = [
        "vz-line-chart.ts",
    ],
    deps = [
        ":dragZoomInteraction",
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

tf_ts_library(
    name = "dragZoomInteraction",
    srcs = [
        "dragZoomInteraction.ts",
    ],
    deps = [
        "@npm//@types/d3",
        "@npm//d3",
        "@npm//plottable",
    ],
)
