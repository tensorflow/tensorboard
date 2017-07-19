package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_paginated_view",
    srcs = ["tf-paginated-view.html"],
    path = "/tf-paginated-view",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
        "@org_polymer_paper_button",
        "@org_polymer_paper_input",
        "@org_polymer_paper_styles",
    ],
)
