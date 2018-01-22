package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "overview_page",
    srcs = ["overview-page.html"],
    path = "/tf-overview-page",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:plottable",
        "//tensorboard/components/vz_line_chart",
        "@org_polymer_paper_card",
    ],
)
