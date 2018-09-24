package(default_visibility = ["//visibility:public"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "vz_chart_helpers",
    srcs = [
        "vz-chart-helpers.html",
        "vz-chart-helpers.ts",
        "vz-chart-tooltip.html",
        "vz-chart-tooltip.ts",
    ],
    path = "/vz-chart-helpers",
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:plottable",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/vz_sorting",
    ],
)
