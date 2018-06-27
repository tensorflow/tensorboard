package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "mv_line_chart",
    srcs = [
            "mv-line-chart.html",
            "mv-line-chart.ts",
           ],
    path = "/memory-viewer",
    deps = [
        "//tensorboard/components/tf_imports:plottable",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:d3",
    ],
)

