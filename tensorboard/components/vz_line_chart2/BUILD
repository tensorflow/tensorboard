load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "vz_line_chart2",
    srcs = [
        "line-chart.ts",
        "line-chart-exporter.ts",
        "linear-scale.ts",
        "log-scale.ts",
        "panZoomDragLayer.ts",
        "tf-scale.ts",
        "vz-line-chart2.ts",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/vz_chart_helpers",
        "//tensorboard/components/vz_line_chart:dragZoomInteraction",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
        "@npm//plottable",
    ],
)
