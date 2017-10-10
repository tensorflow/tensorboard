package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_line_chart_data_loader",
    srcs = [
        "tf-line-chart-data-loader.html",
    ],
    path = "/tf-line-chart-data-loader",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/vz_line_chart",
        "@org_polymer_paper_spinner",
    ],
)
