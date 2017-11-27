package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "input_pipeline_analyzer",
    srcs = ["input-pipeline-analyzer.html"],
    path = "/tf-input-pipeline",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:plottable",
        "//tensorboard/components/vz_line_chart",
    ],
)
