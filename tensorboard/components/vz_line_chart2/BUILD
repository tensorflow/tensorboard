load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "dragZoomInteraction",
    srcs = [
        "dragZoomInteraction.ts",
    ],
    strict_checks = False,
    deps = [
        "@npm//@types/d3",
        "@npm//d3",
        "@npm//plottable",
    ],
)

tf_ts_library(
    name = "vz_line_chart2",
    srcs = [
        "line-chart.ts",
        "line-chart-exporter.ts",
        "linear-scale.ts",
        "log-scale.ts",
        "panZoomDragLayer.html.ts",
        "panZoomDragLayer.ts",
        "tf-scale.ts",
        "vz-line-chart2.ts",
    ],
    strict_checks = False,
    deps = [
        ":dragZoomInteraction",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/polymer:plottable_style",
        "//tensorboard/components/polymer:register_style_dom_module",
        "//tensorboard/components/vz_chart_helpers",
        "//tensorboard/webapp/widgets/line_chart_v2/lib:scale",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
        "@npm//plottable",
    ],
)
