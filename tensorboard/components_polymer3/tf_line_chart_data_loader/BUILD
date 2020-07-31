load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_line_chart_data_loader",
    srcs = [
        "tf-line-chart-data-loader.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/components_polymer3/tf_color_scale",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/components_polymer3/vz_chart_helpers",
        "//tensorboard/components_polymer3/vz_line_chart2",
        "@npm//@polymer/decorators",
        "@npm//@polymer/paper-spinner",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
        "@npm//plottable",
    ],
)
