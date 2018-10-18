package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_line_chart_data_loader",
    srcs = [
        "tf-line-chart-data-loader.html",
    ],
    path = "/tf-line-chart-data-loader",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/vz_line_chart2",
        "@org_polymer_paper_spinner",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_line_chart_data_loader"],
    visibility = ["//visibility:public"],
    destdir = "tf-line-chart-data-loader",
    deps = [
        "//tensorboard/components/tf_backend:legacy",
        "//tensorboard/components/tf_color_scale:legacy",
        "//tensorboard/components/tf_imports_google:lib",
        "//tensorboard/components/vz_line_chart2:legacy",
        "//third_party/javascript/polymer/v1/paper-spinner:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)
